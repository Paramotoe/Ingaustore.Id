/**
 * Supabase Client — Ingaustore.id
 * 
 * Baca dari environment variables (Vercel) atau fallback lokal.
 * Hanya supabaseUrl + supabaseAnonKey yang bisa dipublikasikan.
 * supabaseSecretKey & supabaseJwksUrl hanya untuk backend.
 */

import { createClient } from '@supabase/supabase-js'

// Vite environment variables (VERCEL_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
// In production, Vercel injects these as environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aptftowtjmkbyejzkvrj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_9br1lbz3uyWZCDzqyK8dhg_z8DcpuGK'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : null,
    storageKey: 'ingau.auth',
    persistSession: true,
    autoRefreshToken: true
  }
})

export default supabase
