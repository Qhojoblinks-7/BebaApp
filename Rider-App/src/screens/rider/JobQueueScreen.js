import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import useOrderStore from "../../store/orderStore";
import notificationService from "../../services/notificationService";
import { Package, Layers } from "lucide-react-native";
import RiderOrderCard from "../../components/rider/RiderOrderCard";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";

export default function JobQueueScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();

  const orderStore = useOrderStore();
  const pendingOrders = orderStore.pendingOrders;
  const setPendingOrders = orderStore.setPendingOrders;
  const fetchPendingOrders = orderStore.fetchPendingOrders;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const fetchTimerRef = useRef(null);

  const fetchAvailable = useCallback(async () => {
    if (fetchTimerRef.current) return;
    fetchTimerRef.current = setTimeout(() => {
      fetchTimerRef.current = null;
    }, 800);
    try {
      setLoading(true);
      await fetchPendingOrders();
    } catch (err) {
      console.error("[JobQueue] Fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPendingOrders, setLoading]);

  useEffect(() => {
    notificationService.setupHandler();
    notificationService.ensureChannel();
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
            await notificationService.scheduleLocalNotification({
              title: "New Order Available",
              body: `Order #${payload.new.order_id || payload.new.id} is ready for pickup`,
              data: { url: "JobQueueTab", orderId: payload.new.id },
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

  const zones = useOrderStore.GEOFENCE_ZONES.filter((z) =>
    pendingOrders.some((o) => o.zone === z)
  );

  if (loading && pendingOrders.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="small" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} translucent />

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
            {pendingOrders.length} open request{pendingOrders.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: zones.length > 0 ? 140 : 40 }}
        data={pendingOrders}
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

      {zones.length > 0 && (
        <View style={[
          styles.batchClaimBar,
          {
            backgroundColor: colors.backgroundCard,
            borderTopColor: colors.border,
            paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 16,
          }
        ]}>
          <Text style={[styles.batchClaimText, { color: colors.textSecondary }]}>
            Tap a zone to claim dispatches in that area:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
            {zones.map((zone) => {
              const zoneOrders = pendingOrders.filter((o) => o.zone === zone);
              const zoneFee = zoneOrders.reduce((sum, o) => sum + (Number(o.base_price || 0) + Number(o.distance_fee || 0) + Number(o.surge_fee || 0) || Number(o.delivery_fee || 0)), 0);

              return (
                <TouchableOpacity
                  key={zone}
                  style={[styles.batchClaimBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (zoneOrders.length > 0 && zoneOrders[0]) {
                      setSelectedOrder(zoneOrders[0]);
                    }
                  }}
                >
                  <Text style={[styles.batchClaimZone, { color: colors.textOnPrimary }]}>{zone}</Text>
                  <Text style={[styles.batchClaimMeta, { color: colors.textOnPrimary }]}>
                    {zoneOrders.length} dispatch{zoneOrders.length !== 1 ? "es" : ""} · GH¢ {zoneFee.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <DeliveryDetailsBottomSheet
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={async (order, status) => {
          if (!order?.id) return;
          console.log(`[JobQueue] Action triggered | order=${order.orderId || order.id} status=${status}`);

          const nextStatus = {
            pending: "assigned",
            assigned: "picked_up",
            picked_up: "in_transit",
            in_transit: "delivered",
          }[status];

          if (!nextStatus) {
            console.log(`[JobQueue] No next status for ${status}, closing sheet`);
            setSelectedOrder(null);
            return;
          }

          if (nextStatus === "delivered") {
            console.log(`[JobQueue] Navigating to DeliveryClosure | orderId=${order.id}`);
            setSelectedOrder(null);
            navigation.navigate("DeliveryClosure", { orderId: order.id });
            return;
          }

          try {
            console.log(`[JobQueue] Advancing ${order.orderId || order.id} : ${status} → ${nextStatus}`);
            setLoading(true);
            const updates = { status: nextStatus, updated_at: new Date().toISOString() };

            if (nextStatus === "assigned") {
              const deliveryPin = generateDeliveryPin();
              const { count } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("rider_id", user.id)
                .in("status", ["assigned", "picked_up", "in_transit"]);
              const seq = (count || 0) + 1;
              updates.rider_id = user.id;
              updates.route_sequence = seq;
              updates.delivery_pin = deliveryPin;
              console.log(`[JobQueue] Assigned | pin=${deliveryPin} routeSequence=${seq}`);
            }

            const { error } = await supabase
              .from("orders")
              .update(updates)
              .eq("id", order.id);

            if (error) {
              console.error(`[JobQueue] Status advance failed for ${order.orderId || order.id}:`, error.message);
              throw error;
            }
            console.log(`[JobQueue] Update success | order=${order.orderId || order.id} newStatus=${nextStatus}`);
            fetchAvailable();
          } catch (err) {
            console.error(`[JobQueue] Status advance error for ${order.orderId || order.id}:`, err);
            alert(`Failed to update order status: ${err.message}`);
          } finally {
            setLoading(false);
            setSelectedOrder(null);
          }
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
