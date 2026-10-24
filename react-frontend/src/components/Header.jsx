/**
 * Header — Ingaustore.id
 *
 * Logo tanpa background putih, tombol admin hanya untuk pemilik toko.
 */

export function Header({ isAdmin, logoRef, onLogout, onSettings }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div ref={logoRef} className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Kembali ke atas">
          <div className="logo-icon">
            <img src="/favicon.svg" alt="" />
          </div>
          <div className="logo-text">
            <h1>Ingaustore.id</h1>
            <p>Katalog Produk</p>
          </div>
        </div>

        <div className="header-actions">
          {isAdmin && (
            <>
              <button className="btn-outline" onClick={onSettings} title="Pengaturan Toko">
                <i className="fa-solid fa-gear"></i>
                <span>Pengaturan</span>
              </button>
              <button className="btn-outline btn-danger-soft" onClick={onLogout} title="Keluar dari Sesi">
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Keluar</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
