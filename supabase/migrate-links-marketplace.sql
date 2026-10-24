-- ============================================================================
-- Ingaustore.id — Migrasi: Banyak Link Marketplace per Produk
--
-- Jalankan di: Supabase Dashboard > SQL Editor > New query > tempel > Run
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
--
-- Format links: array of object  [{ "name": "Shopee", "url": "https://..." }]
-- Kolom `link` lama tetap ada (dipakai fallback untuk produk lama).
-- ============================================================================

alter table public.products
    add column if not exists links jsonb not null default '[]'::jsonb;

comment on column public.products.links is
    'Daftar tautan marketplace: [{"name":"Shopee","url":"https://..."}]';

drop policy if exists "products_tambah_links" on public.products;
-- RLS tetap: tulis hanya admin (policy products_tulis_admin sudah mencakup kolom ini).
