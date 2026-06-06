import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Briefcase, Route, DollarSign } from "lucide-react-native";

// Core Screens
import DashboardScreen from "../screens/rider/Dashboard";
import JobQueueScreen from "../screens/rider/JobQueueScreen";
import ActiveDeliveryScreen from "../screens/rider/ActiveDeliveryScreen";
import DeliveryClosureScreen from "../screens/rider/DeliveryClosureScreen";
import NotificationsScreen from "../screens/rider/NotificationsScreen";
import FinancesScreen from "../screens/rider/FinancesScreen";
import BudgetBreakdownScreen from "../screens/rider/BudgetBreakdownScreen";
import SmartInsightsScreen from "../screens/rider/SmartInsightsScreen";
import BudgetInsightDetailScreen from "../screens/rider/BudgetInsightDetailScreen";
import ReportsScreen from "../screens/rider/ReportsScreen";
import ManualCashFlowScreen from "../screens/rider/ManualCashFlowScreen";
import QuickAddEntryScreen from "../screens/rider/QuickAddEntryScreen";

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#115e59",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
