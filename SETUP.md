# SETUP — Ingaustore.id

Panduan lengkap dari repo kosong sampai katalog online. Sekali jalan, sekitar 15 menit.

## Ringkasan

| Aspek | Sebelum | Sesudah |
| --- | --- | --- |
| Produk | Hanya di browser admin (IndexedDB) | Postgres Supabase, tampil ke semua pengunjung |
| Foto | base64 di browser | Storage + CDN, maksimal 4 foto per produk, dikompres otomatis |
| Login | Hash password di dalam kode, bisa dibobol | Supabase Auth (email + password) |
| Hak tulis | Tidak ada pembatas | Row Level Security: tulis hanya untuk admin terautentikasi |
| Data produk | Kode + link saja | Nama, harga, kategori, kode, link, banyak foto |
| Tampilan | 1 berkas 781 baris | Markup, CSS, konfigurasi, logika dipisah |
| SEO | Tanpa meta deskripsi | Meta lengkap, Open Graph, Twitter Card, JSON-LD, sitemap, robots |
| Performa | Tailwind CDN (JS di browser) | CSS Tailwind terkompilasi 17 KB |
| PWA | Tidak ada | Manifest, ikon, service worker, bisa dipasang di layar utama |
| Statistik | Tidak ada | Jumlah klik "Beli" 7 hari terakhir |

## Struktur berkas

```
index.html                 markup halaman
manifest.webmanifest       metadata PWA
sw.js                      service worker (cache kerangka + offline)
robots.txt                 arahan crawler
sitemap.xml                peta situs
vercel.json                header keamanan + cache
SETUP.md                   dokumen ini

assets/css/tailwind.css    hasil kompilasi Tailwind (jangan diedit manual)
assets/css/style.css       gaya kustom (token warna, animasi, wallpaper)
assets/js/config.js        kredensial Supabase — Anda isi
assets/js/app.js           seluruh logika aplikasi
assets/img/                ikon PWA dan gambar Open Graph

src/tailwind.css           sumber Tailwind
tailwind.config.js         konfigurasi Tailwind
tools/gen-images.js        pembuat ikon dan gambar OG
supabase/schema.sql        skema database
```

---

## Langkah 1 — Buat project Supabase

1. Buka <https://supabase.com/dashboard> lalu masuk.
2. **New project**.
3. Isi:
   - **Name**: `ingaustore`
   - **Database Password**: (bagusceria) simpan di tempat aman. Aplikasi tidak memakainya, ini hanya untuk akses database langsung.
   - **Region**: `Southeast Asia (Singapore)`.
4. Tunggu sampai project siap (± 2 menit).

## Langkah 2 — Jalankan skema database

1. Sidebar project > **SQL Editor** > **New query**.
2. Buka `supabase/schema.sql`, salin **seluruh** isinya, tempel ke editor.
3. Klik **Run**. Hasil yang benar: `Success. No rows returned`.

Skema membuat tabel `products`, `settings`, `buy_clicks`, mengaktifkan Row Level Security, dan menyiapkan bucket `media` (publik untuk dibaca, hanya admin yang bisa menulis).

## Langkah 3 — Ambil kredensial dan isi konfigurasi

1. Buka **Project Settings** > **API**.
2. Salin:
   - **Project URL** — bentuknya `https://xxxxxxxx.supabase.co`
   - **anon public** / **publishable key** — string panjang berawalan `eyJ...` atau `sb_publishable_...`
3. Isi `assets/js/config.js`:

```js
window.INGAU_CONFIG = {
    supabaseUrl: 'https://xxxxxxxx.supabase.co',
    supabaseAnonKey: 'eyJhbGciOi...'
};
```

Kedua nilai ini memang untuk publik; batas aksesnya dijaga RLS di database. Yang **tidak boleh** masuk repo adalah **service_role** / **secret** key.

## Langkah 4 — Buat akun admin

1. **Authentication** > **Users** > **Add user** > **Create new user**.
2. Isi email dan password admin.
3. Centang **Auto Confirm User**.
4. **Create user**.
5. **SQL Editor** > **New query** > tempel seluruh isi `supabase/migrate-keamanan-admin.sql` > **Run**.

