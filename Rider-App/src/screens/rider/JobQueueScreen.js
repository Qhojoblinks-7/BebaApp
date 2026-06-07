import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import * as Notifications from "expo-notifications";
import { Package, Layers } from "lucide-react-native";
import RiderOrderCard from "../../components/rider/RiderOrderCard";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";

const GEOFENCE_ZONES = [
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

// Ray-casting algorithm for checking coordinate containment
const pointInPolygon = (lng, lat, polygon) => {
  if (!polygon || polygon.length < 4) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length - 1; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

// Active Geofencing Resolution Pipeline
const resolveOrderZone = (order) => {
  const { delivery_lng, delivery_lat, delivery_address } = order;

  // Priority 1: Check precise geospatial telemetry data if available
  if (delivery_lng && delivery_lat) {
    for (const [zoneName, polygon] of Object.entries(GEOFENCE_POLYGONS)) {
      if (pointInPolygon(Number(delivery_lng), Number(delivery_lat), polygon)) {
        return zoneName;
      }
    }
  }

  // Priority 2: Text matching fallback for explicit local target addresses
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function JobQueueScreen() {
  const { user } = useAuth();
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchAvailable = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "pending")
        .is("rider_id", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        // Group orders into zones dynamically using our resolution pipeline
        const groups = data.reduce((acc, currentOrder) => {
          const zone = resolveOrderZone(currentOrder);
          if (!acc[zone]) acc[zone] = [];
          acc[zone].push({ ...currentOrder, zone });
          return acc;
        }, {});

        const flattenedOrders = Object.values(groups).flat();
        setOrders(flattenedOrders);
        setZones(GEOFENCE_ZONES.filter((z) => groups[z] && groups[z].length > 0));
      }
    } catch (err) {
      console.error("[JobQueue] Fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailable();

    const channel = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.new && payload.new.status === "pending") {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "New Order Available",
                body: `Order #${payload.new.order_id || payload.new.id} is ready for pickup`,
              },
            });
            fetchAvailable();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAvailable]);

  const generateDeliveryPin = () => Math.floor(1000 + Math.random() * 9000).toString();

  const acceptOrder = async (order) => {
    if (!user?.id || !order?.id) return;
    try {
      setLoading(true);
      const deliveryPin = generateDeliveryPin();
      
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("rider_id", user.id)
        .in("status", ["assigned", "picked_up", "in_transit"]);

      const { error } = await supabase
        .from("orders")
        .update({
          rider_id: user.id,
          status: "assigned",
          route_sequence: (count || 0) + 1,
          delivery_pin: deliveryPin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (err) {
      console.error("[JobQueue] Accept failed:", err);
      alert("Failed to accept order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const acceptEntireZone = async (zoneOrders) => {
    if (!user?.id || !zoneOrders.length) return;
    try {
      setLoading(true);
      
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("rider_id", user.id)
        .in("status", ["assigned", "picked_up", "in_transit"]);

      const baseSeq = count || 0;
      const updates = zoneOrders.map((order, index) =>
        supabase
          .from("orders")
          .update({
            rider_id: user.id,
            status: "assigned",
            route_sequence: baseSeq + index + 1,
            delivery_pin: generateDeliveryPin(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id),
      );

      const results = await Promise.all(updates);
      if (results.some((r) => r.error)) {
        alert("Failed to claim some orders. Please refresh and retry.");
      } else {
        alert(`Zone locked! ${zoneOrders.length} dispatches assigned.`);
        fetchAvailable();
      }
    } catch (err) {
      console.error("[JobQueue] Batch claim failed:", err);
      alert("Error claiming batch.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="small" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />
      
      {/* Notch-Aware Structural Header Container */}
      <View style={[
        styles.headerBackground, 
        { 
          backgroundColor: colors.primary,
          paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow || "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            },
            android: { elevation: 8 },
          }),
        }
      ]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headingOnBg, { color: colors.textOnPrimary }]}>New Orders Available</Text>
          <Text style={[styles.countText, { color: colors.textOnPrimary }]}>
            {orders.length} open request{orders.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: zones.length > 0 ? 140 : 40 }}
        data={orders}
        keyExtractor={(item) => item.id}
        onRefresh={() => {
          setRefreshing(true);
          fetchAvailable();
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Package size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No open requests in your zone.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RiderOrderCard
            order={item}
            onPress={(order) => setSelectedOrder(order)}
          />
        )}
        ListHeaderComponent={
          zones.length > 0 ? (
            <View style={styles.batchHeader}>
              <Layers size={16} color={colors.secondary} />
              <Text style={[styles.batchHeaderText, { color: colors.textSecondary }]}>
                {zones.length} zone{zones.length !== 1 ? "s" : ""} available
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating Bottom Batch Bar */}
      {zones.length > 0 && (
        <View style={[
          styles.batchClaimBar, 
          { 
            backgroundColor: colors.backgroundCard, 
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 16 
          }
        ]}>
          <Text style={[styles.batchClaimText, { color: colors.textSecondary }]}>
            Tap a card to accept one, or claim its entire zone below:
          </Text>
          <FlatList
            horizontal
            data={zones}
            keyExtractor={(zone) => zone}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
            renderItem={({ item: zone }) => {
              const zoneOrders = orders.filter((o) => o.zone === zone);
              const zoneFee = zoneOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
              
              return (
                <TouchableOpacity
                  style={[styles.batchClaimBtn, { backgroundColor: colors.primary }]}
                  onPress={() => acceptEntireZone(zoneOrders)}
                >
                  <Text style={[styles.batchClaimZone, { color: colors.textOnPrimary }]}>{zone}</Text>
                  <Text style={[styles.batchClaimMeta, { color: colors.textOnPrimary }]}>
                    {zoneOrders.length} pkg{zoneOrders.length !== 1 ? "s" : ""} · GH¢ {zoneFee.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <DeliveryDetailsBottomSheet
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={(order, status) => {
          if (status === "pending") {
            acceptOrder(order);
          }
          setSelectedOrder(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBackground: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  headerContent: { marginTop: 4 },
  headingOnBg: { fontSize: 19, fontWeight: "900", marginBottom: 2, letterSpacing: -0.4 },
  countText: { fontSize: 13, fontWeight: "600", opacity: 0.9 },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: "500" },
  batchHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  batchHeaderText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  batchClaimBar: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingTop: 12, elevation: 16 },
  batchClaimText: { fontSize: 11, fontWeight: "600", paddingHorizontal: 16, marginBottom: 6 },
  batchClaimBtn: { borderRadius: 12, padding: 12, minWidth: 135, justifyContent: "center" },
  batchClaimZone: { fontSize: 13, fontWeight: "800", letterSpacing: -0.2 },
  batchClaimMeta: { fontSize: 11, fontWeight: "600", marginTop: 1, opacity: 0.95 },
});