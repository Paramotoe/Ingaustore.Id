/**
 * ProductGrid — Ingaustore.id
 * 
 * Grid produk yang ditampilkan ke publik.
 * Menampilkan foto, nama, harga, kategori, tombol beli.
 */

import { useState } from 'react'

export function ProductGrid({ products, isAdmin, onEdit, onDelete, isLoading }) {
  const [selected, setSelected] = useState(null)

  if (isLoading) {
    return (
      <div className="product-grid skeleton">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card skeleton-card">
            <div className="skeleton-img"></div>
            <div className="skeleton-body"></div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <i className="fa-solid fa-box-open"></i>
        </div>
        <h3>Katalog Masih Kosong</h3>
        <p>Belum ada produk yang tersedia saat ini.</p>
      </div>
    )
  }

  return (
    <div className="product-grid">
      {products.map((product, index) => (
        <div key={product.id || product.code} className="card" style={{ transitionDelay: `${index * 25}ms` }}>
          <div className="card-image">
            {product.image_paths && product.image_paths.length > 0 ? (
              <img
                src={product.image_paths[0]}
                alt={product.name || product.code}
                loading="lazy"
              />
            ) : (
              <div className="image-placeholder">
                <i className="fa-solid fa-image"></i>
                <span>Tanpa foto</span>
              </div>
            )}
            {product.category && (
              <span className="category-badge">{product.category}</span>
            )}
            {isAdmin && (
              <div className="card-actions">
                <button
                  className="icon-btn edit"
                  onClick={() => onEdit(product)}
                  aria-label={`Ubah produk ${product.code}`}
                >
                  <i className="fa-solid fa-pen"></i>
                </button>
                <button
                  className="icon-btn delete"
                  onClick={() => onDelete(product.id)}
                  aria-label={`Hapus produk ${product.code}`}
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            )}
          </div>
          <div className="card-body">
            <h3 className="product-name">{product.name || product.code}</h3>
            <p className="product-price">
              {product.price != null ? `Rp ${parseInt(product.price).toLocaleString('id-ID')}` : 'Hubungi penjual'}
            </p>
            {product.code && (
              <p className="product-code">Kode: {product.code}</p>
            )}
            <div className="card-footer">
              <a
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-full"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="fa-solid fa-bag-shopping"></i>
                Beli
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
