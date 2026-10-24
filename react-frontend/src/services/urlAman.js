/**
 * urlAman — Ingaustore.id
 *
 * Satu-satunya sumber kebenaran untuk menilai sebuah tautan produk.
 *
 * Masalah yang dicegah: baris produk di database bisa menyimpan skema
 * berbahaya (`javascript:`, `data:`, `vbscript:`). Kalau nilai itu dipakai
 * apa adanya sebagai `href`, pelanggan yang menekan tombol marketplace
 * mengeksekusi skrip di origin toko sendiri. Validasi saat submit saja tidak
 * cukup — baris lama tetap berbahaya saat dirender.
 *
 * Aturan: hanya http dan https yang lolos. Selain itu dibuang (bukan di-escape)
 * supaya tidak ada celah protokol baru di kemudian hari.
 */

export function urlAman(nilai) {
  try {
    const u = new URL(String(nilai).trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''
  } catch {
    return ''
  }
}

/** Normalisasi daftar tautan produk: buang yang berbahaya, beri nama default. */
export function daftarTautan(product) {
  const sumber = Array.isArray(product?.links)
    ? product.links
    : product?.link
      ? [{ name: 'Beli', url: product.link }]
      : []

  return sumber
    .map((l) => ({ name: (l && l.name) || 'Beli', url: urlAman(l && l.url) }))
    .filter((l) => l.url)
}
