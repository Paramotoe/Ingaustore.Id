/**
 * App — Ingaustore.id
 *
 * Satu sumber kebenaran: daftar produk, status admin, pencarian,
 * filter kategori, urutan, dan semua modal.
 */

import { useState, useEffect, useMemo } from 'react'
import { supabase } from './services/supabase'
import { Header } from './components/Header'
import { ProductGrid } from './components/ProductGrid'
import { ProductModal } from './components/ProductModal'
import { LoginModal } from './components/LoginModal'
import { SettingsModal } from './components/SettingsModal'
import './index.css'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState({ open: false, product: null })
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const refreshAdmin = async () => {
    const { data, error } = await supabase.rpc('is_admin')
    if (!error) setIsAdmin(data === true)
  }

  const loadProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Gagal memuat produk: ' + error.message, 'error')
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) refreshAdmin()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAdmin(!!session)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleLogin = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    await refreshAdmin()
    showToast('Berhasil masuk.', 'success')
    return true
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
    showToast('Anda telah keluar.', 'info')
  }

  const handleDelete = async (product) => {
    if (!confirm(`Hapus produk "${product.name}"?`)) return
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast('Produk dihapus.', 'success')
    loadProducts()
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = products.filter((p) => {
      const hit =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q)
      const cat = category === 'all' || p.category === category
      return hit && cat
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'termurah') return (a.price || 0) - (b.price || 0)
      if (sortBy === 'termahal') return (b.price || 0) - (a.price || 0)
      if (sortBy === 'nama') return (a.name || '').localeCompare(b.name || '')
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [products, search, category, sortBy])

  return (
    <div className="app">
      <Header
        isAdmin={isAdmin}
        onLogin={() => setLoginOpen(true)}
        onLogout={handleLogout}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="main-content">
        <section className="catalog-head">
          <h2>Katalog Produk</h2>
          <p>{products.length} produk tersedia</p>
        </section>

        <div className="toolbar">
          <div className="search-wrap">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              className="search-input"
              type="search"
              placeholder="Cari nama atau kode produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} aria-label="Hapus">
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Semua Kategori</option>
            {[...new Set(products.map((p) => p.category).filter(Boolean))].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Terbaru</option>
            <option value="termurah">Termurah</option>
            <option value="termahal">Termahal</option>
            <option value="nama">Nama A-Z</option>
          </select>
        </div>

        <ProductGrid
          products={visible}
          loading={loading}
          isAdmin={isAdmin}
          onEdit={(p) => setModal({ open: true, product: p })}
          onDelete={handleDelete}
        />
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Ingaustore.id — Katalog Produk Online</span>
      </footer>

      {isAdmin && (
        <button className="fab" onClick={() => setModal({ open: true, product: null })}>
          <i className="fa-solid fa-plus"></i>
        </button>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <i className={`fa-solid fa-${toast.type === 'success' ? 'check' : toast.type === 'error' ? 'triangle-exclamation' : 'info'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {modal.open && (
        <ProductModal
          product={modal.product}
          onClose={() => setModal({ open: false, product: null })}
          onSaved={() => { setModal({ open: false, product: null }); loadProducts() }}
          showToast={showToast}
        />
      )}

      {loginOpen && (
        <LoginModal onClose={() => setLoginOpen(false)} onSuccess={handleLogin} />
      )}

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} showToast={showToast} />
      )}
    </div>
  )
}
