/**
 * SettingsModal — Ingaustore.id
 *
 * Pengaturan toko (logo & wallpaper) untuk admin.
 */

import { useState } from 'react'
import { supabase } from '../services/supabase'

export function SettingsModal({ onClose, showToast }) {
  const [logoFile, setLogoFile] = useState(null)
  const [bgFile, setBgFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [bgPreview, setBgPreview] = useState('')
  const [saving, setSaving] = useState(false)

  const handleLogo = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) {
        showToast('Hanya file JPG, PNG, atau WebP (maks. 5MB).', 'error')
        return
      }
      setLogoFile(f)
      setLogoPreview(URL.createObjectURL(f))
    }
  }

  const handleBg = (e) => {
    const f = e.target.files?.[0]
    if (f) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) {
        showToast('Hanya file JPG, PNG, atau WebP (maks. 5MB).', 'error')
        return
      }
      setBgFile(f)
      setBgPreview(URL.createObjectURL(f))
    }
  }

  const simpan = async (key, file) => {
    const path = `branding/${key}-${Date.now()}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    await supabase.from('settings').upsert({ key, value: data.publicUrl })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (logoFile) await simpan('logo', logoFile)
      if (bgFile) await simpan('wallpaper', bgFile)
      showToast('Tampilan tersimpan.', 'success')
      onClose()
    } catch (err) {
      showToast('Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Pengaturan Toko</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Logo Toko</label>
            <div className="image-upload">
              {logoPreview ? (
                <img className="logo-preview" src={logoPreview} alt="Logo" />
              ) : (
                <i className="fa-solid fa-image"></i>
              )}
              <input className="form-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Wallpaper Toko</label>
            <div className="image-upload">
              {bgPreview ? (
                <img className="bg-preview" src={bgPreview} alt="Wallpaper" />
              ) : (
                <i className="fa-solid fa-image"></i>
              )}
              <input className="form-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBg} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>Batal</button>
          </div>
        </form>
      </div>
    </div>
  )
}
