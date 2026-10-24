/**
 * Header — Ingaustore.id
 * 
 * Header dengan logo (tanpa background putih),
 * search bar, dan tombol admin (login/logout/settings).
 */

import { useState } from 'react'

export function Header({ isAdmin, onLogin, onLogout, onSettings, onAddProduct }) {
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const handleSearch = (e) => {
    e.preventDefault()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // TODO: handle search
    }
  }

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <div className="logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-icon">
            <i className="fa-solid fa-instagram"></i>
          </div>
          <div className="logo-text">
            <h1>Ingaustore.id</h1>
            <p>Katalog Produk</p>
          </div>
        </div>

        {/* Search */}
        <form className="search-form" onSubmit={(e) => e.preventDefault()}>
          <div className="search-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="search"
              className="search-input"
              placeholder="Cari nama atau kode produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari produk"
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Hapus pencarian"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary">
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Cari</span>
          </button>
        </form>

        {/* Admin Actions */}
        <div className="header-actions">
          {isAdmin ? (
            <>
              <button
                className="btn-primary btn-sm"
                onClick={onAddProduct}
                title="Kelola Produk"
              >
                <i className="fa-solid fa-plus"></i>
                <span>Kelola</span>
              </button>
              <button
                className="btn-outline"
                onClick={onLogout}
                title="Keluar"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={onLogin}>
              <i className="fa-solid fa-lock"></i>
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
