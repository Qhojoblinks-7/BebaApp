import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../../services/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { Bell } from "lucide-react-native";
import DeliveryDetailsBottomSheet from "../../components/rider/DeliveryDetailsBottomSheet";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchNotifications = useCallback(async (showLoadingIndicator = true) => {
    if (!user?.id) return;
    if (showLoadingIndicator) setLoading(true);

    try {
      // FIX: Explicitly request foundational root order fields within relational selection tree
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          title,
          body,
          rider_id,
          order_id,
          is_read,
          created_at,
          orders:order_id (
            id,
            order_id,
            item_description,
            pickup_address,
            customer_name,
            customer_phone,
            delivery_address,
            delivery_fee,
            status
          )
        `)
        .eq("rider_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setNotifications(data);
    } catch (err) {
      console.warn("[Notifications] Query lookup failed:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications(true);

    const channel = supabase
      .channel(`notifications-user-${user?.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new && payload.new.rider_id === user?.id) {
            // Hot reload context values natively to inject real-time relational maps
            fetchNotifications(false);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
      );

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (err) {
      console.warn("[Notifications] Mark status change failed:", err.message);
    }
  };

  const renderNotification = ({ item }) => {
    const rawDate = new Date(item.created_at);
    const formattedTime = rawDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { 
            backgroundColor: colors.backgroundCard || colors.backgroundSecondary, 
            borderColor: colors.borderLight || "rgba(255,255,255,0.05)" 
          },
          item.is_read && styles.cardRead
        ]}
        activeOpacity={0.7}
        onPress={() => {
          markAsRead(item.id);
          if (item.orders) {
            setSelectedOrder({
              id: item.order_id,
              order_id: item.orders.order_id,
              item_description: item.orders.item_description,
              pickup_address: item.orders.pickup_address,
              customer_name: item.orders.customer_name,
              customer_phone: item.orders.customer_phone,
              delivery_address: item.orders.delivery_address,
              delivery_fee: item.orders.delivery_fee,
              status: item.orders.status || (item.title.toLowerCase().includes("new") ? "pending" : "assigned"),
            });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <Bell size={15} color={item.is_read ? (colors.textMuted || "#64748b") : (colors.secondary || "#38bdf8")} />
          <Text 
            style={[
              styles.title, 
              { color: colors.text }, 
              item.is_read && { color: colors.textSecondary || colors.textMuted }
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        <Text style={[styles.body, { color: colors.textSecondary || colors.textMuted }]}>{item.body}</Text>
        
        <View style={styles.cardFooter}>
          {item.orders ? (
            <Text style={[styles.orderInfo, { color: colors.primary || "#115e59" }]}>
              Waybill: {item.orders.order_id}
            </Text>
          ) : <View />}
          <Text style={[styles.time, { color: colors.textMuted || "#94a3b8" }]}>{formattedTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={colors.primary} 
        translucent 
      />
      
      {/* Dynamic System Top Edge Navigation Header */}
      <View style={[
        styles.headerBackground, 
        { 
          backgroundColor: colors.primary,
          paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow || "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: { elevation: 6 },
          }),
        }
      ]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headingOnBg, { color: colors.textOnPrimary }]}>Notifications</Text>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderNotification}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "ios" ? insets.bottom + 24 : 40 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bell size={32} color={colors.textMuted || "#94a3b8"} />
            <Text style={[styles.emptyText, { color: colors.textMuted || "#64748b" }]}>No notifications yet.</Text>
          </View>
        }
      />

      <DeliveryDetailsBottomSheet
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAction={(order, status) => {
          if (status === "pending") {
            alert("Please use the Job Board tab to accept this order.");
          }
          setSelectedOrder(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBackground: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 20,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  headerContent: { marginTop: 4 },
  headingOnBg: { fontSize: 19, fontWeight: "900", letterSpacing: -0.4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  empty: { alignItems: "center", marginTop: 80, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: "500" },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardRead: { opacity: 0.55 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  title: { fontSize: 14, fontWeight: "750", letterSpacing: -0.1, flex: 1 },
  body: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderInfo: { fontSize: 11, fontWeight: "700" },
  time: { fontSize: 10, fontWeight: "500" },
});