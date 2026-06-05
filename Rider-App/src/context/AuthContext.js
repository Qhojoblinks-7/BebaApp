import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrapSession() {
      try {
        console.log('[AuthContext] Bootstrapping session...')
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
        console.log('[AuthContext] Initial session:', { userId: activeSession?.user?.id, email: activeSession?.user?.email })

        if (activeSession?.user) {
          // Check users table for rider/customer profile
          console.log('[AuthContext] Fetching user profile from users table for:', activeSession.user.id)
          const { data: userData } = await supabase
            .from('users')
            .select('user_type, full_name')
            .eq('id', activeSession.user.id)
            .maybeSingle();
          
          console.log('[AuthContext] User profile result:', { userData: JSON.stringify(userData) })

          if (userData) {
            setRole(userData.user_type);
            console.log('[AuthContext] User role set to:', userData.user_type)
            // Ensure rider_status exists for riders
            if (userData.user_type === 'rider') {
              console.log('[AuthContext] Ensuring rider_status for rider:', activeSession.user.id)
              await supabase.from('rider_status').upsert({
                id: activeSession.user.id,
                is_rider_online: false
              });
            }
          }
        }
      } catch (err) {
        console.warn("[Mobile Auth Bootstrap Error]:", err.message);
      } finally {
        setLoading(false);
      }
    }

    bootstrapSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[AuthContext] Auth state changed:', { event, userId: currentSession?.user?.id })
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('user_type, full_name')
          .eq('id', currentSession.user.id)
          .maybeSingle();
        
        console.log('[AuthContext] User data after state change:', { userData: JSON.stringify(userData) })

        if (userData) {
          setRole(userData.user_type);
          console.log('[AuthContext] Role set to:', userData.user_type)
          // Ensure rider_status exists for riders
          if (userData.user_type === 'rider') {
            console.log('[AuthContext] Upserting rider_status for:', currentSession.user.id)
            await supabase.from('rider_status').upsert({
              id: currentSession.user.id,
              is_rider_online: false
            });
          }
        }
      } else {
        console.log('[AuthContext] No user after state change, clearing role')
        setRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
