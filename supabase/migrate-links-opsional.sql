-- ============================================================================
-- Ingaustore.id — Migrasi: Link Marketplace Opsional
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Perubahan:
--   1. Kolom `link` dibuat nullable + constraint format dilepas.
--   2. Admin boleh simpan produk tanpa link marketplace.
-- ============================================================================

alter table public.products
    alter column link drop not null,
    drop constraint if exists products_link_format;
