/**
 * ProductModal — Ingaustore.id
 *
 * Form tambah/ubah produk:
 * - nama, kode, harga, kategori
 * - beberapa link marketplace (tombol + untuk menambah)
 * - foto dengan pratinjau sebelum disimpan
 */

import { useState } from 'react'
import { supabase } from '../services/supabase'

const KOSONG = { name: '', url: '' }

export function ProductModal({ product, onClose, onSaved, showToast }) {
  const isEdit = !!product

  const [name, setName] = useState(product?.name || '')
  const [code, setCode] = useState(product?.code || '')
  const [price, setPrice] = useState(product?.price ?? '')
  const [category, setCategory] = useState(product?.category || '')
  const [links, setLinks] = useState(() => {
    if (Array.isArray(product?.links) && product.links.length) {
      return product.links.filter((l) => l && l.url)
    }
    if (product?.link) return [{ name: 'Beli', url: product.link }]
    return []
  })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  const setLink = (i, key, value) => {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)))
  }

  const addLink = () => setLinks((prev) => [...prev, { ...KOSONG }])

  const removeLink = (i) => setLinks((prev) => prev.filter((_, idx) => idx !== i))

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...picked].slice(0, 4))
  }

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))

  const uploadFiles = async () => {
    const hasil = []
    for (const file of files) {
      const ekstensi = file.name.split('.').pop().toLowerCase() || 'jpg'
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ekstensi}`

      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
      if (error) throw error

      const { data } = supabase.storage.from('media').getPublicUrl(path)
      hasil.push(data.publicUrl)
    }
    return hasil
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim() || !code.trim()) {
      showToast('Nama dan kode wajib diisi.', 'error')
      return
    }
    if (links.length === 0) {
      showToast('Tambahkan minimal satu link marketplace.', 'error')
      return
    }
    if (links.some((l) => !l.url.trim())) {
      showToast('Semua link harus diisi.', 'error')
      return
    }

    setSaving(true)
    try {
      const gambarBaru = await uploadFiles()
      const image_paths = [...(product?.image_paths || []), ...gambarBaru].slice(0, 4)
      const linkPertama = links[0].url

      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        price: price === '' ? null : parseInt(price, 10),
        category: category.trim() || null,
        link: linkPertama,
        links: links.map((l) => ({ name: l.name.trim() || 'Beli', url: l.url.trim() })),
        image_paths,
      }

      const kirim = async (data) =>
        isEdit
          ? await supabase.from('products').update(data).eq('id', product.id)
          : await supabase.from('products').insert([data])

      let { error } = await kirim(payload)

      // Fallback: sebelum migrasi links dijalankan, kolom `links` belum ada.
      if (error && /links|column/i.test(error.message)) {
        const { links, ...tanpaLinks } = payload
        const coba = await kirim(tanpaLinks)
        error = coba.error
      }

      if (error) throw error

      showToast(isEdit ? 'Produk diperbarui.' : 'Produk ditambahkan.', 'success')
      onSaved()
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
          <h2>{isEdit ? 'Ubah Produk' : 'Tambah Produk'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nama Produk</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Kaos Katun Premium" maxLength={80} />
            </div>
            <div className="form-group">
              <label className="form-label">Kode</label>
              <input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="IG-001" maxLength={32} pattern="[A-Za-z0-9-]+" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Harga (Rp)</label>
              <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" min="0" step="500" />
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <input className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Atasan" maxLength={32} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link Marketplace</label>
            <div className="link-list">
              {links.map((l, i) => (
                <div key={i} className="link-row">
                  <input
                    className="form-input link-name"
                    value={l.name}
                    onChange={(e) => setLink(i, 'name', e.target.value)}
                    placeholder="Shopee"
                  />
                  <input
                    className="form-input link-url"
                    value={l.url}
                    onChange={(e) => setLink(i, 'url', e.target.value)}
                    placeholder="https://shopee.co.id/..."
                  />
                  <button type="button" className="btn-remove" onClick={() => removeLink(i)} aria-label="Hapus link">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-outline btn-sm add-link" onClick={addLink}>
              <i className="fa-solid fa-plus"></i> Tambah Link
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Foto Produk (maks. 4)</label>
            <input className="form-file" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFiles} />
            {files.length > 0 && (
              <div className="image-preview">
                {files.map((file, i) => (
                  <div key={i} className="image-preview-item">
                    <img src={URL.createObjectURL(file)} alt={`Foto ${i + 1}`} />
                    <button type="button" className="btn-remove" onClick={() => removeFile(i)} aria-label="Hapus foto">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
                <span className="image-count">{files.length} foto dipilih</span>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
