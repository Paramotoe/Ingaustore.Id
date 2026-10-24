/**
 * ProductGrid — Ingaustore.id
 *
 * Katalog publik: pelanggan melihat produk lalu ditekan tombol marketplace.
 */

function linkList(product) {
  if (Array.isArray(product.links) && product.links.length > 0) {
    return product.links.filter((l) => l && l.url)
  }
  if (product.link) return [{ name: 'Beli', url: product.link }]
  return []
}

export function ProductGrid({ products, loading, isAdmin, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="product-grid">
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
      <div className="empty-state">
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
      {products.map((product) => {
        const links = linkList(product)
        const foto = product.image_paths && product.image_paths[0]

        return (
          <article key={product.id} className="card">
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
                  <button className="icon-btn edit" onClick={() => onEdit(product)} title="Ubah">
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button className="icon-btn delete" onClick={() => onDelete(product)} title="Hapus">
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              )}
            </div>

            <div className="card-body">
              <h3 className="product-name">{product.name || product.code}</h3>

              {product.price != null && (
                <p className="product-price">
                  Rp {parseInt(product.price, 10).toLocaleString('id-ID')}
                </p>
              )}

              {product.code && <p className="product-code">Kode: {product.code}</p>}

              <div className="card-footer">
                {links.length > 0 && (
                  <div className="buy-links">
                    {links.map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary btn-full"
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
