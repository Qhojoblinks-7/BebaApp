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
import { Package, RefreshCw } from "lucide-react-native";
import { updateDoc, doc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import useOrderStore from "../../store/orderStore";
import { db } from "../../services/firebaseConfig";
import RiderOrderCard from "../../components/rider/RiderOrderCard";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";

export default function ActiveDeliveryScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const orderStore = useOrderStore();
  const itinerary = orderStore.activeOrders;
  const fetchActiveOrders = orderStore.fetchActiveOrders;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchActiveItinerary = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      await fetchActiveOrders(user?.uid);
    } catch (err) {
      console.warn("[ActiveDelivery] Itinerary retrieval failed:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchActiveItinerary();
    }
  }, [user?.uid, fetchActiveOrders]);

  const advanceStatus = async (item) => {
    try {
      if (item.status === "assigned") {
        await updateDoc(doc(db, "orders", item.id), {
          status: "picked_up",
          updated_at: new Date().toISOString(),
        });
      } else if (item.status === "picked_up") {
        await updateDoc(doc(db, "orders", item.id), {
          status: "in_transit",
          updated_at: new Date().toISOString(),
        });
      } else if (item.status === "in_transit") {
        navigation.navigate("DeliveryClosure", { orderId: item.id });
        return;
      }
      await fetchActiveItinerary();
    } catch (err) {
      console.warn("[ActiveDelivery] Status progression failed:", err.message);
    }
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

      {loading && !refreshing ? (
        <View style={ui.feedbackStateFrame}>
          <ActivityIndicator size="small" color={colors.primary} style={ui.loaderElement} />
        </View>
      ) : itinerary.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          onRefresh={() => fetchActiveItinerary(true)}
          refreshing={refreshing}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <View style={ui.feedbackStateFrame}>
              <View style={ui.emptyStateIconBox}>
                <Package size={28} color={colors.textMuted} />
              </View>
              <Text style={ui.emptyStateTitle}>No Active Shipments</Text>
              <Text style={ui.emptyStateSubtext}>
                Pull down on the display to scan the repository for newly assigned runs.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={itinerary}
          keyExtractor={(item) => item.id}
          onRefresh={() => fetchActiveItinerary(true)}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ui.listLayout}
          renderItem={({ item }) => (
            <RiderOrderCard
              order={item}
              onPress={(order) => setSelectedOrder(order)}
            />
          )}
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