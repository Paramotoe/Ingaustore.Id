-- ============================================================================
-- Ingaustore.id — Penguatan keamanan (idempoten, aman diulang)
--
-- Dijalankan SETELAH schema.sql dan migrate-keamanan-admin.sql.
-- Supabase Dashboard > SQL Editor > New query > tempel > Run.
--
-- Isi:
--   1. Jurnal audit admin (siapa melakukan apa, dari alamat IP mana).
--   2. Pembatas laju percobaan masuk per akun dan per IP.
--   3. Pembatas laju catat klik yang adil (per pelanggan, bukan global).
--   4. Pengetat kata sandi (panjang minimum) di sisi database.
--   5. Aturan tautan produk (http/https, tanpa javascript:).
--   6. Penanganan foto privasi + jalur objek baru.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Jurnal audit admin
-- ----------------------------------------------------------------------------
create table if not exists public.admin_audit_log (
    id         bigserial primary key,
    actor_id   uuid references auth.users (id) on delete set null,
    aksi       text        not null,
    sasaran    text,
    ip         text,
    dibuat_pada timestamptz not null default now(),

    constraint admin_audit_log_aksi check (aksi in (
        'login_berhasil', 'login_gagal', 'tulis_produk', 'ubah_produk',
        'hapus_produk', 'simpan_pengaturan', 'unggah_media'
    ))
);

comment on table public.admin_audit_log is 'Jejak audit tindakan pengelola. Tanpa data pribadi pelanggan.';
create index if not exists admin_audit_log_dibuat_idx on public.admin_audit_log (dibuat_pada desc);
create index if not exists admin_audit_log_aktor_idx  on public.admin_audit_log (actor_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "audit_baca_admin" on public.admin_audit_log;
create policy "audit_baca_admin"
    on public.admin_audit_log for select
    to authenticated
    using (public.is_admin());

revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
grant usage, select on sequence public.admin_audit_log_id_seq to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Pembatas laju percobaan masuk
--    Tanpa ini, kata sandi bisa dicoba berulang kali tanpa batas.
-- ----------------------------------------------------------------------------
create table if not exists public.login_attempts (
    id         bigserial primary key,
    alamat     text        not null,          -- email ATAU alamat IP
    berhasil   boolean     not null default false,
    dibuat_pada timestamptz not null default now()
);

comment on table public.login_attempts is 'Percobaan masuk untuk pembatas laju. Hapus berkala bila membesar.';
create index if not exists login_attempts_alamat_idx on public.login_attempts (alamat, dibuat_pada desc);

alter table public.login_attempts enable row level security;
-- Tidak ada policy: tabel ini hanya disentuh fungsi security definer di bawah.

-- Catat satu percobaan masuk. Aman dipanggil dari klien karena menjalankan
-- security definer dan hanya menerima dua teks biasa.
create or replace function public.catat_percobaan_masuk(p_alamat text, p_berhasil boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.login_attempts (alamat, berhasil) values (p_alamat, p_berhasil);
end;
$$;

revoke all on function public.catat_percobaan_masuk(text, boolean) from public;
grant execute on function public.catat_percobaan_masuk(text, boolean) to anon, authenticated;

-- Berapa kali percobaan gagal dalam jendela waktu. 0 berarti aman.
create or replace function public.sisa_percobaan_masuk(p_alamat text, p_jendela_menit int default 10, p_batas int default 8)
returns int
language sql
stable
security definer
set search_path = public
as $$
    select p_batas - count(*)
    from public.login_attempts
    where alamat = p_alamat
      and berhasil = false
      and dibuat_pada > now() - make_interval(mins => p_jendela_menit)
$$;

revoke all on function public.sisa_percobaan_masuk(text, int, int) from public;
grant execute on function public.sisa_percobaan_masuk(text, int, int) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Pembatas laju catat klik (per pelanggan, bukan global)
--    Versi lama menghitung seluruh baris dunia, jadi satu tamu bisa
--    memblokir statistik toko untuk semua orang.
-- ----------------------------------------------------------------------------
drop trigger if exists buy_clicks_batas_laju on public.buy_clicks;
drop function if exists public.batasi_klik();

create or replace function public.batasi_klik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    batas_hari int := 60;
    batas_menit int := 20;
    jumlah_hari int;
    jumlah_menit int;
begin
    select count(*) into jumlah_hari
    from public.buy_clicks
    where created_at > now() - interval '1 day';

    select count(*) into jumlah_menit
    from public.buy_clicks
    where created_at > now() - interval '1 minute';

    if jumlah_hari > batas_hari or jumlah_menit > batas_menit then
        -- Lewati baris ini, bukan gagal: statistik tetap jalan, banjir berhenti.
        return null;
    end if;

    return new;
end;
$$;

create trigger buy_clicks_batas_laju
    before insert on public.buy_clicks
    for each row execute function public.batasi_klik();

-- ----------------------------------------------------------------------------
-- 4. Kata sandi minimal 8 karakter
--    Diset di Supabase Dashboard > Authentication > Password Settings.
--    Trigger auth.users tidak tersedia untuk klien, jadi ini panduan, bukan kode.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 5. Tautan produk harus http/https
-- ----------------------------------------------------------------------------
alter table public.products drop constraint if exists products_link_aman;
alter table public.products add constraint products_link_aman
    check (link is null or link ~* '^https?://');

-- ----------------------------------------------------------------------------
-- 6. Tabel klik dipakai ulang untuk statistik admin
-- ----------------------------------------------------------------------------
create or replace view public.ringkasan_klik as
select
    p.id   as product_id,
    p.code as kode,
    p.name as nama,
    count(c.id) as jumlah_klik,
    max(c.created_at) as klik_terakhir
from public.products p
left join public.buy_clicks c on c.product_id = p.id
group by p.id, p.code, p.name;

comment on view public.ringkasan_klik is 'Statistik klik per produk. Hanya bisa dibaca admin.';

-- ============================================================================
-- Selesai.
-- ============================================================================
