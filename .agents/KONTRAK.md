# KONTRAK KERJA — CI/CD Ingaustore.id

Berkas ini sumber kebenaran bersama. Setiap agen hanya boleh mengubah berkas
di kolom "Pemilik" miliknya. Mengubah berkas milik agen lain = GAGAL.

## Peta kepemilikan (disjoint, tidak boleh tumpang tindih)

| Agen | Pemilik berkas | Dilarang menyentuh |
|------|----------------|--------------------|
| A (hygiene) | `.gitignore`, `assets/**` | `.github/**`, `tools/**`, `react-frontend/**` |
| B (ci) | `.github/workflows/ci.yml` | `.github/workflows/deploy.yml`, `package.json`, `.gitignore`, `assets/**` |
| C (deploy) | `.github/workflows/deploy.yml` | `.github/workflows/ci.yml`, `package.json`, `.gitignore`, `assets/**` |

## Antarmuka yang sudah disepakati (jangan diubah)

**Tidak ada `package.json` di root repo.** Situs ini situs statis
(`index.html` + `assets/**` hasil build). Menaruh `package.json` di root
membuat Vercel menganggap root sebagai proyek Node, sehingga build Vercel
menjalankan `npm run build` tanpa dependensi dan hasilnya kosong (404).
Karena itu semua perintah CI memakai `--prefix react-frontend` langsung.

Alur CI (agen B) wajib menjalankan, berurutan:

1. `npm ci --prefix react-frontend`
2. `npm run lint --prefix react-frontend`
3. `node tools/uji-pintu-admin.js`
4. `npm run build --prefix react-frontend`
5. `test -f react-frontend/dist/index.html`

Gagal di salah satu tahap = job gagal (jangan pakai `continue-on-error`).

Alur Deploy (agen C) wajib menjalankan, berurutan:

1. `npm ci --prefix react-frontend`
2. `npm i -g vercel`
3. `vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}`
4. `vercel deploy --prod --yes --token=${{ secrets.VERCEL_TOKEN }}`
5. Verifikasi lewat API: `vercel inspect <url> --wait --json` → cek
   `readyState == "READY"`, `target == "production"`, lalu `curl` alias produksi.

Jangan pakai `vercel build --prebuilt`: proyek Vercel tidak punya build command,
jadi output-nya kosong dan deployment jadi 404. Situs statis di-deploy langsung.

Butuh 3 GitHub Secret: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
(nilai org/project ada di `.vercel/project.json`).

## Aturan umum

- Node versi: 24 (sesuai `vercel.json` → `nodeVersion`).
- Jangan tambah dependensi baru.
- Jangan jalankan `git`, `npm run build`, `vercel`, atau perintah jaringan.
- Jangan ubah `react-frontend/src/**` (milik agen lain / sudah terverifikasi).
- Bahasa Indonesia untuk komentar dan pesan.
- Tambahkan `ponytail:` comment untuk penyederhanaan yang disengaja.
