# KONTRAK KERJA — CI/CD Ingaustore.id

Berkas ini sumber kebenaran bersama. Setiap agen hanya boleh mengubah berkas
di kolom "Pemilik" miliknya. Mengubah berkas milik agen lain = GAGAL.

## Peta kepemilikan (disjoint, tidak boleh tumpang tindih)

| Agen | Pemilik berkas | Dilarang menyentuh |
|------|----------------|--------------------|
| A (hygiene) | `.gitignore`, `assets/**`, `package.json` (root) | `.github/**`, `tools/**`, `react-frontend/**` |
| B (ci) | `.github/workflows/ci.yml` | `.github/workflows/deploy.yml`, `package.json`, `.gitignore`, `assets/**` |
| C (deploy) | `.github/workflows/deploy.yml` | `.github/workflows/ci.yml`, `package.json`, `.gitignore`, `assets/**` |

## Antarmuka yang sudah disepakati (jangan diubah)

`package.json` di ROOT repo (dibuat agen A) wajib berisi:

```json
{
  "name": "ingaustore-id",
  "private": true,
  "scripts": {
    "install:ui": "npm ci --prefix react-frontend",
    "lint": "npm --prefix react-frontend run lint",
    "test": "node tools/uji-pintu-admin.js",
    "build": "npm --prefix react-frontend run build",
    "verify": "npm run lint && npm run test && npm run build"
  }
}
```

Alur CI (agen B) wajib menjalankan, berurutan:

1. `npm run install:ui`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

Semua perintah di atas dijalankan dari ROOT repo. Gagal di salah satu tahap =
job gagal (jangan pakai `continue-on-error`).

## Aturan umum

- Node versi: 24 (sesuai `vercel.json` → `nodeVersion`).
- Jangan tambah dependensi baru.
- Jangan jalankan `git`, `npm run build`, `vercel`, atau perintah jaringan.
- Jangan ubah `react-frontend/src/**` (milik agen lain / sudah terverifikasi).
- Bahasa Indonesia untuk komentar dan pesan.
- Tambahkan `ponytail:` comment untuk penyederhanaan yang disengaja.
