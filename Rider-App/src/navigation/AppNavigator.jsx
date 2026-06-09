import React from "react";
import { Platform, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Briefcase, Route, DollarSign, User } from "lucide-react-native";
import { useThemeStore } from "../store/themeStore";

// Core Screens
import DashboardScreen from "../screens/rider/Dashboard";
import JobQueueScreen from "../screens/rider/JobQueueScreen";
import ActiveDeliveryScreen from "../screens/rider/ActiveDeliveryScreen";
import DeliveryClosureScreen from "../screens/rider/DeliveryClosureScreen";
import NotificationsScreen from "../screens/rider/NotificationsScreen";
import NotificationsSettingsScreen from "../screens/rider/NotificationsSettingsScreen";
import PrivacySecurityScreen from "../screens/rider/PrivacySecurityScreen";
import PreferencesScreen from "../screens/rider/PreferencesScreen";
import HelpSupportScreen from "../screens/rider/HelpSupportScreen";
import TermsPrivacyPolicyScreen from "../screens/rider/TermsPrivacyPolicyScreen";
import FinancesScreen from "../screens/rider/FinancesScreen";
import ProfileScreen from "../screens/rider/ProfileScreen";
import BudgetBreakdownScreen from "../screens/rider/BudgetBreakdownScreen";
import SmartInsightsScreen from "../screens/rider/SmartInsightsScreen";
import BudgetInsightDetailScreen from "../screens/rider/BudgetInsightDetailScreen";
import ReportsScreen from "../screens/rider/ReportsScreen";
import ManualCashFlowScreen from "../screens/rider/ManualCashFlowScreen";
import QuickAddEntryScreen from "../screens/rider/QuickAddEntryScreen";
import DeliveryHistoryScreen from "../screens/rider/DeliveryHistoryScreen";
import DeliveryDetailScreen from "../screens/rider/DeliveryDetailScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * 1. Active Itinerary Stack
 */
function ActiveDeliveryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ActiveDeliveryHome" component={ActiveDeliveryScreen} />
      <Stack.Screen name="DeliveryClosure" component={DeliveryClosureScreen} />
    </Stack.Navigator>
  );
}

/**
 * 2. Main Premium Floating Tab Layout
 */
function TabNavigator() {
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  // Compute total safe height padding to isolate device native home indicators
  const bottomBarHeight = Platform.OS === "ios" ? 64 + Math.max(insets.bottom - 8, 0) : 68;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? Math.max(insets.bottom, 12) : 16,
          left: 16,
          right: 16,
          backgroundColor: colors.backgroundCard,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: colors.borderLight,
          borderTopColor: colors.borderLight,
          borderRadius: 24,
          height: bottomBarHeight,
          paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom / 2, 8) : 12,
          paddingTop: 10,
          elevation: 8,
          shadowColor: colors.shadow || "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDarkMode ? 0.35 : 0.06,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Home size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      <Tab.Screen
        name="JobQueueTab"
        component={JobQueueScreen}
        options={{
          tabBarLabel: "Hub",
          tabBarIcon: ({ color, focused }) => (
            <Briefcase size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      <Tab.Screen
        name="ActiveDeliveryTab"
        component={ActiveDeliveryStack}
        options={{
          tabBarLabel: "Manifest",
          tabBarIcon: ({ color, focused }) => (
            <Route size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      <Tab.Screen
        name="FinancesTab"
        component={FinancesScreen}
        options={{
          tabBarLabel: "Ledger",
          tabBarIcon: ({ color, focused }) => (
            <DollarSign size={20} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * 3. Master App Root Navigator
 */
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 220
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ animation: "slide_from_bottom" }}
        />
        
        <Stack.Screen name="BudgetBreakdown" component={BudgetBreakdownScreen} />
        <Stack.Screen name="SmartInsights" component={SmartInsightsScreen} />
        <Stack.Screen name="BudgetInsightDetail" component={BudgetInsightDetailScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="ManualCashFlow" component={ManualCashFlowScreen} />
        <Stack.Screen name="QuickAddEntry" component={QuickAddEntryScreen} />
        <Stack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} />
        <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
        <Stack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="TermsPrivacyPolicy" component={TermsPrivacyPolicyScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}