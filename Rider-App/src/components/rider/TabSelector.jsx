import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Layers, Shirt } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

const SELECTOR_TABS = [
  { key: "deliveries", label: "Deliveries", Icon: Layers },
  { key: "custom_orders", label: "Custom Designs", Icon: Shirt },
];

function TabButton({ label, active, onPress, Icon, colors, isDarkMode }) {
  const ui = {
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
      borderColor: isDarkMode ? colors.primary : colors.primaryAlpha,
    },
    tabButtonText: {
      fontSize: 12,
      fontWeight: active ? "800" : "700",
      letterSpacing: -0.2,
      color: active ? colors.textOnPrimary : colors.textMuted,
    },
  };

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
    </TouchableOpacity>
  );
}

export default function TabSelector({ activeTab = "deliveries", onTabChange }) {
  const { colors, isDarkMode } = useThemeStore();

  const ui = {
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
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDarkMode ? 0.2 : 0.02,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
  };

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
        />
      ))}
    </View>
  );
}