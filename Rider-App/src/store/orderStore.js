import { create } from "zustand";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebaseConfig";

const useOrderStore = create((set, get) => ({
  pendingOrders: [],
  activeOrders: [],
  deliveryHistory: [],
  selectedOrder: null,
  jobZones: [],
  
  // Active listeners collection registry for cleanup operations
  listeners: {
    pending: null,
    active: null,
    history: null,
  },

  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setJobZones: (zones) => set({ jobZones: zones }),

  /**
   * Continuous Streaming for Available Dispatch Board (No rider assigned)
   */
  subscribeToPendingOrders: () => {
    get().cleanListener("pending");

    const q = query(
      collection(db, "orders"),
      where("status", "==", "pending"),
      orderBy("created_at", "asc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const allPending = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Filter out assignments locally only if backend indexing processes are settling
      const ordersWithZones = allPending
        .filter((o) => !o.rider_id)
        .map((order) => ({
          ...order,
          zone: resolveOrderZone(order),
        }));

      set({ pendingOrders: ordersWithZones });
    }, (err) => console.warn("[OrderStore] Pending stream exception:", err.message));

    set((state) => ({ listeners: { ...state.listeners, pending: unsub } }));
    return unsub;
  },

  /**
   * Continuous Live Synchronizer for Assigned Tasks
   */
  subscribeToActiveOrders: (userId) => {
    if (!userId) return;
    get().cleanListener("active");

    const q = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      orderBy("route_sequence", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const active = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status));
        
      set({ activeOrders: active });
    }, (err) => console.warn("[OrderStore] Active manifest feed error:", err.message));

    set((state) => ({ listeners: { ...state.listeners, active: unsub } }));
    return unsub;
  },

  /**
   * Performant Index-Bound History Pipeline (Eliminates localized filter passes)
   */
  subscribeToDeliveryHistory: (userId, dateBounds) => {
    if (!userId) return;
    get().cleanListener("history");

    let q = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(100)
    );

    // Apply native compound parameters directly if explicit range brackets are passed
    if (dateBounds?.startStr && dateBounds?.endStr) {
      q = query(
        collection(db, "orders"),
        where("rider_id", "==", userId),
        where("created_at", ">=", dateBounds.startStr),
        where("created_at", "<=", dateBounds.endStr),
        orderBy("created_at", "desc"),
        limit(100)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const history = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => ["delivered", "cancelled"].includes(o.status));

      set({ deliveryHistory: history });
    }, (err) => console.warn("[OrderStore] History ledger pipeline crash:", err.message));

    set((state) => ({ listeners: { ...state.listeners, history: unsub } }));
    return unsub;
  },

  /**
   * Smooth Optimistic Pipeline to Advance Status
   */
  advanceOrderStatus: async (orderId, nextStatus, updates = {}) => {
    const previousActive = get().activeOrders;
    const previousPending = get().pendingOrders;

    try {
      // 1. Instantly update UI optimistically
      set((state) => {
        const updatedPending = state.pendingOrders.filter((o) => o.id !== orderId);
        const updatedActive = state.activeOrders
          .map((o) => (o.id === orderId ? { ...o, status: nextStatus, ...updates } : o))
          .filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status));
        return { pendingOrders: updatedPending, activeOrders: updatedActive };
      });

      // 2. Persist to server
      const finalUpdates = {
        status: nextStatus,
        updated_at: serverTimestamp(),
        ...updates,
      };
      await updateDoc(doc(db, "orders", orderId), finalUpdates);
      return true;
    } catch (err) {
      console.warn("[OrderStore] Operational state mutation rejected:", err.message);
      // Rollback to previous state if the network call fails
      set({ activeOrders: previousActive, pendingOrders: previousPending });
      return false;
    }
  },

  /**
   * Helper utility to safely close individual event queries
   */
  cleanListener: (type) => {
    const activeUnsub = get().listeners[type];
    if (activeUnsub && typeof activeUnsub === "function") {
      activeUnsub();
    }
    set((state) => ({ listeners: { ...state.listeners, [type]: null } }));
  },

  /**
   * Clean up everything (Call this when a user logs out)
   */
  clearOrders: () => {
    Object.keys(get().listeners).forEach((key) => get().cleanListener(key));
    set({
      pendingOrders: [],
      activeOrders: [],
      deliveryHistory: [],
      selectedOrder: null,
      jobZones: [],
    });
  },
}));

export const GEOFENCE_ZONES = [
  "Mamprobi",
  "Accra Central",
  "Circle",
  "Dansoman",
  "Kaneshi",
  "Osu",
  "General Accra",
];

const GEOFENCE_POLYGONS = {
  Dansoman: [
    [-0.284, 5.5645],
    [-0.2485, 5.568],
    [-0.249, 5.5395],
    [-0.2882, 5.532],
    [-0.284, 5.5645],
  ],
  Mamprobi: [
    [-0.251, 5.5482],
    [-0.236, 5.546],
    [-0.2375, 5.5265],
    [-0.2522, 5.529],
    [-0.251, 5.5482],
  ],
  "Accra Central": [
    [-0.216, 5.5562],
    [-0.1985, 5.553],
    [-0.201, 5.5375],
    [-0.2142, 5.534],
    [-0.216, 5.5562],
  ],
  Osu: [
    [-0.1885, 5.5678],
    [-0.174, 5.5695],
    [-0.1712, 5.5442],
    [-0.1898, 5.542],
    [-0.1885, 5.5678],
  ],
};

/**
 * Solidified Ray-Casting Algorithm
 */
const pointInPolygon = (lng, lat, polygon) => {
  if (!polygon || polygon.length < 4) return false;
  let inside = false;
  
  // 🔑 FIX: Correct boundary closure evaluation (i < polygon.length)
  for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      (yi > lat) !== (yj > lat) && 
      lng < ((xj - xi) * (lat - yi)) / (yj - yj === 0 ? 0.00001 : yj - yi) + xi;
      
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
};

const resolveOrderZone = (order) => {
  const { delivery_lng, delivery_lat, delivery_address } = order;
  if (delivery_lng && delivery_lat) {
    for (const [zoneName, polygon] of Object.entries(GEOFENCE_POLYGONS)) {
      if (pointInPolygon(Number(delivery_lng), Number(delivery_lat), polygon)) {
        return zoneName;
      }
    }
  }
  if (delivery_address) {
    const lowerAddress = delivery_address.toLowerCase();
    for (const zone of GEOFENCE_ZONES) {
      if (zone !== "General Accra" && lowerAddress.includes(zone.toLowerCase())) {
        return zone;
      }
    }
  }
  return "General Accra";
};

useOrderStore.resolveOrderZone = resolveOrderZone;
export default useOrderStore;