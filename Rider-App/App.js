import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, Text } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/auth/LoginScreen';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

function RootNavigationGateway() {
  const { session, loading, user } = useAuth();

  React.useEffect(() => {
    console.log('[App] Auth state - loading:', loading, 'session:', !!session, 'user:', !!user);
  }, [loading, session, user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return session ? <AppNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        <View style={styles.flex}>
          <RootNavigationGateway />
        </View>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }
});