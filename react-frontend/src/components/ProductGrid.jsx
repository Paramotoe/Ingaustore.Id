/**
 * ProductGrid — Ingaustore.id
 *
 * Katalog publik: pelanggan melihat produk lalu ditekan tombol marketplace.
 */

// Tautan marketplace dinilai oleh satu sumber keamanan, bukan di sini,
// supaya baris lama dengan skema berbahaya tidak pernah menjadi href.
import { daftarTautan } from '../services/urlAman'

const formatHarga = (nilai) => {
  const angka = Number(nilai)
  if (!Number.isFinite(angka)) return ''
  return 'Rp ' + Math.round(angka).toLocaleString('id-ID')
}

export function ProductGrid({ products, loading, isAdmin, onEdit, onDelete, onBeli }) {
  if (loading) {
    return (
      <div className="product-grid" aria-busy="true" aria-label="Memuat produk">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card skeleton-card">
            <div className="skeleton skeleton-img"></div>
            <div className="skeleton skeleton-body"></div>
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="empty-state" style={{ animation: 'fadeInUp 0.4s ease both' }}>
        <div className="empty-icon">
          <i className="fa-solid fa-box-open"></i>
        </div>
        <h3>Katalog Masih Kosong</h3>
        <p>Belum ada produk yang tampil.</p>
      </div>
    )
  }

  return (
    <div className="product-grid">
      {products.map((product, i) => {
        const links = daftarTautan(product)
        const foto = product.image_paths && product.image_paths[0]
        const harga = formatHarga(product.price)

        return (
          <article
            key={product.id}
            className="card"
            style={{ animation: `fadeInUp 0.4s ${Math.min(i, 8) * 45}ms cubic-bezier(0.16, 1, 0.3, 1) both` }}
          >
            <div className="card-image">
              {foto ? (
                <img src={foto} alt={product.name || product.code} loading="lazy" />
              ) : (
                <div className="image-placeholder">
                  <i className="fa-solid fa-image"></i>
                  <span>Tanpa foto</span>
                </div>
              )}

              {product.category && <span className="category-badge">{product.category}</span>}

              {isAdmin && (
                <div className="card-actions">
                  <button className="icon-btn edit" onClick={() => onEdit(product)} title="Ubah produk" aria-label={`Ubah ${product.name}`}>
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button className="icon-btn delete" onClick={() => onDelete(product)} title="Hapus produk" aria-label={`Hapus ${product.name}`}>
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="card-body">
              <h3 className="product-name">{product.name || product.code}</h3>

              {harga && <p className="product-price">{harga}</p>}

              {product.code && <p className="product-code">Kode: {product.code}</p>}

              <div className="card-footer">
                {links.length > 0 && (
                  <div className="buy-links">
                    {links.map((l, idx) => (
                      <a
                        key={`${product.id}-${idx}`}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary btn-full"
                        onClick={() => onBeli && onBeli(product)}
                      >
                        <i className="fa-solid fa-bag-shopping"></i>
                        {l.name || 'Beli'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
