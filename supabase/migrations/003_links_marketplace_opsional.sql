-- ============================================================================
-- Ingaustore.id — Migrasi: Link Marketplace Opsional
--
-- Link marketplace tidak lagi wajib. Admin bisa menambah/edit produk tanpa
-- mengisi link sama sekali.
--
-- Perubahan:
--   1. Kolom `link` diubah jadi nullable.
--   2. Constraint format URL pada `link` dilepas (validasi sudah ada di app).
-- ============================================================================

alter table public.products
    alter column link drop not null,
    drop constraint if exists products_link_format;
