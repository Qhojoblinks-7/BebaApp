import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useThemeStore } from "../../store/themeStore";

const TABS = [
  { key: "requests", label: "Requests" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function RiderTabBar({ activeTab = "requests", onTabChange }) {
  const { colors } = useThemeStore();

  const staticStyles = StyleSheet.create({
    container: {
      flexDirection: "row",
      borderBottomWidth: 1,
      marginTop: 20,
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
    },
    activeTabButton: {
      borderBottomWidth: 2,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: "700",
    },
    activeTabButtonText: {
      fontWeight: "800",
    },
  });

  const themedStyles = {
    containerBorder: {
      borderColor: colors.border,
    },
    activeTabBorder: {
      borderColor: colors.primary,
    },
    tabButtonText: {
      color: colors.textMuted,
    },
    activeTabButtonText: {
      color: colors.primary,
    },
  };

  return (
    <View style={[staticStyles.container, themedStyles.containerBorder]}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            staticStyles.tabButton,
            activeTab === tab.key && staticStyles.activeTabButton,
            activeTab === tab.key && themedStyles.activeTabBorder,
          ]}
          onPress={() => onTabChange?.(tab.key)}
        >
          <Text
            style={[
              staticStyles.tabButtonText,
              themedStyles.tabButtonText,
              activeTab === tab.key && staticStyles.activeTabButtonText,
              activeTab === tab.key && themedStyles.activeTabButtonText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}