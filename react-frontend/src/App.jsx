/**
 * App — Ingaustore.id
 *
 * Satu sumber kebenaran: daftar produk, status admin, pencarian,
 * filter kategori, urutan, dan semua modal.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from './services/supabase'
import { pasangPintuAdmin } from './services/adminGate'
import { Header } from './components/Header'
import { ProductGrid } from './components/ProductGrid'
import { ProductModal } from './components/ProductModal'
import { LoginModal } from './components/LoginModal'
import { SettingsModal } from './components/SettingsModal'
import './index.css'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState({ cek: false, masuk: false })
  const [branding, setBranding] = useState({ logo: '', wallpaper: '' })

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [loginOpen, setLoginOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modal, setModal] = useState({ open: false, product: null })
  const [toast, setToast] = useState(null)

  const toastTimer = useRef(null)
  const isAdmin = admin.masuk && !admin.cek
  const logoRef = useRef(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  // Status admin ditetapkan hanya oleh jawaban database (public.is_admin()),
  // bukan oleh keberadaan sesi. Siapa pun bisa punya sesi Supabase, tetapi
  // hanya akun di daftar putih admins yang bernilai true.
  const refreshAdmin = useCallback(async () => {
    setAdmin((a) => ({ ...a, cek: true }))
    const { data, error } = await supabase.rpc('is_admin')
    if (error) {
      setAdmin({ cek: false, masuk: false })
      return
    }
    setAdmin({ cek: false, masuk: data === true })
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      showToast('Gagal memuat produk: ' + error.message, 'error')
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }, [showToast])

  // Tampilan toko diambil dari tabel settings (logo & wallpaper).
  const loadBranding = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('key, value')
    if (error) {
      console.warn('[Ingaustore] branding tidak termuat:', error.message)
      return
    }
    const hasil = { logo: '', wallpaper: '' }
    for (const baris of data || []) {
      if (baris.key === 'logo') hasil.logo = baris.value
      if (baris.key === 'wallpaper') hasil.wallpaper = baris.value
    }
    setBranding(hasil)
  }, [])

  useEffect(() => {
    loadProducts()
    loadBranding()

    // Cek sesi yang tersimpan tanpa pernah mengubah status admin.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) refreshAdmin()
    })

    // Hanya reaksi terhadap perubahan autentikasi: kalau sesi hilang, keluar.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAdmin({ cek: false, masuk: false })
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshAdmin()
      }
    })

    const lepasPintu = pasangPintuAdmin(logoRef.current, () => {
      setLoginOpen(true)
    })

    return () => {
      sub.subscription.unsubscribe()
      lepasPintu()
    }
  }, [loadProducts, loadBranding, refreshAdmin])

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
    setAdmin({ cek: false, masuk: false })
    setSettingsOpen(false)
    setModal({ open: false, product: null })
    showToast('Anda telah keluar.', 'info')
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Hapus produk "${product.name}"? Tindakan ini tidak bisa dibatalkan.`)) return
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      showToast('Gagal menghapus: ' + error.message, 'error')
      return
    }
    showToast('Produk dihapus.', 'success')
    loadProducts()
  }

  // Catat klik tombol marketplace. Gagal mencatat tidak mengganggu pelanggan.
  const handleBeli = useCallback((product) => {
    supabase
      .from('buy_clicks')
      .insert({ product_id: product.id })
      .then(({ error }) => {
        if (error) console.warn('[Ingaustore] klik tidak tercatat:', error.message)
      })
  }, [])

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

// App.jsx render
  return (
    <div className="app">
      <Header
        isAdmin={isAdmin}
        logoRef={logoRef}
        logoUrl={branding.logo}
        onLogout={handleLogout}
        onSettings={() => setSettingsOpen(true)}
      />

      <main className="main-content" style={branding.wallpaper ? { backgroundImage: `linear-gradient(rgba(248,250,252,0.92), rgba(248,250,252,0.92)), url(${branding.wallpaper})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : {}}>
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
          onBeli={handleBeli}
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
        <SettingsModal onClose={() => setSettingsOpen(false)} showToast={showToast} onSaved={loadBranding} />
      )}
    </div>
  )
}
