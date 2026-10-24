import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import { Header } from './components/Header'
import { ProductGrid } from './components/ProductGrid'
import { AdminPanel } from './components/AdminPanel'
import { LoginModal } from './components/LoginModal'
import { SettingsModal } from './components/SettingsModal'
import { EditProductModal } from './components/EditProductModal'
import './index.css'

function App() {
  const [products, setProducts] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' })

  useEffect(() => {
    const init = async () => {
      await loadProducts()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.rpc('is_admin')
        setIsAdmin(data === true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    })
  }, [])

  const loadProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
      setProducts(data || [])
    } catch (err) {
      showToast('Gagal memuat produk: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (msg, type = 'info') => {
    setToast({ show: true, message: msg, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000)
  }

  const handleLogin = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    return true
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAdmin(false)
    showToast('Anda telah keluar.', 'success')
  }

  const handleAddProduct = async (productData, images) => {
    const { error } = await supabase.from('products').insert([{
      ...productData,
      image_paths: images.map(img => img.path)
    }])
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    showToast('Produk berhasil ditambahkan.', 'success')
    loadProducts()
    return true
  }

  const handleDeleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    showToast('Produk dihapus.', 'success')
    loadProducts()
    return true
  }

  const handleEditProduct = async (id, productData, images) => {
    const { error } = await supabase.from('products').update({
      ...productData,
      image_paths: images.map(img => img.path)
    }).eq('id', id)
    if (error) {
      showToast(error.message, 'error')
      return false
    }
    showToast('Produk diperbarui.', 'success')
    loadProducts()
    return true
  }

  // Filter products
  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm ||
      p.code.toLowerCase().includes(searchLower) ||
      p.name.toLowerCase().includes(searchLower)
    const matchesCategory = category === 'all' || p.category === category
    return matchesSearch && matchesCategory
  })

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'termurah') return (a.price || 0) - (b.price || 0)
    if (sortBy === 'termahal') return (b.price || 0) - (a.price || 0)
    if (sortBy === 'nama') return (a.name || a.code).localeCompare(b.name || b.code)
    return 0
  })

  return (
    <div className="app">
      <Header
        isAdmin={isAdmin}
        onLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onSettings={() => setIsSettingsOpen(true)}
        onAddProduct={() => {}}
        onEditProduct={() => {}}
      />

      <main className="main-content">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          category={category}
          onCategoryChange={setCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <ProductGrid
          products={sortedProducts}
          isAdmin={isAdmin}
          onEdit={(p) => { setSelectedProduct(p); setIsEditOpen(true) }}
          onDelete={handleDeleteProduct}
          isLoading={loading}
        />
        <AdminPanel
          isAdmin={isAdmin}
          onAddProduct={() => {}}
          onEditProduct={(p) => { setSelectedProduct(p); setIsEditOpen(true) }}
          onDeleteProduct={handleDeleteProduct}
          onPreviewFoto={(images) => {}}
        />
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <i className={`fa-solid fa-${toast.type === 'success' ? 'check' : toast.type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Login Modal */}
      {isLoginOpen && (
        <LoginModal
          onClose={() => setIsLoginOpen(false)}
          onSuccess={handleLogin}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isAdmin={isAdmin}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Edit Product Modal */}
      {isEditOpen && selectedProduct && (
        <EditProductModal
          product={selectedProduct}
          isAdmin={isAdmin}
          onClose={() => { setIsEditOpen(false); setSelectedProduct(null) }}
          onSave={(data, images) => handleEditProduct(selectedProduct.id, data, images)}
        />
      )}
    </div>
  )
}

export default App