Tahap nomor 5 wajib. Tanpa daftar putih admin, akun Anda tetap bisa login tetapi **tidak bisa menulis** apa pun, dan halaman akan menampilkan peringatan "Konfigurasi keamanan belum lengkap". Migrasi tersebut juga membatasi laju pencatatan klik.

Masuk lewat pintu tersembunyi: ketuk logo 5 kali, tahan logo 1,2 detik, tekan `Ctrl+Shift+A`, atau buka `/#admin`.

## Langkah 5 — Uji di komputer sendiri

Jalankan server statis dari folder project (jangan buka lewat `file://`):

```bash
npx --yes serve .
```

Lalu:

1. Login admin.
2. Tambah produk: 2–4 foto, nama, harga, kategori, kode, link.
3. Buka jendela **incognito** — produk harus tetap terlihat tanpa login.
4. Coba ubah nama/harga lewat tombol pensil, lalu hapus satu produk.

Kalau produk tampil di incognito, data benar-benar tersimpan di server.

## Langkah 6 — Deploy

Repo sudah terhubung ke Vercel (`projectName: ingaustore.id`).

```bash
vercel --prod
```

Tidak ada build step di Vercel. Semua berkas disajikan apa adanya.

---

## Cara memakai panel admin

| Tombol | Fungsi |
| --- | --- |
| **Tambah Produk** | Unggah 1–4 foto (PNG/JPG/WEBP, maks 5 MB per foto), isi nama, harga, kategori, kode, link |
| **Ikon pensil** | Ubah nama, harga, kategori, kode, dan link. Foto tidak diubah di sini |
| **Ikon tempat sampah** | Hapus produk beserta seluruh fotonya dari Storage |
| **Ekspor CSV** | Unduh seluruh produk sebagai `code,name,price,category,link` |
| **Impor CSV** | Tambah atau perbarui produk massal berdasarkan `code`. Baris tanpa foto akan tampil "Tanpa foto" |
| **Atur Tampilan** | Ganti logo dan wallpaper toko, ubah password admin |
| **Statistik** | Jumlah klik "Beli" dalam 7 hari terakhir |

Menambah admin lain: jalankan perintah berikut di SQL Editor Supabase, ganti emailnya sesuai kebutuhan.

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'akun-baru@contoh.com'
on conflict (user_id) do nothing;
```

Catatan CSV:

- Baris pertama wajib berisi nama kolom. Kolom `code` dan `link` wajib ada.
- Pemisah boleh koma atau titik koma, mengikuti Excel Indonesia.
- Harga boleh ditulis `Rp 95.000`; hanya angkanya yang dibaca.
- Impor memakai `code` sebagai kunci: kode yang sudah ada akan diperbarui, bukan diduplikasi.

---

## SEO dan AEO

Sudah terpasang:

- `title`, `description`, `canonical`, Open Graph, dan Twitter Card.
- JSON-LD `Store` statis di `<head>`.
- JSON-LD `ItemList` berisi `Product` yang dibuat setelah katalog dimuat, maksimal 50 produk pertama.
- `robots.txt` dan `sitemap.xml`.

Batasannya: katalog dirender di browser, jadi crawler yang tidak menjalankan JavaScript hanya melihat JSON-LD `Store` dan meta halaman. Untuk hasil SEO maksimal per produk (URL sendiri, markup lengkap, pratinjau saat dibagikan), perlu halaman produk terpisah — bisa dikerjakan sebagai tahap lanjutan.

Setelah deploy, daftarkan situs di [Google Search Console](https://search.google.com/search-console) dan kirim `https://ingaustore.id/sitemap.xml`.

## PWA dan mode offline

- Manifest dan ikon sudah ada; pengunjung bisa "Tambahkan ke layar utama".
- Service worker menyimpan kerangka aplikasi, jadi halaman tetap terbuka saat koneksi putus (data produk tetap butuh jaringan).
- `assets/js/config.js` sengaja tidak di-cache agar perubahan konfigurasi langsung berlaku.
- Setiap kali aset inti berubah, naikkan `VERSI` di `sw.js` supaya cache lama dibuang.

