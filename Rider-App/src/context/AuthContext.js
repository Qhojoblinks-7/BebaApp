import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabaseClient";

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
  
  // Track continuous runtime shifts to block out-of-order execution states
  const ongoingFetchId = useRef(0);

  useEffect(() => {
    console.log("[AuthContext] Initializing Supabase Auth Stream Listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // Increment the current execution cycle ID to discard outdated async tasks
      const localFetchId = ++ongoingFetchId.current;
      
      console.log("[AuthContext] Event intercept:", {
        event,
        userId: currentSession?.user?.id,
      });

      // Instantly update basic identity values to keep UI responsive
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Retrieve core user configuration details
        const { data: userData, error } = await supabase
          .from("users")
          .select("user_type, full_name")
          .eq("id", currentSession.user.id)
          .maybeSingle();

        if (error) throw error;

        // Abort state mutation updates if a newer auth change has already taken place
        if (localFetchId !== ongoingFetchId.current) return;

        if (userData) {
          setRole(userData.user_type);
          console.log("[AuthContext] Profile verification synchronized:", userData.user_type);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.warn("[AuthContext Error]: Sync exception caught ->", err.message);
      } finally {
        if (localFetchId === ongoingFetchId.current) {
          setLoading(false);
        }
      }
    });

    return () => {
      console.log("[AuthContext] Cleaning up context resources...");
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      // Increment execution counter to disregard downstream updates from the listener
      ongoingFetchId.current++;
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AuthContext SignOut Warning]:", err.message);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);