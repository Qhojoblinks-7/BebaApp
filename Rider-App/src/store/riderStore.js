import { create } from "zustand";
import { getDoc, getDocs, query, where, orderBy, limit, setDoc, serverTimestamp } from "firebase/firestore";
import { doc, collection } from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";

const useRiderStore = create((set, get) => ({
  riderStatus: "offline",
  profile: {
    fullName: "",
    phone: "",
    email: "",
    riderId: "",
    avatarUrl: "",
  },
  activeOrders: [],
  dailySummary: {
    distanceKm: "0.0",
    earnings: 0,
    completedDrops: 0,
    cancelledRate: 0,
  },
  syncing: true,

  setRiderStatus: (status) => set({ riderStatus: status }),
  setRiderStatusInFirebase: async (userId, status) => {
    if (!userId) return;
    try {
      await setDoc(doc(db, "rider_status", userId), {
        rider_status: status,
        updated_at: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("[riderStore] setRiderStatusInFirebase failed:", err.message);
    }
  },
  toggleRiderStatus: async (userId) => {
    if (!userId) return;
    const current = get().riderStatus;
    const newStatus = current === "online" ? "offline" : "online";
    set({ riderStatus: newStatus });
    await get().setRiderStatusInFirebase(userId, newStatus);
    return newStatus;
  },
  setSyncing: (value) => set({ syncing: value }),

  setProfile: (profile) =>
    set((state) => ({
      profile: { ...state.profile, ...profile },
    })),

  setActiveOrders: (orders) => set({ activeOrders: orders }),

  setDailySummary: (summary) => set({ dailySummary: { ...get().dailySummary, ...summary } }),

  fetchProfile: async (userId) => {
    if (!userId) return;
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return;
      const data = snap.data();
      set({
        profile: {
          fullName: data.full_name || "",
          phone: data.phone || "",
          email: data.email || "",
          riderId: userId.slice(0, 8).toUpperCase(),
          avatarUrl: data.avatar_url || "",
        },
      });
    } catch (err) {
      console.warn("[riderStore] fetchProfile failed:", err.message);
    }
  },

  fetchActiveOrders: async (userId) => {
    if (!userId) return;
    try {
      const q = query(
        collection(db, "orders"),
        where("rider_id", "==", userId),
        orderBy("route_sequence"),
        limit(100)
      );
      const snap = await getDocs(q);
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status));
      set({ activeOrders: rows || [] });
    } catch (err) {
      console.warn("[riderStore] fetchActiveOrders failed:", err.message);
    }
  },

  fetchRiderStatus: async (userId) => {
    if (!userId) return;
    try {
      const snap = await getDoc(doc(db, "rider_status", userId));
      if (!snap.exists()) return;
      set({ riderStatus: snap.data().rider_status || "offline" });
    } catch (err) {
      console.warn("[riderStore] fetchRiderStatus failed:", err.message);
    }
  },

  clearRiderData: () =>
    set({
      riderStatus: "offline",
      profile: {
        fullName: "",
        phone: "",
        email: "",
        riderId: "",
        avatarUrl: "",
      },
      activeOrders: [],
      dailySummary: {
        distanceKm: "0.0",
        earnings: 0,
        completedDrops: 0,
        cancelledRate: 0,
      },
      syncing: true,
    }),
}));

export default useRiderStore;
