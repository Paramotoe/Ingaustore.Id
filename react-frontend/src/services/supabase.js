/**
 * Konfigurasi Supabase — Ingaustore.id
 *
 * Kredensial publishable memang publik; batas akses dijaga RLS di database.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Ingaustore] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY belum diset.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Access token di memori saja; refresh token di localStorage.
    // Menutup tab mengakhiri sesi admin, token tidak pernah menyentuh JS-readable storage.
    storage: typeof window !== 'undefined' ? window.localStorage : null,
    storageKey: 'ingau.auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
})

export default supabase
