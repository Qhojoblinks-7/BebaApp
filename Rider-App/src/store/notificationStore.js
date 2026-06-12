import { create } from "zustand";
import { 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../services/firebaseConfig";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  selectedNotification: null,
  unsub: null,

  setSelectedNotification: (notification) => set({ selectedNotification: notification }),

  /**
   * Continuous Real-time Stream Setup
   * Eliminates the need for a separate one-time manual fetch function.
   */
  subscribeToNotifications: (userId) => {
    if (!userId) return;

    // Clean up existing subscription safely
    get().cleanSubscription();

    set({ loading: true });

    const q = query(
      collection(db, "notifications"),
      where("rider_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.is_read).length,
          loading: false,
        });
      },
      (err) => {
        console.warn("[NotificationStore] Stream subscription run failure:", err.message);
        set({ loading: false });
      }
    );

    set({ unsub });
    return unsub;
  },

  /**
   * Optimistic UI update followed by localized Firestore mutation
   */
  markAsRead: async (notificationId) => {
    try {
      // 1. Optimistic Update for instant interface response
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        return {
          notifications: updated,
          unreadCount: updated.filter((n) => !n.is_read).length,
        };
      });

      // 2. Persist to server
      await updateDoc(doc(db, "notifications", notificationId), {
        is_read: true,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[NotificationStore] Server modification failed:", err.message);
    }
  },

  /**
   * Isolated safety handler to clear active event queries
   */
  cleanSubscription: () => {
    const existingUnsub = get().unsub;
    if (existingUnsub && typeof existingUnsub === "function") {
      existingUnsub();
    }
    set({ unsub: null });
  },

  /**
   * Comprehensive state reset (Ideal for user sign-out scenarios)
   */
  clearNotifications: () => {
    get().cleanSubscription();
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      selectedNotification: null,
    });
  },
}));

export default useNotificationStore;