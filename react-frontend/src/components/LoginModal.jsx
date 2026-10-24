/**
 * LoginModal — Ingaustore.id
 *
 * Masuk sebagai admin untuk mengelola katalog.
 */

import { useState } from 'react'
import { cekJeda, catatGagal, bersihkan, sisaPercobaanServer, catatPercobaanServer } from '../services/adminGate'

export function LoginModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jeda, setJeda] = useState(() => cekJeda())

  const terkunci = jeda !== null

  const handleSubmit = async (e) => {
    e.preventDefault()
    const sisa = cekJeda()
    if (sisa !== null) {
      setJeda(sisa)
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${sisa} detik.`)
      return
    }

    const emailBersih = email.trim()
    const sisaServer = await sisaPercobaanServer(emailBersih)
    if (sisaServer !== null && sisaServer <= 0) {
      setError('Akses dikunci sementara karena terlalu banyak percobaan salah.')
      return
    }

    setLoading(true)
    setError('')
    const ok = await onSuccess(emailBersih, password)

    await catatPercobaanServer(emailBersih, ok)

    if (!ok) {
      const upaya = catatGagal()
      const sisaBaru = cekJeda()
      if (sisaBaru !== null) {
        setJeda(sisaBaru)
        setError(`Terlalu banyak percobaan salah. Tahan ${sisaBaru} detik sebelum mencoba lagi.`)
      } else {
        setError(`Email atau kata sandi salah. (Percobaan ke-${upaya})`)
      }
    } else {
      bersihkan()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ animation: 'fadeIn 0.2s ease' }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h2>Portal Pengelola</h2>
              <p className="modal-subtitle">Khusus pengelola resmi Ingaustore.id</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Pengelola</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-envelope"></i>
              <input
                id="login-email"
                className="form-input with-icon"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@domain.com"
                autoComplete="email"
                required
                disabled={terkunci}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Kata Sandi</label>
            <div className="input-with-icon">
              <i className="fa-solid fa-lock"></i>
              <input
                id="login-password"
                className="form-input with-icon"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi"
                autoComplete="current-password"
                required
                disabled={terkunci}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error-box" role="alert">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-primary btn-full btn-lg" disabled={loading || terkunci}>
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-arrow-right-to-bracket'}`}></i>
            {loading ? 'Memeriksa...' : terkunci ? `Tahan ${jeda} detik` : 'Masuk'}
          </button>

          <p className="secure-notice">
            <i className="fa-solid fa-lock"></i>
            Koneksi terenkripsi. Hak akses diverifikasi di database.
          </p>
        </form>
      </div>
    </div>
  )
}
