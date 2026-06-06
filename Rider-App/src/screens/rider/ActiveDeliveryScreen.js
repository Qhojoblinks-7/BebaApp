import React, { useState, useEffect } from "react";
import {
  StyleSheet,
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

export default function ActiveDeliveryScreen({ navigation }) {
  const { user } = useAuth();
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
      // Re-fetch manifest to re-render local order layout pipeline cards
      fetchActiveItinerary();
    } catch (err) {
      console.warn("[ActiveDelivery] Status advance failed:", err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#115e59" />
      </View>
    );
  }

  if (itinerary.length === 0) {
    return (
      <View style={styles.center}>
        <Package size={36} color="#475569" />
        <Text style={styles.noJobText}>No active manifest items right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#115e59"
        translucent
      />
      <View style={[styles.headerBackground, styles.safeHeader]}>
        <View style={styles.headerContent}>
          <Text style={styles.titleTag}>Active Run Manifest</Text>
          <Text style={styles.countText}>
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
          // Run status bump directly after state closure to prevent focus flashes
          setTimeout(() => advanceStatus(order), 200);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#16191e",
  },
  headerBackground: {
    backgroundColor: "#115e59",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
  countText: { fontSize: 20, fontWeight: "800", color: "#ffffff" },
  noJobText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 14,
  },
});