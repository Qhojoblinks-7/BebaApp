import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import notificationService from "../services/notificationService";

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  role: null,
  loading: true,
  isAuthReady: false,
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const ongoingFetchId = useRef(0);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      const localFetchId = ++ongoingFetchId.current;
      setSession(firebaseUser);
      setUser(firebaseUser);
      setIsAuthReady(false);

      if (!firebaseUser) {
        setProfile(null);
        setRole(null);
        setLoading(false);
        setIsAuthReady(true);
        return;
      }

      try {
        setLoading(true);
        notificationService.setupHandler();
        const tokenPromise = notificationService.registerPushToken(firebaseUser.uid);
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (localFetchId !== ongoingFetchId.current) return;

        const userData = snap.exists() ? snap.data() : {};
        setProfile(userData);
        setRole(userData.user_type || null);
        await tokenPromise;
      } catch (err) {
        console.warn("[AuthContext Error]:", err.message);
        if (localFetchId === ongoingFetchId.current) {
          setProfile(null);
          setRole(null);
        }
      } finally {
        if (localFetchId === ongoingFetchId.current) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    });
    return () => unsub();
  }, []);

  const signOutHandler = useCallback(async () => {
    try {
      setLoading(true);
      ongoingFetchId.current++;
      await signOut(auth);
      setSession(null);
      setUser(null);
      setProfile(null);
      setRole(null);
    } catch (err) {
      console.warn("[AuthContext SignOut Warning]:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, isAuthReady, signOut: signOutHandler }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);