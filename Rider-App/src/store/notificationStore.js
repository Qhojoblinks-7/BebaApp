import { create } from "zustand";
import { getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { doc, collection, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  refreshing: false,
  selectedNotification: null,
  unsub: null,

  setLoading: (value) => set({ loading: value }),
  setRefreshing: (value) => set({ refreshing: value }),
  setSelectedNotification: (notification) => set({ selectedNotification: notification }),

  setNotifications: (notifications) =>
    set({
      notifications: notifications || [],
      unreadCount: (notifications || []).filter((n) => !n.is_read).length,
    }),

  setUnreadCount: (count) => set({ unreadCount: count || 0 }),

  markAsRead: async (notificationId) => {
    try {
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        };
      });
      await updateDoc(doc(db, "notifications", notificationId), {
        is_read: true,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[Notifications] Mark status change failed:", err.message);
    }
  },

  fetchNotifications: async (userId) => {
    if (!userId) return;
    set({ loading: true });
    try {
      const q = query(
        collection(db, "notifications"),
        where("rider_id", "==", userId),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      set({
        notifications: docs || [],
        unreadCount: (docs || []).filter((n) => !n.is_read).length,
      });
    } catch (err) {
      console.warn("[notificationStore] fetchNotifications failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  subscribeToNotifications: (userId) => {
    if (!userId) return;
    // Clean up existing subscription before creating new one
    const existingUnsub = get().unsub;
    if (typeof existingUnsub === "function") {
      existingUnsub();
    }

    const q = query(
      collection(db, "notifications"),
      where("rider_id", "==", userId),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        set((state) => ({
          notifications,
          unreadCount: notifications.filter((n) => !n.is_read).length,
        }));
      },
      (err) => console.warn("[notificationStore] listen failed:", err.message)
    );

    set({ unsub });
    return unsub;
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
      unsub: null,
    }),
}));

export default useNotificationStore;
