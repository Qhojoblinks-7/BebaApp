import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  Platform,
  FlatList,
  StatusBar,
} from "react-native";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { Package } from "lucide-react-native";
import RiderOrderCard from "../../components/rider/RiderOrderCard";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";
import { useThemeStore } from "../../store/themeStore";

export default function ActiveDeliveryScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useThemeStore();
  const [itinerary, setItinerary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchActiveItinerary = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    console.log("[ActiveDelivery] Fetching itinerary for rider:", user?.id);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("rider_id", user?.id)
      .in("status", ["assigned", "picked_up", "in_transit"])
      .order("route_sequence", { ascending: true });

    console.log("[ActiveDelivery] Itinerary result:", {
      count: data?.length,
      error: JSON.stringify(error),
      orders: JSON.stringify(
        data?.map((o) => ({
          id: o.id,
          order_id: o.order_id,
          status: o.status,
          route_sequence: o.route_sequence,
        })),
      ),
    });

    if (!error && data) {
      setItinerary(data);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.id) {
      fetchActiveItinerary();
    }
  }, [user?.id]);

  const advanceStatus = async (item) => {
    try {
      if (item.status === "assigned") {
        const { error } = await supabase
          .from("orders")
          .update({ status: "picked_up", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        if (error) throw error;
      } else if (item.status === "picked_up") {
        const { error } = await supabase
          .from("orders")
          .update({
            status: "in_transit",
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;
      } else if (item.status === "in_transit") {
        navigation.navigate("DeliveryClosure", { orderId: item.id });
        return;
      }
      fetchActiveItinerary();
    } catch (err) {
      console.warn("[ActiveDelivery] Status advance failed:", err.message);
    }
  };

  const themedStyles = {
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
    },
    container: { flex: 1, backgroundColor: colors.background },
    headerBackground: {
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      paddingBottom: 24,
      paddingHorizontal: 20,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
        },
        android: { elevation: 6 },
      }),
    },
    safeHeader: {
      paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 60,
    },
    headerContent: { paddingTop: Platform.OS === "android" ? 8 : 0 },
    titleTag: {
      fontSize: 11,
      fontWeight: "900",
      color: "rgba(255, 255, 255, 0.7)",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 4,
    },
    countText: { fontSize: 20, fontWeight: "800", color: colors.textOnPrimary },
    noJobText: {
      color: colors.textDisabled,
      fontSize: 14,
      fontWeight: "700",
      marginTop: 14,
    },
  };

  if (loading) {
    return (
      <View style={themedStyles.center}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (itinerary.length === 0) {
    return (
      <View style={themedStyles.center}>
        <Package size={36} color={colors.textDisabled} />
        <Text style={themedStyles.noJobText}>No active manifest items right now.</Text>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
        translucent
      />
      <View style={[themedStyles.headerBackground, themedStyles.safeHeader]}>
        <View style={themedStyles.headerContent}>
          <Text style={themedStyles.titleTag}>Active Run Manifest</Text>
          <Text style={themedStyles.countText}>
            {itinerary.length} Waypoints Remaining
          </Text>
        </View>
      </View>

      <FlatList
        data={itinerary}
        keyExtractor={(item) => item.id}
        onRefresh={() => fetchActiveItinerary(true)}
        refreshing={refreshing}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        renderItem={({ item }) => (
          <RiderOrderCard
            order={item}
            onPress={(order) => setSelectedOrder(order)}
          />
        )}
      />

      <DeliveryDetailsBottomSheet
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={(order) => {
          if (!order) return;
          setSelectedOrder(null);
          setTimeout(() => advanceStatus(order), 200);
        }}
      />
    </View>
  );
}