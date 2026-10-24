/**
 * Pintu masuk admin — Ingaustore.id
 *
 * Admin tidak punya URL khusus (/admin, /masuk) dan tidak ada pintu gerakan
 * (ketuk logo berkali-kali). Pintunya satu: tombol "Kelola" di header.
 *
 * Dua lapis pembatas laju:
 *   1. Lokal (localStorage) — cepat, menahan percobaan beruntun di perangkat ini.
 *   2. Server (public.sisa_percobaan_masuk) — tahan lintas perangkat/bersih-bersih storage.
 */

import { supabase } from './supabase'

const KUNCI = 'ingau.login.coba'
const MAKS_LOKAL = 5
const JEDA_DETIK = 60

const baca = () => {
  try {
    return JSON.parse(localStorage.getItem(KUNCI)) || { n: 0, pada: 0 }
  } catch {
    return { n: 0, pada: 0 }
  }
}

const tulis = (nilai) => {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(nilai))
  } catch {
    /* penyimpanan penuh — abaikan */
  }
}

/** Null berarti boleh mencoba. Angka berarti sisa jeda dalam detik. */
export function cekJeda() {
  const { n, pada } = baca()
  if (n < MAKS_LOKAL) return null
  const sisa = Math.ceil((pada + JEDA_DETIK * 1000 - Date.now()) / 1000)
  if (sisa <= 0) {
    tulis({ n: 0, pada: 0 })
    return null
  }
  return sisa
}

export function catatGagal() {
  const { n, pada } = baca()
  tulis({ n: n + 1, pada: Date.now() })
  return n + 1
}

export function bersihkan() {
  try {
    localStorage.removeItem(KUNCI)
  } catch {
    /* abaikan */
  }
}

/**
 * Server-side limiter: returns remaining attempts (0 = locked).
 * Never throws — network failure must not lock the owner out.
 */
export async function sisaPercobaanServer(email) {
  const alamat = (email || '').trim().toLowerCase()
  if (!alamat) return null
  const { data, error } = await supabase.rpc('sisa_percobaan_masuk', {
    p_alamat: alamat,
    p_jendela_menit: 10,
    p_batas: 8
  })
  if (error || typeof data !== 'number') return null
  return data
}

export async function catatPercobaanServer(email, berhasil) {
  const alamat = (email || '').trim().toLowerCase()
  if (!alamat) return
  const { error } = await supabase.rpc('catat_percobaan_masuk', {
    p_alamat: alamat,
    p_berhasil: !!berhasil
  })
  if (error) console.warn('[Ingaustore] audit percobaan gagal:', error.message)
}
