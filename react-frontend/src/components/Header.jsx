/**
 * Header — Ingaustore.id
 *
 * Logo tanpa background putih, tombol admin hanya untuk pemilik toko.
 */

export function Header({ isAdmin, onLogin, onLogout, onSettings }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-icon">
            <i className="fa-solid fa-bag-shopping"></i>
          </div>
          <div className="logo-text">
            <h1>Ingaustore.id</h1>
            <p>Katalog Produk</p>
          </div>
        </div>

        <div className="header-actions">
          {isAdmin && (
            <>
              <button className="btn-outline" onClick={onSettings} title="Pengaturan">
                <i className="fa-solid fa-gear"></i>
                <span>Pengaturan</span>
              </button>
              <button className="btn-outline" onClick={onLogout} title="Keluar">
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
