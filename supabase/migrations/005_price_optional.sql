-- ============================================================================
-- Ingaustore.id — Migrasi: Harga Produk Opsional
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Kolom `price` dibuat nullable (sudah null, tapi pastikan tidak ada
--      constraint `NOT NULL` tersembunyi).
--   2. Drop check constraint harga minimum tidak perlu diubah karena sudah
--      allow NULL.
-- ============================================================================

alter table public.products
    alter column price drop not null;
