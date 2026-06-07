import React from "react";
import { View, Text, TouchableOpacity, Dimensions, Platform } from "react-native";
import { FileDown, Clock, PackageCheck, FileX2 } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

// Tab Data Profile mapped with semantic tokens and contextual icon indicators
const TABS = [
  { key: "requests", label: "Requests", Icon: FileDown },
  { key: "active", label: "Active", Icon: Clock },
  { key: "completed", label: "Completed", Icon: PackageCheck },
  { key: "cancelled", label: "Cancelled", Icon: FileX2 },
];

const { width } = Dimensions.get("window");

export default function RiderTabBar({ activeTab = "requests", onTabChange }) {
  const { colors, isDarkMode } = useThemeStore();

  // --- Dynamic Style Matrix mapped direct to application theme context ---
  const ui = {
    // Unifies the tabs into a single floating pill container
    container: {
      flexDirection: "row",
      marginTop: 20,
      marginBottom: 16,
      marginHorizontal: 16,
      padding: 6,
      borderRadius: 100,
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.25 : 0.03,
          shadowRadius: 8,
        },
        android: { elevation: 3 },
      }),
    },
    
    // Static base for the sliding pill
    tabButton: {
      flexDirection: "row",
      height: 40,
      borderRadius: 100,
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 10,
    },
    
    // Dynamic styles for the selected tab pill
    activeTabButton: {
      flex: 1.2, // Slightly expands active tab for emphasis
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: isDarkMode ? colors.primary : colors.primaryAlpha,
    },
    
    // Dynamic styles for inactive tab nodes
    inactiveTabButton: {
      flex: 1,
      backgroundColor: "transparent",
    },

    // Typography hierarchy mapping
    tabButtonText: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: -0.2,
      color: colors.textSecondary,
    },
    
    activeTabButtonText: {
      fontWeight: "800",
      color: colors.textOnPrimary,
    },
  };

  return (
    <View style={ui.container}>
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.key;
        const Icon = tab.Icon;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              ui.tabButton,
              isSelected ? ui.activeTabButton : ui.inactiveTabButton,
            ]}
            onPress={() => onTabChange?.(tab.key)}
            activeOpacity={0.85}
          >
            {Icon && (
              <Icon
                size={15}
                strokeWidth={isSelected ? 2.5 : 2}
                color={isSelected ? colors.textOnPrimary : colors.textMuted}
              />
            )}
            <Text
              style={[
                ui.tabButtonText,
                isSelected && ui.activeTabButtonText,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}