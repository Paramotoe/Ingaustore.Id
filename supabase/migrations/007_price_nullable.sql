-- ============================================================================
-- Ingaustore.id — Migrasi: Harga Produk Nullable
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Kolom `price` dibuat nullable (drop not null constraint).
--   2. Admin boleh menyimpan produk tanpa harga.
-- ============================================================================

alter table public.products
    alter column price drop not null;
