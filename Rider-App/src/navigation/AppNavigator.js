import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
 * 2. Main Tab Layout
 */
function TabNavigator() {
  const { colors } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBorder,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="JobQueueTab"
        component={JobQueueScreen}
        options={{
          tabBarLabel: "Job Board",
          tabBarIcon: ({ color, size }) => (
            <Briefcase size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="ActiveDeliveryTab"
        component={ActiveDeliveryStack}
        options={{
          tabBarLabel: "Manifest",
          tabBarIcon: ({ color, size }) => <Route size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="FinancesTab"
        component={FinancesScreen}
        options={{
          tabBarLabel: "Finances",
          tabBarIcon: ({ color, size }) => (
            <DollarSign size={size} color={color} />
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="BudgetBreakdown"
          component={BudgetBreakdownScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="SmartInsights"
          component={SmartInsightsScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="BudgetInsightDetail"
          component={BudgetInsightDetailScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="ManualCashFlow"
          component={ManualCashFlowScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="QuickAddEntry"
          component={QuickAddEntryScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="DeliveryHistory"
          component={DeliveryHistoryScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="NotificationsSettings"
          component={NotificationsSettingsScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="PrivacySecurity"
          component={PrivacySecurityScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="Preferences"
          component={PreferencesScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="TermsPrivacyPolicy"
          component={TermsPrivacyPolicyScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            animation: "slide_from_right",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
