# SETUP — Ingaustore.id

Panduan lengkap dari repo kosong sampai katalog online. Sekali jalan, sekitar 15 menit. Struktur repo: build dari `react-frontend/`, hasilnya disalin ke root untuk deploy statis Vercel.

## Ringkasan

| Aspek | Sebelum | Sesudah |
| --- | --- | --- |
| Produk | Hanya di browser admin (IndexedDB) | Postgres Supabase, tampil ke semua pengunjung |
| Foto | base64 di browser | Storage + CDN, maksimal 4 foto per produk, dikompres otomatis |
| Login | Hash password di dalam kode, bisa dibobol | Supabase Auth (email + password) |
| Hak tulis | Tidak ada pembatas | Row Level Security: tulis hanya untuk admin terdaftar di `public.admins` |
| Data produk | Kode + link saja | Nama, harga, kategori, kode, link, banyak foto |
| Tampilan | 1 berkas 781 baris | React + Vite + Tailwind, konfigurasi terpisah |
| SEO | Tanpa meta deskripsi | Meta lengkap, Open Graph, Twitter Card, sitemap, robots |
| Performa | Tailwind CDN (JS di browser) | React 19 + Vite, bundle 129 kB gzip |
| PWA | Tidak ada | Manifest, ikon, service worker |
| Statistik | Tidak ada | Jumlah klik "Beli" (per-IP rate limiting) |

## Struktur berkas

```
react-frontend/           Aplikasi React + Vite
  src/
    main.jsx              Titik masuk aplikasi
    App.jsx               Logika utama aplikasi
    components/           Komponen antarmuka
    services/             Autentikasi, sanitasi URL, dialog aksesibilitas
  index.html              Kerangka HTML (meta SEO)
  vite.config.js          Konfigurasi Vite
  public/                 favicon.svg, icons.svg
  dist/                   Hasil build (disalin ke root untuk deploy)

supabase/
  schema.sql              Skema database utama
  migrate-keamanan-admin.sql    Keamanan dasar admin
  migrate-keamanan-lanjut.sql   Penguatan lanjutan
  migrate-final-hardening.sql    Tambalan keamanan final
  migrate-final-2.sql           Tambalan audit lanjutan
  migrate-links-marketplace.sql  Tambalan tautan marketplace

index.html                Shell statis Vercel (hasil build Vite)
assets/                   Berkas hasil build Vite
favicon.svg, icons.svg    Ikon root
src/tailwind.css          Sumber Tailwind (dipakai build terpisah ke assets/css/)
tools/gen-images.js       Skrip pembuat aset gambar
manifest.webmanifest      Metadata PWA
sw.js                     Service worker (saat ini: cache-busting mode)
robots.txt                Arahan crawler
sitemap.xml               Peta situs
vercel.json               Header keamanan + konfigurasi Vercel
```

---

## Langkah 1 — Buat project Supabase

1. Buka <https://supabase.com/dashboard> lalu masuk.
2. **New project**.
3. Isi:
   - **Name**: `ingaustore`
   - **Database Password**: (buat kuat) simpan di tempat aman. Aplikasi tidak memakainya, ini hanya untuk akses database langsung.
   - **Region**: `Southeast Asia (Singapore)`.
4. Tunggu sampai project siap (± 2 menit).

## Langkah 2 — Jalankan skema database

1. Sidebar project > **SQL Editor** > **New query**.
2. Buka `supabase/schema.sql`, salin **seluruh** isinya, tempel ke editor.
3. Klik **Run**. Hasil yang benar: `Success. No rows returned`.
4. Ulangi dengan `supabase/migrate-keamanan-admin.sql`, `supabase/migrate-keamanan-lanjut.sql`, `supabase/migrate-final-hardening.sql`, dan `supabase/migrate-final-2.sql`.

Skema membuat tabel `products`, `settings`, `buy_clicks`, `admins`, `admin_audit_log`, `login_attempts`, mengaktifkan Row Level Security, dan menyiapkan bucket `media` (publik untuk dibaca, hanya admin yang bisa menulis).

## Langkah 3 — Ambil kredensial dan isi konfigurasi

1. Buka **Project Settings** > **API**.
2. Salin:
   - **Project URL** — bentuknya `https://xxxxxxxx.supabase.co`
   - **anon public** / **publishable key** — string panjang berawalan `sb_publishable_...` atau `eyJ...`
