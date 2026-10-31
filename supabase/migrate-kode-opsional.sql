-- ============================================================================
-- Ingaustore.id — Migrasi: Kode Produk Opsional
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Kolom `code` dibuat nullable.
--   2. Constraint format kode dilepas/diadaptasi agar NULL diperbolehkan.
--   3. Admin boleh simpan produk tanpa kode.
-- ============================================================================
alter table public.products
    alter column code drop not null,
    drop constraint if exists products_code_format;

alter table public.products
    add constraint products_code_format
    check (code is null or code ~ '^[A-Z0-9-]{1,32}$');