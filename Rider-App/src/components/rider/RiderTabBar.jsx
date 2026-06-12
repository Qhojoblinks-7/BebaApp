import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { FileDown, Clock, PackageCheck, FileX2 } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";
import { useAuth } from "../../context/AuthContext";
import { query, where, collection, onSnapshot, limit } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

const TABS = [
  { key: "requests", label: "Requests", Icon: FileDown },
  { key: "active", label: "Active", Icon: Clock },
  { key: "completed", label: "Completed", Icon: PackageCheck },
  { key: "cancelled", label: "Cancelled", Icon: FileX2 },
];

export default function RiderTabBar({ activeTab = "requests", onTabChange }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();

  const [counts, setCounts] = useState({
    requests: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });

  // FIX: Safety check mapping to correct Firebase token uid string property
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    const unsubs = [];

    const requestsQuery = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      where("status", "==", "assigned"),
      limit(100)
    );

    const activeQuery = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      where("status", "in", ["picked_up", "in_transit"]),
      limit(100)
    );

    const completedQuery = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      where("status", "==", "delivered"),
      limit(100)
    );

    const cancelledQuery = query(
      collection(db, "orders"),
      where("rider_id", "==", userId),
      where("status", "==", "cancelled"),
      limit(100)
    );

    const listen = (q, key) => {
      const unsub = onSnapshot(
        q,
        (snap) => setCounts((prev) => ({ ...prev, [key]: snap.size })),
        (err) => console.warn(`[RiderTabBar] ${key} listen failed:`, err.message)
      );
      unsubs.push(unsub);
    };

    listen(requestsQuery, "requests");
    listen(activeQuery, "active");
    listen(completedQuery, "completed");
    listen(cancelledQuery, "cancelled");

    return () => unsubs.forEach((fn) => fn());
  }, [userId]);

  const ui = getContainerStyles(colors, isDarkMode);

  return (
    <View style={ui.container}>
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.key;
        const Icon = tab.Icon;
        const buttonStyles = getTabButtonStyles(isSelected, colors, isDarkMode);

        return (
          <TouchableOpacity
            key={tab.key}
            style={buttonStyles.tabButton}
            onPress={() => onTabChange?.(tab.key)}
            activeOpacity={0.85}
          >
            {Icon && (
              <Icon
                size={14}
                strokeWidth={isSelected ? 2.5 : 2}
                color={isSelected ? colors.textOnPrimary : colors.textMuted}
              />
            )}
            <Text style={buttonStyles.tabButtonText} numberOfLines={1}>
              {tab.label}
            </Text>
            
            {/* Added count feedback badge indicator layout internally inside tab rows */}
            <Text style={buttonStyles.countText}>
              {counts[tab.key] || 0}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Isolated Pure Stylesheet Constructor Matrix
 */
const getContainerStyles = (colors, isDarkMode) => ({
  container: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    padding: 4,
    borderRadius: 100,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow || "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDarkMode ? 0.25 : 0.03,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
});

const getTabButtonStyles = (isSelected, colors, isDarkMode) => ({
  tabButton: {
    flex: 1, // FIX: Uniform balanced tab distributions to prevent unexpected layouts
    flexDirection: "row",
    height: 38,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4,
    backgroundColor: isSelected ? colors.primary : "transparent",
    borderWidth: isSelected ? 1 : 0,
    borderColor: isDarkMode ? colors.primary : colors.primaryAlpha || colors.primary,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: isSelected ? "800" : "700",
    letterSpacing: -0.2,
    color: isSelected ? colors.textOnPrimary : colors.textSecondary,
  },
  countText: {
    fontSize: 10,
    fontWeight: "800",
    color: isSelected ? colors.textOnPrimary : colors.textMuted,
    marginLeft: 1,
  }
});