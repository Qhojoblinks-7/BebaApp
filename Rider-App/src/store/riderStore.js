import { create } from "zustand";
import { supabase } from "../services/supabaseClient";

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
      const { data, error } = await supabase
        .from("users")
        .select("full_name, phone, email, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        set({
          profile: {
            fullName: data.full_name || "",
            phone: data.phone || "",
            email: data.email || "",
            riderId: userId.slice(0, 8).toUpperCase(),
            avatarUrl: data.avatar_url || "",
          },
        });
      }
    } catch (err) {
      console.warn("[riderStore] fetchProfile failed:", err.message);
    }
  },

  fetchActiveOrders: async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", userId)
        .in("status", ["assigned", "picked_up", "in_transit"])
        .order("route_sequence", { ascending: true });

      if (error) throw error;
      set({ activeOrders: data || [] });
    } catch (err) {
      console.warn("[riderStore] fetchActiveOrders failed:", err.message);
    }
  },

  fetchRiderStatus: async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("rider_status")
        .select("rider_status")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (data) set({ riderStatus: data.rider_status || "offline" });
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
