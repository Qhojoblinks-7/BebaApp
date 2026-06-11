import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Box, MapPin, CornerDownRight } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";
import { useAuth } from "../../context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

// Centered status map utilizing pure text tokens for real-time light/dark adaptation
const STATUS_TOKENS = {
  pending: { label: "New Request", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" },
  assigned: { label: "Confirmed", color: "#0284c7", bg: "rgba(2, 132, 199, 0.12)" },
  picked_up: { label: "Picked Up", color: "#7c3aed", bg: "rgba(124, 58, 237, 0.12)" },
  in_transit: { label: "In Transit", color: "#d97706", bg: "rgba(217, 119, 6, 0.12)" },
  delivered: { label: "Delivered", color: "#059669", bg: "rgba(5, 150, 105, 0.12)" },
  cancelled: { label: "Cancelled", color: "#dc2626", bg: "rgba(220, 38, 38, 0.12)" },
};

export default function RiderOrderCard({ order: initialOrder, onPress }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  
  const [order, setOrder] = useState(initialOrder || null);

  // FIX: Safely map user string token identifiers matching Firebase Auth schema definitions
  const userId = user?.uid || user?.id;

  useEffect(() => {
    // Sync local state if parent prop object updates directly via list updates
    if (initialOrder) {
      setOrder(initialOrder);
    }
  }, [initialOrder]);

  useEffect(() => {
    if (!initialOrder?.id || !userId) return;
    
    // Fallback real-time sync wrapper loop
    const unsub = onSnapshot(
      doc(db, "orders", initialOrder.id),
      (snap) => {
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() });
        }
      },
      (err) => console.warn("[RiderOrderCard] single snapshot fetch failed:", err.message)
    );

    return () => unsub();
  }, [initialOrder?.id, userId]);

  if (!order) return null;
  const status = STATUS_TOKENS[order.status] || STATUS_TOKENS.pending;

  // FIX: Stylesheet allocations are executed safely via externalized memory-stable blocks
  const ui = getCardStyles(colors, isDarkMode, status);

  return (
    <TouchableOpacity
      style={ui.card}
      onPress={() => onPress?.(order)}
      activeOpacity={0.85}
    >
      <View style={ui.accentLine} />

      <View style={ui.body}>
        {/* Card Header metadata info */}
        <View style={ui.topRow}>
          <View style={ui.metaLeft}>
            <View style={ui.iconFrame}>
              <Box size={20} color="#FA6432" strokeWidth={2} />
            </View>
            <View>
              <Text style={ui.idLabel}>Waybill ID</Text>
              <Text style={ui.idText}>{order.order_id || "---"}</Text>
            </View>
          </View>
          <View style={ui.badge}>
            <Text style={ui.badgeText}>{status.label}</Text>
          </View>
        </View>

        {/* Route Details Line Array */}
        <View style={ui.routeContainer}>
          <View style={ui.routeNode}>
            <MapPin size={15} color={colors.primary} />
            <Text style={ui.nodeText} numberOfLines={1}>
              {order.pickup_address || "Pickup location unassigned"}
            </Text>
          </View>
          
          <View style={ui.routeNodeDrop}>
            <CornerDownRight size={14} color={colors.textDisabled} />
            <Text style={ui.nodeTextDrop} numberOfLines={1}>
              {order.delivery_address || "Drop-off destination unassigned"}
            </Text>
          </View>
        </View>

        {/* Financial Breakdown Section */}
        {order.base_price || order.delivery_fee ? (
          <>
            <View style={ui.divider} />
            <View style={ui.footer}>
              <View style={ui.breakdown}>
                {!!order.base_price && (
                  <Text style={ui.breakdownText}>
                    Base: GH¢ {Number(order.base_price).toFixed(2)}
                  </Text>
                )}
                {Number(order.distance_fee) > 0 && (
                  <Text style={ui.breakdownText}>
                    Distance: +GH¢ {Number(order.distance_fee).toFixed(2)}
                  </Text>
                )}
                {Number(order.surge_fee) > 0 && (
                  <Text style={ui.breakdownText}>
                    Surge: +GH¢ {Number(order.surge_fee).toFixed(2)}
                  </Text>
                )}
              </View>

              {!!order.delivery_fee && (
                <View style={ui.payoutSection}>
                  <Text style={ui.payoutLabel}>Payout</Text>
                  <Text style={ui.payoutValue}>
                    GH¢ {Number(order.delivery_fee).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : null}

        {/* Conditional Contextual Insets */}
        {order.delivery_instructions ? (
          <View style={ui.instructionBox}>
            <Text style={ui.instructionTitle}>Rider Instructions</Text>
            <Text style={ui.instructionBody}>{order.delivery_instructions}</Text>
          </View>
        ) : null}

        {order.status === "in_transit" && order.delivery_pin ? (
          <View style={ui.securePinBox}>
            <Text style={ui.securePinLabel}>Required Release PIN</Text>
            <Text style={ui.securePinValue}>{order.delivery_pin}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Externalized Stylesheet Matrix for Layout Performance
 */
const getCardStyles = (colors, isDarkMode, status) => ({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow || "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDarkMode ? 0.25 : 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },
  accentLine: {
    height: 4,
    width: "30%",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginLeft: 20,
    backgroundColor: status.color,
  },
  body: {
    padding: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconFrame: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: isDarkMode ? "rgba(250, 100, 50, 0.1)" : "#fff0eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: "rgba(250, 100, 50, 0.2)",
  },
  idLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  idText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: status.bg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: status.color,
  },
  routeContainer: {
    gap: 12,
    marginBottom: 16,
  },
  routeNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeNodeDrop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 2,
  },
  nodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    flex: 1,
  },
  nodeTextDrop: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  breakdown: {
    gap: 2,
  },
  breakdownText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.textMuted,
  },
  payoutSection: {
    alignItems: "flex-end",
  },
  payoutLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  payoutValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.warning || "#eab308",
    letterSpacing: -0.5,
  },
  instructionBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning || "#eab308",
  },
  instructionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  instructionBody: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    lineHeight: 16,
  },
  securePinBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.15)",
  },
  securePinLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.success || "#10b981",
  },
  securePinValue: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.success || "#10b981",
    letterSpacing: 3,
  },
});