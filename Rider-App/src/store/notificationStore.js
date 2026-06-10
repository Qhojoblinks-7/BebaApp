import { create } from "zustand";
import { supabase } from "../services/supabaseClient";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  refreshing: false,
  selectedNotification: null,

  setLoading: (value) => set({ loading: value }),
  setRefreshing: (value) => set({ refreshing: value }),
  setSelectedNotification: (notification) => set({ selectedNotification: notification }),

  setNotifications: (notifications) =>
    set({
      notifications: notifications || [],
      unreadCount: (notifications || []).filter((n) => !n.is_read).length,
    }),

  setUnreadCount: (count) => set({ unreadCount: count || 0 }),

  markAsRead: (notificationId) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.is_read).length,
      };
    }),

  fetchNotifications: async (userId) => {
    if (!userId) return;
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          title,
          body,
          rider_id,
          order_id,
          is_read,
          created_at,
          orders:order_id (
            id,
            order_id,
            item_description,
            pickup_address,
            sender_phone,
            customer_name,
            customer_phone,
            delivery_address,
            delivery_fee,
            pickup_lat,
            pickup_lng,
            delivery_lat,
            delivery_lng,
            status
          )
        `)
        .eq("rider_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      set((state) => ({
        notifications: data || [],
        unreadCount: (data || []).filter((n) => !n.is_read).length,
      }));
    } catch (err) {
      console.warn("[notificationStore] fetchNotifications failed:", err.message);
    } finally {
      set({ loading: false });
    }
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    })),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      refreshing: false,
      selectedNotification: null,
    }),
}));

export default useNotificationStore;
