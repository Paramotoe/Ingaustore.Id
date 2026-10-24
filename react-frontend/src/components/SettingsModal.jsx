/**
 * SettingsModal — Ingaustore.id
 *
 * Pengaturan toko (logo & wallpaper) untuk admin.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { useDialog } from '../services/useDialog'

export function SettingsModal({ onClose, showToast, onSaved }) {
  const [logoFile, setLogoFile] = useState(null)
  const [bgFile, setBgFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [bgPreview, setBgPreview] = useState('')
  const [saving, setSaving] = useState(false)

  const refDialog = useDialog(true, onClose, 'judul-pengaturan')

  // Pratinjau memakai blob URL. Cabut saat diganti atau saat modal tutup,
  // kalau tidak memori bocor setiap kali admin memilih ulang berkas.
  const blobUrl = useRef([])

  const buatPratinjau = (file) => {
    const url = URL.createObjectURL(file)
    blobUrl.current.push(url)
    return url
  }

  const lepasPratinjau = () => {
    for (const url of blobUrl.current) URL.revokeObjectURL(url)
    blobUrl.current = []
  }

  useEffect(() => lepasPratinjau, [])

  const handleLogo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) {
      showToast('Hanya file JPG, PNG, atau WebP (maks. 5MB).', 'error')
      return
    }
    setLogoFile(f)
    setLogoPreview(buatPratinjau(f))
  }

  const handleBg = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) {
      showToast('Hanya file JPG, PNG, atau WebP (maks. 5MB).', 'error')
      return
    }
    setBgFile(f)
    setBgPreview(buatPratinjau(f))
  }

  const simpan = async (key, file) => {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `branding/${key}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, {
      upsert: true,
      contentType: file.type
    })
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    const { error: dbError } = await supabase.from('settings').upsert({ key, value: data.publicUrl })
    if (dbError) throw new Error(dbError.message)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (logoFile) await simpan('logo', logoFile)
      if (bgFile) await simpan('wallpaper', bgFile)
      onSaved?.()
      onClose()
    } catch (err) {
      showToast('Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => { lepasPratinjau(); onClose() }}>
      <div className="modal" ref={refDialog} role="dialog" aria-modal="true" aria-labelledby="judul-pengaturan" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="judul-pengaturan">Pengaturan Toko</h2>
          <button className="modal-close" onClick={() => { lepasPratinjau(); onClose() }} aria-label="Tutup">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" htmlFor="set-logo">Logo Toko</label>
            <div className="image-upload">
              {logoPreview ? (
                <img className="logo-preview" src={logoPreview} alt="Pratinjau logo" />
              ) : (
                <i className="fa-solid fa-image" aria-hidden="true"></i>
              )}
              <input id="set-logo" className="form-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="set-bg">Wallpaper Toko</label>
            <div className="image-upload">
              {bgPreview ? (
                <img className="bg-preview" src={bgPreview} alt="Pratinjau wallpaper" />
              ) : (
                <i className="fa-solid fa-image" aria-hidden="true"></i>
              )}
              <input id="set-bg" className="form-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleBg} />
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
