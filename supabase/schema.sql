-- ============================================================================
-- Ingaustore.id — Skema database Supabase
--
-- Cara pakai:
--   Supabase Dashboard > SQL Editor > New query > tempel seluruh isi berkas
--   ini > Run.
--
-- Sifat: idempoten. Aman dijalankan lebih dari sekali.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Produk
-- ----------------------------------------------------------------------------
create table if not exists public.products (
    id          uuid primary key default gen_random_uuid(),
    code        text        not null unique,
    name        text        not null,
    price       numeric(12,2),
    category    text,
    link        text        not null,
    image_paths text[]      not null default '{}',
    created_at  timestamptz not null default now(),

    constraint products_code_format  check (code ~ '^[A-Z0-9-]{1,32}$'),
    constraint products_link_format  check (link ~* '^https?://'),
    constraint products_name_length  check (char_length(name) between 1 and 80),
    constraint products_category_len check (category is null or char_length(category) <= 32),
    constraint products_price_positif check (price is null or price >= 0),
    constraint products_foto_maks    check (coalesce(array_length(image_paths, 1), 0) <= 4)
);

comment on table  public.products             is 'Katalog produk yang tampil di halaman publik.';
comment on column public.products.code        is 'Kode produk, unik, huruf besar.';
comment on column public.products.price       is 'Harga dalam rupiah. NULL berarti belum ditentukan.';
comment on column public.products.image_paths is 'Daftar path objek pada bucket media, urutan pertama menjadi foto utama.';

create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_category_idx   on public.products (category);

-- ----------------------------------------------------------------------------
-- 2. Pengaturan tampilan (logo, wallpaper)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
    key        text primary key,
    value      text        not null,
    updated_at timestamptz not null default now()
);

comment on table  public.settings       is 'Pengaturan tampilan toko.';
comment on column public.settings.value is 'Path objek pada bucket media.';

-- ----------------------------------------------------------------------------
-- 3. Catatan klik tombol "Beli"
-- ----------------------------------------------------------------------------
create table if not exists public.buy_clicks (
    id         bigserial primary key,
    product_id uuid references public.products (id) on delete set null,
    created_at timestamptz not null default now()
);

comment on table public.buy_clicks is 'Statistik klik tombol Beli. Tanpa data pribadi.';

create index if not exists buy_clicks_created_at_idx on public.buy_clicks (created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security
--    Baca katalog: siapa saja. Tulis & baca statistik: hanya admin terautentikasi.
-- ----------------------------------------------------------------------------
alter table public.products   enable row level security;
alter table public.settings   enable row level security;
alter table public.buy_clicks enable row level security;

drop policy if exists "products_baca_publik"   on public.products;
drop policy if exists "products_tulis_admin"   on public.products;
drop policy if exists "settings_baca_publik"   on public.settings;
drop policy if exists "settings_tulis_admin"   on public.settings;
drop policy if exists "klik_catat_publik"      on public.buy_clicks;
drop policy if exists "klik_baca_admin"        on public.buy_clicks;

create policy "products_baca_publik"
    on public.products for select
    to anon, authenticated
    using (true);

create policy "products_tulis_admin"
    on public.products for all
    to authenticated
    using (true)
    with check (true);

create policy "settings_baca_publik"
    on public.settings for select
    to anon, authenticated
    using (true);

create policy "settings_tulis_admin"
    on public.settings for all
    to authenticated
    using (true)
    with check (true);

create policy "klik_catat_publik"
    on public.buy_clicks for insert
    to anon, authenticated
    with check (true);

create policy "klik_baca_admin"
    on public.buy_clicks for select
    to authenticated
    using (true);

grant select on public.products to anon, authenticated;
grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.settings to authenticated;
grant insert on public.buy_clicks to anon, authenticated;
grant select on public.buy_clicks to authenticated;
grant usage, select on sequence public.buy_clicks_id_seq to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Penyimpanan berkas (foto produk, logo, wallpaper)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media_baca_publik" on storage.objects;
drop policy if exists "media_tulis_admin" on storage.objects;

create policy "media_baca_publik"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'media');

create policy "media_tulis_admin"
    on storage.objects for all
    to authenticated
    using (bucket_id = 'media')
    with check (bucket_id = 'media');

-- ============================================================================
-- Selesai. Lanjutkan ke Langkah 4 di SETUP.md (membuat akun admin).
-- ============================================================================
