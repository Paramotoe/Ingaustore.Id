/**
 * EditProductModal — Ingaustore.id
 * 
 * Modal edit produk.
 */

import { useState } from 'react'

export function EditProductModal({ product, onClose, onSave }) {
  const [name, setName] = useState(product.name || '')
  const [price, setPrice] = useState(product.price || '')
  const [category, setCategory] = useState(product.category || '')
  const [code, setCode] = useState(product.code || '')
  const [link, setLink] = useState(product.link || '')
  const [images, setImages] = useState([])
  const [fotoInfo, setFotoInfo] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const data = {
      name: name.trim(),
      price: price ? parseInt(price) : null,
      category: category.trim() || null,
      code: code.trim().toUpperCase(),
      link: link.trim()
    }

    await onSave(data, images)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal">
        <div className="modal-header">
          <h2>Ubah Produk</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nama Produk</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kaos Katun Premium"
              maxLength={80}
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Harga (Rp)</label>
              <input
                type="number"
                className="form-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150000"
                min="0"
                step="500"
              />
            </div>
            <div className="form-group flex-1">
              <label>Kategori</label>
              <input
                type="text"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Atasan"
                maxLength={32}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Kode</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="IG-001"
              maxLength={32}
              pattern="[A-Za-z0-9-]+"
            />
          </div>

          <div className="form-group">
            <label>Link Pembelian</label>
            <input
              type="url"
              className="form-input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://shopee.co.id/..."
            />
          </div>

          <div className="form-group">
            <label>Foto (maks. 4)</label>
            <div className="image-upload">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length <= 4) {
                    setImages(files)
                    setFotoInfo(`${files.length} dari maksimal 4`)
                  }
                }}
                className="form-file"
              />
              {images.map((file, i) => (
                <div key={i} className="image-preview-item">
                  <img src={URL.createObjectURL(file)} alt={`Foto ${i + 1}`} />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ))}
              {fotoInfo && <span className="image-count">{fotoInfo}</span>}
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              <i className={saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'}></i>
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              <i className="fa-solid fa-times"></i> Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
