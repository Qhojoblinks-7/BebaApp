import { create } from "zustand";
import { supabase } from "../services/supabaseClient";

const useOrderStore = create((set, get) => ({
  pendingOrders: [],
  activeOrders: [],
  deliveryHistory: [],
  selectedOrder: null,
  jobZones: [],
  dailySummary: {
    distanceKm: "0.0",
    earnings: 0,
    completedDrops: 0,
    cancelledRate: 0,
  },

  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setJobZones: (zones) => set({ jobZones: zones }),

  setPendingOrders: (orders) => set({ pendingOrders: orders }),

  setActiveOrders: (orders) => set({ activeOrders: orders }),

  setDeliveryHistory: (history) => set({ deliveryHistory: history }),

  setDailySummary: (summary) => set({ dailySummary: summary }),

  fetchPendingOrders: async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "pending")
        .is("rider_id", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      if (data) {
        const ordersWithZones = data.map((order) => ({
          ...order,
          zone: get().resolveOrderZone(order),
        }));
        set({ pendingOrders: ordersWithZones });
      }
    } catch (err) {
      console.warn("[orderStore] fetchPendingOrders failed:", err.message);
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
      console.warn("[orderStore] fetchActiveOrders failed:", err.message);
    }
  },

  fetchDeliveryHistory: async (userId, dateRange) => {
    if (!userId) return;
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .eq("rider_id", userId)
        .in("status", ["delivered", "cancelled"]);

      if (dateRange) {
        query = query
          .gte("created_at", dateRange.start)
          .lt("created_at", dateRange.end);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      set({ deliveryHistory: data || [] });
    } catch (err) {
      console.warn("[orderStore] fetchDeliveryHistory failed:", err.message);
    }
  },

  advanceOrderStatus: async (orderId, nextStatus, updates = {}) => {
    try {
      const finalUpdates = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
        ...updates,
      };

      const { error } = await supabase
        .from("orders")
        .update(finalUpdates)
        .eq("id", orderId);

      if (error) throw error;

      set((state) => {
        const updatedPending = state.pendingOrders.filter((o) => o.id !== orderId);
        const updatedActive = state.activeOrders
          .map((o) => (o.id === orderId ? { ...o, status: nextStatus, ...updates } : o))
          .filter((o) => ["assigned", "picked_up", "in_transit"].includes(o.status));
        return { pendingOrders: updatedPending, activeOrders: updatedActive };
      });

      return true;
    } catch (err) {
      console.warn("[orderStore] advanceOrderStatus failed:", err.message);
      return false;
    }
  },

  clearOrders: () =>
    set({
      pendingOrders: [],
      activeOrders: [],
      deliveryHistory: [],
      selectedOrder: null,
      jobZones: [],
    }),
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

const pointInPolygon = (lng, lat, polygon) => {
  if (!polygon || polygon.length < 4) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length - 1; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const resolveOrderZone = (order) => {
  const { delivery_lng, delivery_lat, delivery_address } = order;

  if (delivery_lng && delivery_lat) {
    for (const [zoneName, polygon] of Object.entries(GEOFENCE_POLYGONS)) {
      if (
        pointInPolygon(
          Number(delivery_lng),
          Number(delivery_lat),
          polygon
        )
      ) {
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
