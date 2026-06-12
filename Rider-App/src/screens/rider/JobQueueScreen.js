import React, { useState, useEffect, useRef } from "react";
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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import useOrderStore, { GEOFENCE_ZONES } from "../../store/orderStore";
import notificationService from "../../services/notificationService";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { Package, Layers } from "lucide-react-native";
import RiderOrderCard from "../../components/rider/RiderOrderCard";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";

export default function JobQueueScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();

  // 🔑 FIX 1: Extract upgraded real-time streaming tools
  const pendingOrders = useOrderStore((state) => state.pendingOrders);
  const activeOrders = useOrderStore((state) => state.activeOrders);
  const subscribeToPendingOrders = useOrderStore((state) => state.subscribeToPendingOrders);
  const cleanListener = useOrderStore((state) => state.cleanListener);

  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const userId = user?.uid;

  // 🔑 FIX 2: Hook cleanly into your unified reactive stream listener
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToPendingOrders();
    setLoading(false);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      cleanListener("pending");
    };
  }, [userId, subscribeToPendingOrders, cleanListener]);

  // Native notification registration
  useEffect(() => {
    notificationService.setupHandler();
    notificationService.ensureChannel();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsub = notificationService.listenForNewOrders((incomingOrder) => {
      notificationService.scheduleLocalNotification({
        title: incomingOrder.title || "New Order Available",
        body: incomingOrder.body || `Order #${incomingOrder.orderIdDisplay || incomingOrder.orderId} is ready for pickup`,
        data: incomingOrder.data || { url: "JobQueueTab", orderId: incomingOrder.orderId },
      });
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [userId]);

  const generateDeliveryPin = () => Math.floor(1000 + Math.random() * 9000).toString();

  // Parse dynamically available zones
  const zones = GEOFENCE_ZONES.filter((z) =>
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
        showsVerticalScrollIndicator={false}
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
            Tap a zone to inspect dispatches in that area:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
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
          if (!order?.id || !userId) return;

          const nextStatus = {
            pending: "assigned",
            assigned: "picked_up",
            picked_up: "in_transit",
            in_transit: "delivered",
          }[status];

          if (!nextStatus) {
            setSelectedOrder(null);
            return;
          }

          if (nextStatus === "delivered") {
            setSelectedOrder(null);
            navigation.navigate("DeliveryClosure", { orderId: order.id });
            return;
          }

          try {
            setSelectedOrder(null);
            setLoading(true);

            const updates = { 
              status: nextStatus, 
              updated_at: serverTimestamp() 
            };

            if (nextStatus === "assigned") {
              // 🔑 FIX 3: Calculate the route sequence locally from your reactive activeOrders state slice
              // This removes the slow, un-indexed Firestore getDocs() query roundtrip
              const currentActiveRouteCount = activeOrders.length;
              
              updates.rider_id = userId;
              updates.route_sequence = currentActiveRouteCount + 1;
              updates.delivery_pin = generateDeliveryPin();
            }

            await updateDoc(doc(db, "orders", order.id), updates);
          } catch (err) {
            console.error(`[JobQueue] Status advance error for ${order.id}:`, err);
            Alert.alert("Status Error", `Failed to update order status: ${err.message}`);
          } finally {
            setLoading(false);
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
  horizontalScroll: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 }
});