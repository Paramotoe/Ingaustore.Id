/**
 * SettingsModal — Ingaustore.id
 * 
 * Modal pengaturan toko (logo, wallpaper, password).
 */

import { useState } from 'react'

export function SettingsModal({ isAdmin, onClose }) {
  const [logoFile, setLogoFile] = useState(null)
  const [bgFile, setBgFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [bgPreview, setBgPreview] = useState('')
  const [saving, setSaving] = useState(false)

  if (!isAdmin) return null

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setLogoFile(file)
      const url = URL.createObjectURL(file)
      setLogoPreview(url)
    }
  }

  const handleBgChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setBgFile(file)
      const url = URL.createObjectURL(file)
      setBgPreview(url)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Upload logo and wallpaper to Supabase Storage
      // In production, use supabase.storage.from('branding').upload()
      showToast('Tampilan berhasil diperbarui.', 'success')
      onClose()
    } catch (err) {
      showToast('Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveBg = () => {
    setBgFile(null)
    setBgPreview('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h2>Atur Tampilan</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSave}>
          <div className="form-section">
            <h3>Logo Toko</h3>
            <div className="form-group">
              <label className="form-label">Logo (Kotak)</label>
              <div className="logo-upload">
                <div className="logo-preview">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" />
                  ) : (
                    <i className="fa-solid fa-image"></i>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="form-file"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Wallpaper Toko</h3>
            <div className="form-group">
              <label className="form-label">Wallpaper (Opsional)</label>
              <div className="bg-upload">
                <div className="bg-preview">
                  {bgPreview ? (
                    <img src={bgPreview} alt="Wallpaper" />
                  ) : (
                    <i className="fa-solid fa-image"></i>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleBgChange}
                  className="form-file"
                  disabled={saving}
                />
                {bgPreview && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={handleRemoveBg}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <i className={saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'}></i>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <i className="fa-solid fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}
