import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notificationService'; // Ensure this path is correct
import { supabase } from './src/services/supabaseClient'; // Adjust path based on your architecture

// Initialize the global notification behavior for foreground execution immediately
notificationService.setupHandler();

function RootNavigationGateway() {
  const { session, loading, user } = useAuth();

  // Handle notification permission setups, channel allocations, and token registers
  useEffect(() => {
    async function initDeviceNotifications() {
      // 1. Ensure audio channels are established on Android ('new-orders')
      await notificationService.ensureChannel();

      // 2. Register for push notifications and retrieve unique Expo token
      const token = await notificationService.registerPushToken();
      
      // 3. Optional: Sync token to your Supabase public table if a session exists
      if (token && user?.id) {
        console.log('[App] Syncing push token to database for user:', user.id);
        await supabase
          .from('profiles') // or 'users', depending on where your token column sits
          .update({ push_token: token })
          .eq('id', user.id);
      }
    }

    if (session) {
      initDeviceNotifications();
    }

    // 4. Attach native hardware event listeners
    const foregroundSubscription = notificationService.addListenerReceived(notification => {
      console.log('[App] Global Foreground Notification Event Caught:', notification);
    });

    const responseSubscription = notificationService.addListenerResponse(response => {
      console.log('[App] Global User Notification Interaction Event Intercepted:', response);
      // Example Deep Linking:
      // const orderId = response.notification.request.content.data?.notificationId;
    });

    // Clean up hardware listener channels when component trees tear down
    return () => {
      notificationService.removeListener(foregroundSubscription);
      notificationService.removeListener(responseSubscription);
    };
  }, [session, user?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return session ? <AppNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar translucent backgroundColor="transparent" />
      <View style={styles.flex}>
        <RootNavigationGateway />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }
});