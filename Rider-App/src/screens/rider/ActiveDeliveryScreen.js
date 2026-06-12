import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  Platform,
  FlatList,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Package } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import useOrderStore from "../../store/orderStore";
import RiderOrderCard from "../../components/rider/RiderOrderCard";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";

export default function ActiveDeliveryScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  // 🔑 FIX 1: Extract real-time reactive slices and status mutators
  const itinerary = useOrderStore((state) => state.activeOrders);
  const subscribeToActiveOrders = useOrderStore((state) => state.subscribeToActiveOrders);
  const advanceOrderStatus = useOrderStore((state) => state.advanceOrderStatus);
  const cleanListener = useOrderStore((state) => state.cleanListener);

  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // 🔑 FIX 2: Hook directly into the reactive streaming pipe
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Open the persistent real-time channel
    const unsubscribe = subscribeToActiveOrders(user.uid);
    setLoading(false);

    // Clean up the subscription cleanly when leaving the screen
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
      cleanListener("active");
    };
  }, [user?.uid, subscribeToActiveOrders, cleanListener]);

  // 🔑 FIX 3: Delegate state changes directly to the store's optimistic action handler
  const advanceStatus = async (item) => {
    if (!item) return;

    // Route transitions handle navigation layout steps immediately
    if (item.status === "in_transit") {
      navigation.navigate("DeliveryClosure", { orderId: item.id });
      return;
    }

    const nextStatusMap = {
      assigned: "picked_up",
      picked_up: "in_transit",
    };

    const nextStatus = nextStatusMap[item.status];
    if (!nextStatus) return;

    // The store takes care of instant UI shifts, server writes, and rollback safeties
    await advanceOrderStatus(item.id, nextStatus);
  };

  const ui = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerWrapper: {
      backgroundColor: colors.backgroundCard,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 20) : StatusBar.currentHeight + 12,
      paddingHorizontal: 20,
      paddingBottom: 18,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.15 : 0.02,
          shadowRadius: 6,
        },
        android: { elevation: 3 },
      }),
    },
    headerTitleTag: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    headerMainHeading: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    listLayout: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: Platform.OS === "ios" ? 100 + insets.bottom : 112,
    },
    feedbackStateFrame: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      paddingBottom: 60,
    },
    loaderElement: {
      transform: [{ scale: 1.1 }],
    },
    emptyStateIconBox: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
      marginBottom: 4,
    },
    emptyStateSubtext: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textMuted,
      textAlign: "center",
    },
  };

  return (
    <View style={ui.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <View style={ui.headerWrapper}>
        <Text style={ui.headerTitleTag}>Run Manifest</Text>
        <Text style={ui.headerMainHeading}>
          {loading ? "Updating..." : `${itinerary.length} Active Waypoints`}
        </Text>
      </View>

      {loading ? (
        <View style={ui.feedbackStateFrame}>
          <ActivityIndicator size="small" color={colors.primary} style={ui.loaderElement} />
        </View>
      ) : (
        <FlatList
          data={itinerary}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ui.listLayout}
          renderItem={({ item }) => (
            <RiderOrderCard
              order={item}
              onPress={(order) => setSelectedOrder(order)}
            />
          )}
          ListEmptyComponent={
            <View style={ui.feedbackStateFrame}>
              <View style={ui.emptyStateIconBox}>
                <Package size={28} color={colors.textMuted} />
              </View>
              <Text style={ui.emptyStateTitle}>No Active Shipments</Text>
              <Text style={ui.emptyStateSubtext}>
                When jobs are accepted or assigned from the marketplace, they will stream directly into this layout tab.
              </Text>
            </View>
          }
        />
      )}

      <DeliveryDetailsBottomSheet
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={(order) => {
          if (!order) return;
          setSelectedOrder(null);
          setTimeout(() => advanceStatus(order), 250);
        }}
      />
    </View>
  );
}