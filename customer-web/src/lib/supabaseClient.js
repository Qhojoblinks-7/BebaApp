import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

console.log('[Supabase] Loading client...')
console.log('[Supabase] URL:', supabaseUrl)
console.log('[Supabase] URL looks valid:', supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co'))
console.log('[Supabase] Anon key set:', !!supabaseAnonKey && supabaseAnonKey.startsWith('ey'))

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: { schema: 'public' },
  global: {
    headers: { 'x-client-info': 'customer-web' }
  }
})

console.log('[Supabase] Client created successfully')