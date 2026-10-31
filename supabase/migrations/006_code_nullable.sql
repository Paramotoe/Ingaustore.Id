-- ============================================================================
-- Ingaustore.id — Migrasi: Kode Produk Nullable
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Kolom `code` dibuat nullable (drop not null constraint).
--   2. Admin boleh menyimpan produk tanpa kode.
-- ============================================================================

alter table public.products
    alter column code drop not null;
