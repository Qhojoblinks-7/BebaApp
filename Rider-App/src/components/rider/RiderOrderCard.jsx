import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Box, MapPin } from "lucide-react-native";

const STATUS_MAP = {
  pending: {
    label: "New Request",
    color: "#64748b",
    bg: "#f1f5f9",
    border: "#e2e8f0",
  },
  assigned: {
    label: "Rider Confirmed",
    color: "#38bdf8",
    bg: "#f0f9ff",
    border: "#bae6fd",
  },
  picked_up: {
    label: "Picked Up",
    color: "#a78bfa",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  in_transit: {
    label: "In Transit",
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  delivered: {
    label: "Delivered",
    color: "#10b981",
    bg: "#f0fdf4",
    border: "#a7f3d0",
  },
  cancelled: {
    label: "Cancelled",
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
  },
};

export default function RiderOrderCard({ order, onPress }) {
  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;

  const fmt = (d) => {
    if (!d) return "---";
    const date = new Date(d);
    if (isNaN(date)) return "---";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(order)}
      activeOpacity={0.9}
    >
      <View style={[styles.accentTop, { backgroundColor: status.color }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.iconBox}>
            <Box size={22} color="#FA6432" fill="#FA6432" strokeWidth={1.5} />
          </View>
          <View style={styles.idBlock}>
            <Text style={styles.idLabel}>Waybill</Text>
            <Text style={styles.idText}>{order.order_id || "---"}</Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.routeEnd}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={styles.routeAddr} numberOfLines={1}>
              {order.pickup_address || "Pickup TBC"}
            </Text>
          </View>
          <View style={styles.arrowCol}>
            <Text style={styles.arrow}>→</Text>
          </View>
          <View style={[styles.routeEnd, styles.routeEndRight]}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={styles.routeAddr} numberOfLines={1}>
              {order.delivery_address || "Drop-off TBC"}
            </Text>
          </View>
        </View>

{!!order.delivery_fee ? (
          <View style={styles.footerRow}>
            <Text style={styles.feeLabel}>Fee</Text>
            <Text style={styles.feeValue}>GH¢ {Number(order.delivery_fee).toFixed(2)}</Text>
          </View>
        ) : null}

        {order.base_price && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Base: GH¢ {Number(order.base_price).toFixed(2)}</Text>
            {order.distance_fee > 0 && <Text style={styles.metaLabel}>Distance: GH¢ {Number(order.distance_fee).toFixed(2)}</Text>}
            {order.surge_fee > 0 && <Text style={styles.metaLabel}>Surge: GH¢ {Number(order.surge_fee).toFixed(2)}</Text>}
          </View>
        )}

        {order.status === "in_transit" && order.delivery_pin ? (
          <View style={styles.pinRow}>
            <Text style={styles.pinLabel}>Delivery PIN</Text>
            <Text style={styles.pinValue}>{order.delivery_pin}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#115e59",
    borderRadius: 20,
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  accentTop: { height: 4 },
  body: { padding: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  idBlock: { flex: 1 },
  idLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff80",
    letterSpacing: 0.5,
  },
  idText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  routeEnd: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  routeEndRight: { justifyContent: "flex-end" },
  routeAddr: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    maxWidth: 110,
  },
  arrowCol: { paddingHorizontal: 4 },
  arrow: { fontSize: 18, color: "#ffffff80", fontWeight: "300" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  feeLabel: { fontSize: 11, fontWeight: "600", color: "#ffffff80" },
  feeValue: { fontSize: 14, fontWeight: "800", color: "#f59e0b" },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  metaLabel: { fontSize: 9, fontWeight: "500", color: "#ffffff60" },
  pinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff80",
    textTransform: "uppercase",
  },
  pinValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#34d399",
    letterSpacing: 2,
  },
});
