-- ============================================================================
-- Ingaustore.id — Migrasi: Hapus Batas Maksimal Foto
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Drop constraint products_foto_maks (maks 4 foto).
--   2. Admin bisa upload foto sebanyak mungkin.
-- ============================================================================

alter table public.products
    drop constraint if exists products_foto_maks;
