/**
 * Konfigurasi Supabase — Ingaustore.id
 *
 * Isi dua nilai di bawah dari Supabase Dashboard:
 *   Project Settings > API
 *
 *   supabaseUrl      : "Project URL", contoh https://abcdefghijklm.supabase.co
 *   supabaseAnonKey  : "anon public" / "publishable" key
 *
 * Kedua nilai ini AMAN dipublikasikan. Batas aksesnya diatur oleh Row Level
 * Security di database: pengunjung hanya bisa membaca, penulisan hanya untuk
 * akun admin yang sudah login.
 *
 * JANGAN pernah menaruh "service_role" / "secret" key di berkas ini — key
 * tersebut melewati seluruh aturan RLS.
 */
window.INGAU_CONFIG = {
    supabaseUrl: 'https://aptftowtjmkbyejzkvrj.supabase.co',
    supabaseAnonKey: 'sb_publishable_9br1lbz3uyWZCDzqyK8dhg_z8DcpuGK',
    // Hanya untuk backend/serverless (Vercel), tak samping di browser
    supabaseSecretKey: '',
    supabaseJwksUrl: 'https://aptftowtjmkbyejzkvrj.supabase.co/auth/v1/.well-known/jwks.json'
};