3. Buat file `.env` di root project (JANGAN di-commit ke repository):

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxx   # Hanya untuk server (migrations, testing), JANGAN masuk repo
```

4. Untuk build lokal: tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di Vercel Project Settings > Environment Variables (Production).

Kedua nilai `VITE_*` memang untuk publik; batas aksesnya dijaga RLS di database. Yang **tidak boleh** masuk repo adalah **service_role** / **secret** key.

## Langkah 4 — Buat akun admin

1. **Authentication** > **Users** > **Add user** > **Create new user**.
2. Isi email dan password admin.
3. Centang **Auto Confirm User**.
4. **Create user**.
5. **SQL Editor** > **New query** > tempel seluruh isi `supabase/migrate-keamanan-admin.sql` > **Run** (wajib untuk membuat akun admin pertama).

Tahap nomor 5 wajib. Tanpa daftar putih admin, akun Anda tetap bisa login tetapi **tidak bisa menulis** apa pun.

Masuk lewat pintu tersembunyi: **tahan logo toko 1,2 detik** (laptop atau HP). Logo juga tetap berfungsi normal untuk scroll ke atas.

## Langkah 5 — Uji di komputer sendiri

Jalankan build lokal dari folder `react-frontend/`:

```bash
cd react-frontend
npm install
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx npm run dev
```

Lalu:

1. Login admin.
2. Tambah produk: 1–4 foto, nama, harga, kategori, kode, link.
3. Buka jendela **incognito** — produk harus tetap terlihat tanpa login.
4. Coba ubah nama/harga lewat tombol pensil, lalu hapus satu produk.

Kalau produk tampil di incognito, data benar-benar tersimpan di server.

## Langkah 6 — Build & Deploy

Build dari `react-frontend/`:

```bash
cd react-frontend
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx npm run build
cd ..
cp -rf react-frontend/dist/* .
```

Deploy ke Vercel:

```bash
vercel --prod
```

Repo sudah terhubung ke Vercel (`projectName: ingaustore.id`).

---

## Cara memakai panel admin

| Tombol | Fungsi |
| --- | --- |
| **Tambah Produk** | Unggah 1–4 foto (PNG/JPG/WEBP, maks 5 MB per foto), isi nama, harga, kategori, kode, link |
| **Ikon pensil** | Ubah nama, harga, kategori, kode, dan link. Foto tidak diubah di sini |
| **Ikon tempat sampah** | Hapus produk (minta konfirmasi) |
| **Pengaturan** | Ganti logo dan wallpaper toko (admin saja) |
| **Keluar** | Keluar dari sesi admin |

Menambah admin lain: jalankan perintah berikut di SQL Editor Supabase, ganti emailnya sesuai kebutuhan.

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'akun-baru@contoh.com'
on conflict (user_id) do nothing;
```

---

## SEO dan AEO

Sudah terpasang:

- `title`, `description`, `canonical`, Open Graph, dan Twitter Card.
- `robots.txt` dan `sitemap.xml`.

Tidak ada JSON-LD: `script-src` di `vercel.json` tidak punya `'unsafe-inline'` maupun nonce, jadi `<script type="application/ld+json">` inline diblokir browser. Markup terstruktur berbasis script inline sengaja tidak dipasang.

Batasannya: katalog dirender di browser, jadi crawler yang tidak menjalankan JavaScript hanya melihat meta halaman. Untuk hasil SEO maksimal per produk (URL sendiri, markup lengkap), perlu halaman produk terpisah — bisa dikerjakan sebagai tahap lanjutan.

Setelah deploy, daftarkan situs di [Google Search Console](https://search.google.com/search-console) dan kirim `https://ingaustoreid-beta.vercel.app/sitemap.xml`.

## PWA dan mode offline

- Manifest dan ikon sudah ada; pengunjung bisa "Tambahkan ke layar utama".
- Service worker (`sw.js`) saat ini dalam mode cache-busting: membersihkan cache lama saat deploy baru.
- Untuk mengaktifkan offline caching, tambahkan logika caching di `sw.js`.

## Keamanan

- Hak baca katalog publik. Hak tulis hanya untuk akun yang tercatat di `public.admins`. Pemeriksaan memakai fungsi `public.is_admin()` di dalam database, bukan di JavaScript, sehingga tidak bisa dilewati dari browser.
- Pendaftaran publik Supabase tetap aktif, tetapi akun yang mendaftar sendiri tidak punya hak apa pun sampai dimasukkan ke daftar putih. Untuk menutup pendaftaran sama sekali: **Authentication** > **Sign In / Providers** > **Email** > matikan **Sign up**.
- Pembatas laju pada tabel `buy_clicks` (120 baris per menit) mencegah statistik dibanjiri.
- Validasi dua lapis: form dan constraint database (`code` hanya `A-Z0-9-`, `link` wajib `http/https`, harga tidak negatif, maksimal 4 foto).
- URL divalidasi protokolnya di lapisan render dan database, sehingga `javascript:` ditolak.
- Semua teks dirender sebagai teks (`textContent`), bukan HTML, sehingga aman dari injeksi.
- Batas percobaan login: 5 kali salah → jeda 60 detik (di sisi klien), ditambah rate-limit lintas perangkat (server).
- Kebijakan CSP di `vercel.json` harus selalu sinkron dengan `index.html`. Ubah keduanya bersamaan.
- Ganti password admin berkala lewat **Authentication** > **Users**.

## Catatan tentang data lama

Produk yang tersimpan di IndexedDB browser versi sebelumnya **tidak** ikut pindah otomatis. Bila masih perlu diselamatkan, jalankan versi lama di browser yang sama, lalu masukkan ulang.

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| Banner kuning tetap muncul | `VITE_*` tidak diset | Periksa environment variables Vercel, lalu build ulang |
| "Email atau password salah" padahal benar | User belum dikonfirmasi | Authentication > Users > pilih user > **Confirm email** |
| Panel admin tidak muncul setelah berhasil login | Akun belum ada di `public.admins` | Jalankan `supabase/migrate-keamanan-admin.sql` di SQL Editor |
| Peringatan "Akses dikunci sementara" | Rate limit aktif | Tunggu 10 menit, atau bersihkan `login_attempts` di SQL Editor |
| `new row violates row-level security policy` | Belum login, atau policy belum dibuat | Jalankan ulang `supabase/schema.sql` dan migrasi |
| Foto produk tidak muncul (ikon rusak) | Bucket `media` tidak publik | `update storage.buckets set public = true where id = 'media';` |
| `permission denied for table products` | Grant belum terpasang | Jalankan ulang bagian grant di `schema.sql` |
| Statistik menampilkan "belum tersedia" | Tabel `buy_clicks` belum ada | Jalankan ulang `supabase/schema.sql` |
| Perubahan tidak terlihat setelah deploy | Cache service worker | Hard reload (`Ctrl+Shift+R`) |
| Console: `Refused to connect ... supabase.co` | CSP belum memuat domain Supabase | Samakan CSP di `vercel.json` |
| Upload gagal, pesan "maksimal 5 MB" | Berkas terlalu besar | Kompres dulu, atau naikkan limit di kode |
