import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tjgutznerztvegoyitex.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZ3V0em5lcnp0dmVnb3lpdGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDQ5ODAsImV4cCI6MjA5NDU4MDk4MH0.d1zLEuTHRNUOL3CE5eI4vk9thIGvdApQPTrc4nBTG34'

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