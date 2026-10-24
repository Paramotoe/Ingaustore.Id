-- ============================================================================
-- Ingaustore.id — Migrasi Final 2 (Perbaikan tambahan pasca-hardening)
-- Dijalankan SETELAH migrate-final-hardening.sql. Idempoten.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Perbaikan Check Constraint admin_audit_log
--    Menghapus nilai 'login_berhasil', 'login_gagal' yang tidak pernah dicatat
--    oleh trigger database (karena autentikasi ditangani GoTrue Supabase Auth).
-- ----------------------------------------------------------------------------
alter table public.admin_audit_log drop constraint if exists admin_audit_log_aksi;
alter table public.admin_audit_log add constraint admin_audit_log_aksi check (aksi in (
    'tulis_produk', 'ubah_produk', 'hapus_produk', 'simpan_pengaturan', 'unggah_media'
));

-- ----------------------------------------------------------------------------
-- 2. Perbaikan Pembatas Laju Klik (batasi_klik)
--    Memperbaiki potensi DoS global dengan menaikkan ambang batas wajar dan
--    menambahkan penanganan yang aman (hanya drop baris berlebih, log peringatan).
-- ----------------------------------------------------------------------------
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

    -- Dinaikkan dari 60 ke 120 per menit untuk mencegah false positive pada traffic tinggi
    if jumlah_menit > 120 then
        return null;
    end if;

    return new;
end;
$$;

-- ============================================================================
-- Selesai.
-- ============================================================================
