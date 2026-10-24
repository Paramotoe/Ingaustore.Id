import { useEffect, useRef } from 'react'

/**
 * useDialog — Ingaustore.id
 *
 * Membuat sebuah modal menjadi dialog yang patuh aksesibilitas:
 *   - menahan fokus di dalam dialog (focus trap) untuk pengguna keyboard
 *   - menutup saat Escape
 *   - memfokuskan kendali pertama saat terbuka
 *   - memulihkan fokus ke pemicu saat ditutup
 *
 * Pakai pada elemen `.modal` (bukan overlay) dengan role="dialog" dan
 * aria-modal="true", lalu beri aria-labelledby yang menunjuk ke judul.
 */

const DIPILIH =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialog(open, onClose, labelId) {
  const ref = useRef(null)
  const pemicu = useRef(null)
  const tutupRef = useRef(onClose)

  useEffect(() => {
    tutupRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    pemicu.current = document.activeElement
    const root = ref.current
    if (!root) return

    const fokusPertama = () => {
      const sasaran =
        root.querySelector('[data-autofocus]') || root.querySelector(DIPILIH)
      if (sasaran) sasaran.focus()
    }
    const tunda = requestAnimationFrame(fokusPertama)

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        tutupRef.current?.()
        return
      }
      if (e.key !== 'Tab') return

      const dapat = Array.from(root.querySelectorAll(DIPILIH))
      if (dapat.length === 0) return

      const pertama = dapat[0]
      const terakhir = dapat[dapat.length - 1]
      const aktif = document.activeElement

      // Fokus bocor ke latar (di luar dialog, mis. ke pandangan) → tarik
      // kembali ke kendali pertama, agar tab tidak meninggalkan dialog.
      if (!root.contains(aktif) || !dapat.includes(aktif)) {
        e.preventDefault()
        pertama.focus()
        return
      }

      if (e.shiftKey && aktif === pertama) {
        e.preventDefault()
        terakhir.focus()
      } else if (!e.shiftKey && aktif === terakhir) {
        e.preventDefault()
        pertama.focus()
      }
    }

    // Dengarkan di dokumen, bukan di root. Pendengar di root tidak akan
    // menerima keydown kalau fokus sudah pindah ke elemen di luar dialog
    // (root tidak pernah mendapat event Tab), sehingga jebakan fokus
    // bocor. Di dokumen, tab selalu tertangkap.
    document.addEventListener('keydown', onKey)

    // Kunci latar supaya pembaca layar tidak membaca konten di balik dialog.
    const pembungkus = root.parentElement?.parentElement
    const latar = pembungkus
      ? Array.from(pembungkus.children).filter((el) => el !== root.parentElement)
      : []
    for (const el of latar) el.inert = true

    return () => {
      cancelAnimationFrame(tunda)
      document.removeEventListener('keydown', onKey)
      for (const el of latar) el.inert = false
      if (pemicu.current && typeof pemicu.current.focus === 'function') {
        pemicu.current.focus()
      }
    }
  }, [open, labelId])

  return ref
}
