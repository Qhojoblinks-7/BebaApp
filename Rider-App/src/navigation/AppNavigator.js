import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Briefcase, Route } from 'lucide-react-native';

// Core Screens
import DashboardScreen from '../screens/rider/Dashboard';
import JobQueueScreen from '../screens/rider/JobQueueScreen';
import ActiveDeliveryScreen from '../screens/rider/ActiveDeliveryScreen';
import DeliveryClosureScreen from '../screens/rider/DeliveryClosureScreen';
import NotificationsScreen from '../screens/rider/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * 1. Active Itinerary Stack
 * We remove the native header from both screens so your custom layouts 
 * can render all the way up to the phone's native status bar.
 */
function ActiveDeliveryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="ActiveDeliveryHome" 
        component={ActiveDeliveryScreen} 
      />
      <Stack.Screen 
        name="DeliveryClosure" 
        component={DeliveryClosureScreen} 
      />
    </Stack.Navigator>
  );
}

/**
 * 2. Main Tab Layout
 * Global layouts manage bottom triggers. Header components are disabled entirely.
 */
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Disables the generic top header globally for all tabs
        tabBarActiveTintColor: '#115e59', 
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        }
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      
      <Tab.Screen 
        name="JobQueueTab" 
        component={JobQueueScreen} 
        options={{
          tabBarLabel: 'Job Board',
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />

      <Tab.Screen 
        name="ActiveDeliveryTab" 
        component={ActiveDeliveryStack} 
        options={{
          tabBarLabel: 'Manifest',
          tabBarIcon: ({ color, size }) => <Route size={size} color={color} />,
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
          // If NotificationsScreen has its own custom built-in layout header, keep this false!
          options={{ 
            animation: 'slide_from_bottom' 
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}