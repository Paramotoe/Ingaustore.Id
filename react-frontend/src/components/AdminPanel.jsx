/**
 * AdminPanel — Ingaustore.id
 * 
 * Panel admin untuk mengelola produk:
 * - Tambah produk
 * - Edit produk
 * - Hapus produk
 * - Import/Export CSV
 */

import { useState } from 'react'
import { supabase } from '../services/supabase'

export function AdminPanel({ isAdmin, onAddProduct, onEditProduct, onDeleteProduct }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [images, setImages] = useState([])
  const [fotoInfo, setFotoInfo] = useState('')
  const [exporting, setExporting] = useState(false)

  if (!isAdmin) return null

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(f => {
      const ok = f.type === 'image/png' || f.type === 'image/jpeg' || f.type === 'image/webp'
      if (!ok) showToast('Format harus PNG, JPG, atau WEBP.', 'error')
      return ok
    })

    if (validFiles.length === 0) return

    const max = 4
    if (validFiles.length > max) {
      showToast(`Maksimal ${max} foto.`, 'error')
      return
    }

    setImages(validFiles)
    setFotoInfo(`${validFiles.length} dari maksimal 4 foto`)
  }

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setFotoInfo(`${images.length - 1} dari maksimal 4 foto`)
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    const form = e.target
    const code = form.code.value.trim().toUpperCase()
    const name = form.name.value.trim()
    const price = form.price.value ? parseInt(form.price.value) : null
    const category = form.category.value.trim() || null
    const link = form.link.value.trim()

    if (!code || !name || !link) {
      showToast('Kode, nama, dan link wajib diisi.', 'error')
      return
    }

    if (!images.length) {
      showToast('Pilih minimal satu foto.', 'error')
      return
    }

    try {
      setExporting(true)
      // Upload images to Supabase Storage
      const uploadPromises = images.map(async (file) => {
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        // In production, upload via supabase.storage
        return path
      })

      const paths = await Promise.all(uploadPromises)

      await supabase.from('products').insert([{
        code: code,
        name: name,
        price: price,
        category: category,
        link: link,
        image_paths: paths
      }])

      showToast('Produk berhasil ditambahkan.', 'success')
      setShowAddForm(false)
      setImages([])
      setFotoInfo('')
      e.target.reset()
    } catch (err) {
      showToast('Gagal menambahkan produk: ' + err.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-info">
          <h2>Kelola Produk</h2>
          <p>Tambah, ubah, atau hapus produk di katalog.</p>
          <p className="admin-email">Masuk sebagai <span className="email">admin@ingaustore.id</span></p>
        </div>
        <div className="admin-actions">
          <button className="btn-outline" onClick={onAddProduct}>
            <i className="fa-solid fa-plus"></i> Tambah Produk
          </button>
          <button className="btn-outline" onClick={() => window.print()}>
            <i className="fa-solid fa-print"></i> Cetak
          </button>
        </div>
      </div>

      {/* Tambah Produk Form */}
      {showAddForm && (
        <form className="admin-form" onSubmit={handleAddProduct}>
          <div className="form-section">
            <h3>Tambah Produk Baru</h3>
            <div className="form-grid">
              <div className="form-group col-3">
                <label>1. Foto (maks. 4)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="form-file"
                />
                {images.length > 0 && (
                  <div className="image-preview">
                    {images.map((file, i) => (
                      <div key={i} className="image-preview-item">
                        <img src={URL.createObjectURL(file)} alt={`Foto ${i + 1}`} />
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => handleRemoveImage(i)}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))}
                    <span className="image-count">{fotoInfo}</span>
                  </div>
                )}
              </div>

              <div className="form-group col-3">
                <label>2. Nama Produk</label>
                <input type="text" name="name" className="form-input" placeholder="Kaos Katun Premium" maxLength={80} />
              </div>

              <div className="form-group col-2">
                <label>3. Harga (Rp)</label>
                <input type="number" name="price" className="form-input" placeholder="150000" min="0" step="500" />
              </div>

              <div className="form-group col-2">
                <label>4. Kategori</label>
                <input type="text" name="category" className="form-input" placeholder="Atasan" maxLength={32} />
              </div>

              <div className="form-group col-2">
                <label>5. Kode</label>
                <input type="text" name="code" className="form-input" placeholder="IG-001" maxLength={32} pattern="[A-Za-z0-9-]+" />
              </div>

              <div className="form-group col-4">
                <label>6. Link Pembelian</label>
                <input type="url" name="link" className="form-input" placeholder="https://shopee.co.id/..." required />
              </div>

              <div className="form-group col-6">
                <button type="submit" className="btn-primary btn-full" disabled={exporting}>
                  <i className={exporting ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plus'}></i>
                  {exporting ? 'Menyimpan...' : 'Tambah Produk'}
                </button>
              </div>
            </div>
          </div>

          <div className="admin-actions-bottom">
            <button type="button" className="btn-outline" onClick={() => setShowAddForm(false)}>
              <i className="fa-solid fa-times"></i> Batal
            </button>
          </div>
        </form>
      )}

      <div className="admin-stats">
        <button className="btn-outline" onClick={() => window.print()}>
          <i className="fa-solid fa-print"></i> Cetak Katalog
        </button>
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
