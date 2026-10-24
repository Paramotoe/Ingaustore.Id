/**
 * adminGate — Ingaustore.id
 *
 * Pintu masuk pengelola yang sunyi: tanpa tombol, tanpa URL khusus, tanpa
 * gestur bertumpuk. Satu-satunya cara membuka portal ialah menahan logo toko
 * selama 1,2 detik. Logo juga tetap berfungsi normal untuk menggulir ke atas.
 *
 * Urutan aman untuk semua perangkat: pelepasan jari/kursor dihitung SEBELUM
 * status "tertahan" dipasang, sehingga logo tidak pernah terasa macet.
 */

import { supabase } from './supabase'

let tahanan = null
let sudahDipicu = false
let timer = null
let kaitan = null

const DURASI_TAHAN = 1200
const RADIUS = 12

const picu = (onBuka) => {
  if (sudahDipicu) return
  sudahDipicu = true
  onBuka()
}

/**
 * Pasang pendengar pada satu elemen (logo toko).
 * Mengembalikan fungsi untuk melepas pendengar.
 */
export function pasangPintuAdmin(el, onBuka) {
  if (!el) return () => {}
  sudahDipicu = false

  const mulaiTahan = (x, y) => {
    if (tahanan) return
    tahanan = { x, y }
    timer = setTimeout(() => picu(onBuka), DURASI_TAHAN)
  }

  const akhiriTahan = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    tahanan = null
    // Jeda singkat supaya ketukan biasa tidak ikut membuka portal.
    setTimeout(() => { sudahDipicu = false }, 250)
  }

  const jarak = (x, y) => {
    if (!tahanan) return 0
    return Math.hypot(x - tahanan.x, y - tahanan.y)
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    mulaiTahan(e.clientX, e.clientY)
  }
  const onPointerMove = (e) => {
    if (tahanan && jarak(e.clientX, e.clientY) > RADIUS) akhiriTahan()
  }
  const onPointerUp = () => { if (tahanan) akhiriTahan() }
  const onPointerLeave = () => { if (tahanan) akhiriTahan() }

  const onTouchStart = (e) => {
    const s = e.touches[0]
    if (s) mulaiTahan(s.clientX, s.clientY)
  }
  const onTouchMove = (e) => {
    if (!tahanan) return
    const s = e.touches[0]
    if (s && jarak(s.clientX, s.clientY) > RADIUS) akhiriTahan()
  }
  const onTouchEnd = () => { if (tahanan) akhiriTahan() }

  // Dukungan browser lama (Windows lama) yang belum punya pointer events.
  const pakaiPointer = 'PointerEvent' in window
  const onMouseDown = (e) => { if (!pakaiPointer) mulaiTahan(e.clientX, e.clientY) }
  const onMouseMove = (e) => { if (!pakaiPointer && tahanan && jarak(e.clientX, e.clientY) > RADIUS) akhiriTahan() }
  const onMouseUp = () => { if (!pakaiPointer && tahanan) akhiriTahan() }
  const onContextMenu = (e) => { if (tahanan) e.preventDefault() }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointerleave', onPointerLeave)
  el.addEventListener('touchstart', onTouchStart, { passive: true })
  el.addEventListener('touchmove', onTouchMove, { passive: true })
  el.addEventListener('touchend', onTouchEnd)
  el.addEventListener('mousedown', onMouseDown)
  el.addEventListener('mousemove', onMouseMove)
  el.addEventListener('mouseup', onMouseUp)
  el.addEventListener('contextmenu', onContextMenu)

  kaitan = { el, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onTouchStart, onTouchMove, onTouchEnd, onMouseDown, onMouseMove, onMouseUp, onContextMenu }

  return () => {
    if (!kaitan) return
    const k = kaitan
    k.el.removeEventListener('pointerdown', k.onPointerDown)
    k.el.removeEventListener('pointermove', k.onPointerMove)
    k.el.removeEventListener('pointerup', k.onPointerUp)
    k.el.removeEventListener('pointerleave', k.onPointerLeave)
    k.el.removeEventListener('touchstart', k.onTouchStart)
    k.el.removeEventListener('touchmove', k.onTouchMove)
    k.el.removeEventListener('touchend', k.onTouchEnd)
    k.el.removeEventListener('mousedown', k.onMouseDown)
    k.el.removeEventListener('mousemove', k.onMouseMove)
    k.el.removeEventListener('mouseup', k.onMouseUp)
    k.el.removeEventListener('contextmenu', k.onContextMenu)
    if (timer) clearTimeout(timer)
    tahanan = null
    kaitan = null
  }
}

/**
 * Pelacakan percobaan salah, dua lapis.
 * 1. Lokal (localStorage) — cepat, menahan beruntun di perangkat ini.
 * 2. Server (public.sisa_percobaan_masuk) — tahan lintas perangkat.
 */

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
  const { n } = baca()
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
 * Server-side limiter. Migrasi final-hardening menutup sisa_percobaan_masuk()
 * untuk anon (membocorkan sisa percobaan dan mengizinkan banjir tabel), lalu
 * menggantinya dengan boleh_masuk() yang hanya menjawab ya/tidak.
 * Never throws — network failure must not lock the owner out.
 */
export async function bolehMasukServer(email) {
  const alamat = (email || '').trim().toLowerCase()
  if (!alamat) return null
  const { data, error } = await supabase.rpc('boleh_masuk', {
    p_alamat: alamat,
    p_jendela_menit: 10,
    p_batas: 8
  })
  if (error || typeof data !== 'boolean') return null
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
