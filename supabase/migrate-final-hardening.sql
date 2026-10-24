-- ============================================================================
-- Ingaustore.id — Migrasi Final Hardening (penambalan celah keamanan)
--
-- Dijalankan SETELAH schema.sql, migrate-keamanan-admin.sql, dan
-- migrate-keamanan-lanjut.sql.
-- Supabase Dashboard > SQL Editor > New query > tempel > Run. Idempoten.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. KRITIS — view ringkasan_klik membypass RLS
--    View PostgreSQL berjalan dengan hak milik pemilik view (postgres), jadi
--    kebijakan RLS pada products & buy_clicks DILEWATI. Siapa pun (anon) bisa
--    membaca statistik klik yang seharusnya khusus admin.
--    Perbaikan: paksa view berjalan sebagai pemanggil (security_invoker).
-- ----------------------------------------------------------------------------
create or replace view public.ringkasan_klik
with (security_invoker = true) as
select
    p.id   as product_id,
    p.code as kode,
    p.name as nama,
    count(c.id) as jumlah_klik,
    max(c.created_at) as klik_terakhir
from public.products p
left join public.buy_clicks c on c.product_id = p.id
group by p.id, p.code, p.name;

comment on view public.ringkasan_klik is
    'Statistik klik per produk. security_invoker=true agar RLS admin tetap berlaku.';

-- ----------------------------------------------------------------------------
-- 2. KRITIS — fungsi pembatas laju percobaan masuk bocor ke anon
--    sisa_percobaan_masuk() mengembalikan sisa percobaan persisnya, sehingga
--    penyerang dapat menebak keberadaan email (enumerasi) dan mengisi tabel
--    login_attempts dengan baris palsu (banjir). Perbaikan:
--      * cabut hak anon, hanya authenticated yang boleh memakai;
--      * tambah boleh_masuk() yang hanya mengembalikan ya/tidak;
--      * validasi format alamat pada pencatatan.
-- ----------------------------------------------------------------------------
revoke execute on function public.sisa_percobaan_masuk(text, int, int) from anon;

create or replace function public.boleh_masuk(p_alamat text, p_jendela_menit int default 10, p_batas int default 8)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
    select count(*) < p_batas
    from public.login_attempts
    where alamat = p_alamat
      and berhasil = false
      and dibuat_pada > now() - make_interval(mins => p_jendela_menit)
$$;

revoke all on function public.boleh_masuk(text, int, int) from public;
grant execute on function public.boleh_masuk(text, int, int) to anon, authenticated;

create or replace function public.catat_percobaan_masuk(p_alamat text, p_berhasil boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
    if p_alamat is null or btrim(p_alamat) = '' then
        return;
    end if;
    insert into public.login_attempts (alamat, berhasil)
    values (left(btrim(p_alamat), 254), p_berhasil);
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. KRITIS — is_admin() dan batasi_klik() memakai search_path tak lengkap
--    search_path = public saja berisiko terkena schema poisoning bila ada
--    objek tersamar di schema lain. Selalu sertakan pg_catalog.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
    select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.batasi_klik()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    jumlah_menit int;
begin
    select count(*) into jumlah_menit
    from public.buy_clicks
    where created_at > now() - interval '1 minute';

    if jumlah_menit > 60 then
        return null;  -- lewati baris: statistik tetap hidup, banjir berhenti
    end if;

    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. ADMIN — kunci mutlak tabel admins lewat API klien
--    Tidak ada policy INSERT/UPDATE/DELETE, jadi Supabase menolak total.
--    Cabut grant residual sebagai pengaman berlapis.
-- ----------------------------------------------------------------------------
alter table public.admins enable row level security;
revoke insert, update, delete on public.admins from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. AUDIT — isi jurnal audit yang sebelumnya tak pernah terisi
--    Setiap tulis/ubah/hapus produk dan pengaturan tercatat dengan pelaku.
-- ----------------------------------------------------------------------------
create or replace function public.catat_audit_produk()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    aksi public.admin_audit_log.aksi%type;
    sasaran text;
begin
    if (TG_OP = 'INSERT') then
        aksi := 'tulis_produk';    sasaran := new.code;
    elsif (TG_OP = 'UPDATE') then
        aksi := 'ubah_produk';     sasaran := new.code;
    elsif (TG_OP = 'DELETE') then
        aksi := 'hapus_produk';    sasaran := old.code;
    else
        return null;
    end if;

    insert into public.admin_audit_log (actor_id, aksi, sasaran)
    values (auth.uid(), aksi, sasaran);

    return coalesce(new, old);
end;
$$;

drop trigger if exists produk_audit_trg on public.products;
create trigger produk_audit_trg
    after insert or update or delete on public.products
    for each row execute function public.catat_audit_produk();

create or replace function public.catat_audit_pengaturan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
    insert into public.admin_audit_log (actor_id, aksi, sasaran)
    values (auth.uid(), 'simpan_pengaturan', coalesce(new.key, old.key));

    return coalesce(new, old);
end;
$$;

drop trigger if exists pengaturan_audit_trg on public.settings;
create trigger pengaturan_audit_trg
    after insert or update or delete on public.settings
    for each row execute function public.catat_audit_pengaturan();

-- ----------------------------------------------------------------------------
-- 6. PEMBERSIHAN — pangkas log percobaan masuk yang menua
-- ----------------------------------------------------------------------------
create or replace function public.bersihkan_login_attempts()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
    delete from public.login_attempts where dibuat_pada < now() - interval '1 day';
end;
$$;

revoke all on function public.bersihkan_login_attempts() from public;
grant execute on function public.bersihkan_login_attempts() to service_role;

-- ----------------------------------------------------------------------------
-- 7. LINK PRODUK — tambat skema berbahaya secara eksplisit
-- ----------------------------------------------------------------------------
alter table public.products drop constraint if exists products_link_aman;
alter table public.products add constraint products_link_aman
    check (link is null or link ~* '^https?://[a-zA-Z0-9\-\._~:/\?#\[\]@!$&''()*\+,;=%]+$');

-- ============================================================================
-- Selesai. Ringkasan celah yang ditambal:
--   1. view ringkasan_klik membypass RLS            -> security_invoker
--   2. fungsi pembatas laju bocor ke anon           -> revoke + boleh_masuk
--   3. search_path tak lengkap                      -> + pg_catalog
--   4. admins tak bisa diubah lewat API             -> revoke eksplisit
--   5. audit log tak pernah terisi                  -> trigger audit
--   6. login_attempts tak dibersihkan               -> pembersih harian
--   7. tautan produk longgar                        -> pola URL diperketat
-- ============================================================================
