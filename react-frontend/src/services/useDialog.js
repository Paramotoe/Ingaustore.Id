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

      const dapat = root.querySelectorAll(DIPILIH)
      if (dapat.length === 0) return

      const pertama = dapat[0]
      const terakhir = dapat[dapat.length - 1]

      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault()
        terakhir.focus()
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault()
        pertama.focus()
      }
    }

    root.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(tunda)
      root.removeEventListener('keydown', onKey)
      if (pemicu.current && typeof pemicu.current.focus === 'function') {
        pemicu.current.focus()
      }
    }
  }, [open, labelId])

  return ref
}
