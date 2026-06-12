import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Layers, Shirt } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";
import { useAuth } from "../../context/AuthContext";
import { query, where, collection, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

const SELECTOR_TABS = [
  { key: "deliveries", label: "Deliveries", Icon: Layers },
  { key: "custom_orders", label: "Custom Designs", Icon: Shirt },
];

function TabButton({ label, active, onPress, Icon, colors, isDarkMode, count }) {
  const ui = getTabButtonStyles(active, colors, isDarkMode);

  return (
    <TouchableOpacity
      style={ui.tabButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {Icon && (
        <Icon
          size={14}
          strokeWidth={active ? 2.5 : 2}
          color={active ? colors.textOnPrimary : colors.textMuted}
        />
      )}
      <Text style={ui.tabButtonText} numberOfLines={1}>
        {label}
      </Text>
      <Text style={ui.countBadge}>{count || 0}</Text>
    </TouchableOpacity>
  );
}

export default function TabSelector({ activeTab = "deliveries", onTabChange }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const [counts, setCounts] = useState({ deliveries: 0, custom_orders: 0 });

  // Safety fallback for Firebase uid schema pattern matching
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    // FIX: Server-side compound execution filter. Much lower data usage!
    const deliveriesQuery = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      where("status", "in", ["assigned", "picked_up", "in_transit", "delivered"]),
      limit(100)
    );

    const unsubDeliveries = onSnapshot(
      deliveriesQuery,
      (snap) => {
        setCounts((prev) => ({ ...prev, deliveries: snap.size }));
      },
      (err) => console.warn("[TabSelector] deliveries listen failed:", err.message)
    );

    return () => unsubDeliveries();
  }, [userId]);

  const ui = getContainerStyles(colors, isDarkMode);

  return (
    <View style={ui.tabContainer}>
      {SELECTOR_TABS.map((tab) => (
        <TabButton
          key={tab.key}
          label={tab.label}
          active={activeTab === tab.key}
          onPress={() => onTabChange?.(tab.key)}
          Icon={tab.Icon}
          colors={colors}
          isDarkMode={isDarkMode}
          count={counts[tab.key] || 0}
        />
      ))}
    </View>
  );
}

/**
 * Optimized Style Computations (Declared outside render tree loops)
 */
const getTabButtonStyles = (active, colors, isDarkMode) => ({
  tabButton: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: active ? colors.primary : "transparent",
    borderWidth: active ? 1 : 0,
    borderColor: isDarkMode ? colors.primary : colors.primaryAlpha || colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: active ? "800" : "700",
    letterSpacing: -0.2,
    color: active ? colors.textOnPrimary : colors.textMuted,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: active ? colors.textOnPrimary : colors.textSecondary || colors.textMuted,
    marginLeft: 2,
  },
});

const getContainerStyles = (colors, isDarkMode) => ({
  tabContainer: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 100,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow || "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: isDarkMode ? 0.2 : 0.02,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
});