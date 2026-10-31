-- ============================================================================
-- Ingaustore.id — Migrasi: Kode Produk Opsional
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Drop constraint products_code_format (validasi format tidak perlu lagi).
--      Admin boleh menyimpan produk tanpa kode, atau dengan kode apa saja.
-- ============================================================================

alter table public.products
    drop constraint if exists products_code_format;