## Bangun ulang CSS Tailwind

Ubah kelas Tailwind di `index.html` atau `assets/js/app.js`, lalu:

```bash
npx --yes tailwindcss@3.4.19 -c tailwind.config.js -i src/tailwind.css -o assets/css/tailwind.css --minify
```

Tanpa langkah ini, kelas baru tidak akan muncul di halaman.

## Keamanan

- Hak baca katalog publik. Hak tulis hanya untuk akun yang tercatat di `public.admins`. Pemeriksaan memakai fungsi `public.is_admin()` di dalam database, bukan di JavaScript, sehingga tidak bisa dilewati dari browser.
- Pendaftaran publik Supabase tetap aktif, tetapi akun yang mendaftar sendiri tidak punya hak apa pun sampai dimasukkan ke daftar putih. Untuk menutup pendaftaran sama sekali: **Authentication** > **Sign In / Providers** > **Email** > matikan **Sign up**.
- Pembatas laju pada tabel `buy_clicks` (300 baris per menit) mencegah statistik dibanjiri.
- Validasi dua lapis: form dan constraint database (`code` hanya `A-Z0-9-`, `link` wajib `http/https`, harga tidak negatif, maksimal 4 foto).
- URL divalidasi protokolnya, sehingga `javascript:` ditolak.
- Semua teks dirender sebagai teks (`textContent`), bukan HTML, sehingga aman dari injeksi.
- Batas percobaan login: 5 kali salah → jeda 60 detik (di sisi klien), ditambah pembatasan bawaan Supabase Auth.
- Kebijakan CSP di `index.html` dan `vercel.json` harus selalu sama. Ubah keduanya bersamaan.
- Ganti password admin berkala lewat **Authentication** > **Users**.

## Catatan tentang data lama

Produk yang tersimpan di IndexedDB browser versi sebelumnya **tidak** ikut pindah otomatis. Bila masih perlu diselamatkan, jalankan versi lama di browser yang sama, lalu masukkan ulang. Bilang saja kalau butuh skrip impor khusus.

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| Banner kuning tetap muncul | `config.js` kosong atau URL tidak berakhiran `.supabase.co` | Periksa isi berkas, muat ulang dengan `Ctrl+F5` |
| "Email atau password salah" padahal benar | User belum dikonfirmasi | Authentication > Users > pilih user > **Confirm email** |
| Panel admin tidak muncul setelah berhasil login | Akun belum ada di `public.admins` | Jalankan `supabase/migrate-keamanan-admin.sql` di SQL Editor |
| Peringatan "Konfigurasi keamanan belum lengkap" | Fungsi `public.is_admin()` belum dibuat | Jalankan `supabase/migrate-keamanan-admin.sql` di SQL Editor |
| `new row violates row-level security policy` | Belum login, atau policy belum dibuat | Jalankan ulang `supabase/schema.sql` |
| Foto produk tidak muncul (ikon rusak) | Bucket `media` tidak publik | `update storage.buckets set public = true where id = 'media';` |
| `permission denied for table products` | Grant belum terpasang | Jalankan ulang bagian grant di `schema.sql` |
| Statistik menampilkan "belum tersedia" | Tabel `buy_clicks` belum ada | Jalankan ulang `supabase/schema.sql` |
| Tampilan berantakan setelah ubah kelas | `tailwind.css` belum dibangun ulang | Jalankan perintah build di atas |
| Perubahan tidak terlihat setelah deploy | Cache service worker | Naikkan `VERSI` di `sw.js`, atau *hard reload* |
| Console: `Refused to connect ... supabase.co` | CSP belum memuat domain Supabase | Samakan CSP di `index.html` dan `vercel.json` |
| Upload gagal, pesan "maksimal 5 MB" | Berkas terlalu besar | Kompres dulu, atau naikkan `MAX_IMG` di `assets/js/app.js` |
