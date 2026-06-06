import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useThemeStore } from "../../store/themeStore";

function TabButton({ label, active, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        active && styles.activeTabButton,
        { borderBottomColor: active ? colors.primary : colors.border },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabButtonText,
          { color: active ? colors.primary : colors.textMuted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTabButton: { borderBottomWidth: 2 },
  tabButtonText: { fontSize: 14, fontWeight: "700" },
});

export default function TabSelector({ activeTab = "deliveries", onTabChange }) {
  const { colors } = useThemeStore();

  return (
    <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
      <TabButton
        label="Deliveries"
        active={activeTab === "deliveries"}
        onPress={() => onTabChange?.("deliveries")}
        colors={colors}
      />
    </View>
  );
}