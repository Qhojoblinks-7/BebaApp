import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import notificationService from './src/services/notificationService';

notificationService.setupHandler();

function RootNavigationGateway() {
  const { session, loading, user } = useAuth();

useEffect(() => {
    async function initDeviceNotifications() {
      if (session) {
        await notificationService.ensureChannel();
      }
    }

    initDeviceNotifications();

    let orderUnsub = null;
    if (user) {
      orderUnsub = notificationService.listenForNewOrders(({ orderId, orderIdDisplay }) => {
        notificationService.scheduleLocalNotification({
          title: "New Order Available",
          body: `Order #${orderIdDisplay} is ready for pickup`,
          data: { url: "JobQueueTab", orderId },
        });
        notificationService.createFirestoreNotification({
          riderId: user.uid,
          title: "New Order Available",
          body: `Order #${orderIdDisplay} is ready for pickup`,
          orderId,
          orderIdDisplay,
          type: "new_order",
        });
      });
    }

    const foregroundSubscription = notificationService.addListenerReceived((notification) => {
      console.log('[App] Global Foreground Notification Event Caught:', notification);
    });

    const responseSubscription = notificationService.addListenerResponse((response) => {
      console.log('[App] Global User Notification Interaction Event Intercepted:', response);
    });

    return () => {
      if (orderUnsub) orderUnsub();
      notificationService.removeListener(foregroundSubscription);
      notificationService.removeListener(responseSubscription);
    };
  }, [session, user]);

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
