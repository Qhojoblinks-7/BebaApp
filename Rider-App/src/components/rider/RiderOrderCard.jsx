import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Box, MapPin } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

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

const staticStyles = StyleSheet.create({
  accentTop: { height: 4 },
  body: { padding: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  idBlock: { flex: 1 },
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
  arrowCol: { paddingHorizontal: 4 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  instructionsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  pinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

export default function RiderOrderCard({ order, onPress }) {
  const { colors } = useThemeStore();
  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;

  const themedStyles = {
    card: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      marginBottom: 12,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: { elevation: 5 },
      }),
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.textOnPrimary,
      justifyContent: "center",
      alignItems: "center",
    },
    idLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textOnPrimary + "80",
      letterSpacing: 0.5,
    },
    idText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.textOnPrimary,
      letterSpacing: -0.5,
    },
    routeAddr: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textOnPrimary,
      maxWidth: 110,
    },
    arrow: { fontSize: 18, color: colors.textOnPrimary + "80", fontWeight: "300" },
    feeLabel: { fontSize: 11, fontWeight: "600", color: colors.textOnPrimary + "80" },
    feeValue: { fontSize: 14, fontWeight: "800", color: "#f59e0b" },
    metaLabel: { fontSize: 9, fontWeight: "500", color: colors.textOnPrimary + "60" },
    instructionsLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: "#f59e0b",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    instructionsText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textOnPrimary + "90",
      lineHeight: 16,
    },
    pinLabel: {
      fontSize: 10,
      fontWeight: "900",
      color: colors.textOnPrimary + "80",
      textTransform: "uppercase",
    },
    pinValue: {
      fontSize: 18,
      fontWeight: "900",
      color: "#34d399",
      letterSpacing: 2,
    },
    instructionsBorder: {
      borderTopColor: colors.textOnPrimary + "20",
    },
    pinBorder: {
      borderTopColor: colors.border,
    },
  };

  return (
    <TouchableOpacity
      style={themedStyles.card}
      onPress={() => onPress?.(order)}
      activeOpacity={0.9}
    >
      <View style={[staticStyles.accentTop, { backgroundColor: status.color }]} />

      <View style={staticStyles.body}>
        <View style={staticStyles.topRow}>
          <View style={themedStyles.iconBox}>
            <Box size={22} color="#FA6432" fill="#FA6432" strokeWidth={1.5} />
          </View>
          <View style={staticStyles.idBlock}>
            <Text style={themedStyles.idLabel}>Waybill</Text>
            <Text style={themedStyles.idText}>{order.order_id || "---"}</Text>
          </View>
          <View
            style={[
              staticStyles.badge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <Text style={[staticStyles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={staticStyles.routeRow}>
          <View style={staticStyles.routeEnd}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={themedStyles.routeAddr} numberOfLines={1}>
              {order.pickup_address || "Pickup TBC"}
            </Text>
          </View>
          <View style={staticStyles.arrowCol}>
            <Text style={themedStyles.arrow}>→</Text>
          </View>
          <View style={[staticStyles.routeEnd, staticStyles.routeEndRight]}>
            <MapPin size={12} color="#94a3b8" />
            <Text style={themedStyles.routeAddr} numberOfLines={1}>
              {order.delivery_address || "Drop-off TBC"}
            </Text>
          </View>
        </View>

        {!!order.delivery_fee ? (
          <View style={staticStyles.footerRow}>
            <Text style={themedStyles.feeLabel}>Fee</Text>
            <Text style={themedStyles.feeValue}>
              GH¢ {Number(order.delivery_fee).toFixed(2)}
            </Text>
          </View>
        ) : null}

        {order.base_price && (
          <View style={staticStyles.metaRow}>
            <Text style={themedStyles.metaLabel}>
              Base: GH¢ {Number(order.base_price).toFixed(2)}
            </Text>
            {order.distance_fee > 0 && (
              <Text style={themedStyles.metaLabel}>
                Distance: GH¢ {Number(order.distance_fee).toFixed(2)}
              </Text>
            )}
            {order.surge_fee > 0 && (
              <Text style={themedStyles.metaLabel}>
                Surge: GH¢ {Number(order.surge_fee).toFixed(2)}
              </Text>
            )}
          </View>
        )}

        {order.delivery_instructions ? (
          <View style={[staticStyles.instructionsRow, themedStyles.instructionsBorder]}>
            <Text style={themedStyles.instructionsLabel}>Note:</Text>
            <Text style={themedStyles.instructionsText}>
              {order.delivery_instructions}
            </Text>
          </View>
        ) : null}

        {order.status === "in_transit" && order.delivery_pin ? (
          <View style={[staticStyles.pinRow, themedStyles.pinBorder]}>
            <Text style={themedStyles.pinLabel}>Delivery PIN</Text>
            <Text style={themedStyles.pinValue}>{order.delivery_pin}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}