/**
 * LoginModal — Ingaustore.id
 *
 * Masuk sebagai admin untuk mengelola katalog.
 */

import { useState } from 'react'

export function LoginModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const ok = await onSuccess(email, password)
    if (!ok) {
      setError('Email atau password salah.')
    } else {
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Masuk Admin</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ingaustore.id" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`}></i>
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
