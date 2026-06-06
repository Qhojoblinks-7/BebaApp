import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Supabase configuration - replace with your project values
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://tjgutznerztvegoyitex.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqZ3V0em5lcnp0dmVnb3lpdGV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMDQ5ODAsImV4cCI6MjA5NDU4MDk4MH0.d1zLEuTHRNUOL3CE5eI4vk9thIGvdApQPTrc4nBTG34";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
