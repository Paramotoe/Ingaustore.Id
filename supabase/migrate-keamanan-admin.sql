    -- ============================================================================
    -- Ingaustore.id — Migrasi keamanan: batasi hak tulis hanya untuk admin
    --
    -- Kenapa perlu:
    --   Supabase Auth mengizinkan pendaftaran publik (Sign up). Tanpa daftar admin,
    --   siapa pun yang mendaftar dan mengonfirmasi emailnya otomatis berperan
    --   "authenticated" dan bisa menulis produk, mengubah tampilan, serta
    --   menghapus foto.
    --
    -- Yang dilakukan berkas ini:
    --   1. Membuat tabel public.admins sebagai daftar putih pengelola toko.
    --   2. Membuat fungsi public.is_admin().
    --   3. Mengganti seluruh kebijakan tulis agar memakai is_admin().
    --   4. Membatasi laju pencatatan klik agar tabel statistik tidak bisa dibanjiri.
    --   5. Mendaftarkan akun bagusselaluceria@gmail.com sebagai admin.
    --
    -- Cara pakai:
    --   Supabase Dashboard > SQL Editor > New query > tempel seluruh isi berkas
    --   > Run. Aman dijalankan lebih dari sekali.
    -- ============================================================================

    -- 1. Daftar putih admin ------------------------------------------------------
    create table if not exists public.admins (
        user_id    uuid primary key references auth.users (id) on delete cascade,
        created_at timestamptz not null default now()
    );

    comment on table public.admins is 'Akun yang berhak mengubah isi katalog.';

    alter table public.admins enable row level security;

    drop policy if exists "admins_baca_sendiri" on public.admins;
    create policy "admins_baca_sendiri"
        on public.admins for select
        to authenticated
        using (user_id = auth.uid());

    grant select on public.admins to authenticated;

    -- 2. Fungsi pemeriksa --------------------------------------------------------
    create or replace function public.is_admin()
    returns boolean
    language sql
    stable
    security definer
    set search_path = public
    as $$
        select exists (select 1 from public.admins where user_id = auth.uid());
    $$;

    revoke all on function public.is_admin() from public;
    grant execute on function public.is_admin() to anon, authenticated;

    -- 3. Kebijakan tulis produk & pengaturan -------------------------------------
    drop policy if exists "products_tulis_admin"  on public.products;
    drop policy if exists "settings_tulis_admin"  on public.settings;
    drop policy if exists "klik_baca_admin"       on public.buy_clicks;
    drop policy if exists "media_tulis_admin"     on storage.objects;

    create policy "products_tulis_admin"
        on public.products for all
        to authenticated
        using (public.is_admin())
        with check (public.is_admin());

    create policy "settings_tulis_admin"
        on public.settings for all
        to authenticated
        using (public.is_admin())
        with check (public.is_admin());

    create policy "klik_baca_admin"
        on public.buy_clicks for select
        to authenticated
        using (public.is_admin());

    create policy "media_tulis_admin"
        on storage.objects for all
        to authenticated
        using (bucket_id = 'media' and public.is_admin())
        with check (bucket_id = 'media' and public.is_admin());

    -- 4. Batas laju pencatatan klik ---------------------------------------------
    -- Tanpa batas, tamu dapat membanjiri tabel buy_clicks.
    create or replace function public.batasi_klik()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    begin
        if (select count(*) from public.buy_clicks where created_at > now() - interval '1 minute') > 300 then
            return null;
        end if;
        return new;
    end;
    $$;

    drop trigger if exists buy_clicks_batas_laju on public.buy_clicks;
    create trigger buy_clicks_batas_laju
        before insert on public.buy_clicks
        for each row execute function public.batasi_klik();

    -- 5. Daftarkan akun admin ----------------------------------------------------
    -- Pastikan email sudah terkonfirmasi, lalu masukkan ke daftar putih.
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
    where email = 'bagusselaluceria@gmail.com'
    and email_confirmed_at is null;

    insert into public.admins (user_id)
    select id from auth.users where email = 'bagusselaluceria@gmail.com'
    on conflict (user_id) do nothing;

    -- Verifikasi: harus menampilkan satu baris (email admin).
    select a.user_id, u.email
    from public.admins a
    join auth.users u on u.id = a.user_id;

    -- ============================================================================
    -- Selesai. Setelah ini, akun lain yang mendaftar tidak lagi bisa menulis.
    -- ============================================================================
