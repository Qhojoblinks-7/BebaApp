import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  FlatList,
  Text,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUpRight, Inbox } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { useThemeStore } from "../../store/themeStore";
import {
  startTrackingEngine,
  stopTrackingEngine,
} from "../../services/locationManager";
import DashboardHeader from "../../components/rider/DashboardHeader";
import RiderOrderCard from "../../components/rider/RiderOrderCard";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [profileName, setProfileName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // Date tracking matrices calculated directly on initialization blocks
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date();
    const dow = today.getDay();
    return dow === 0 ? 5 : dow - 1;
  });

  const [dailySummary, setDailySummary] = useState({
    distanceKm: "0.0",
    earnings: 0,
    completedDrops: 0,
    cancelledRate: 0,
  });

  // Calculate days array matching the current tracking state
  const calendarDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      day: DAYS[d.getDay()],
      num: d.getDate(),
      date: d.toISOString().split("T")[0],
    };
  });

  const selectedDate = calendarDays[selectedDayIndex]?.date || new Date().toISOString().split("T")[0];

  const fetchCurrentStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("rider_status")
        .select("is_rider_online")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setIsOnline(data.is_rider_online);
        if (data.is_rider_online) {
          await startTrackingEngine();
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Fallback capturing state presence:", err.message);
    } finally {
      setSyncing(false);
    }
  }, [user?.id]);

  const fetchProfileName = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        if (data.full_name) setProfileName(data.full_name);
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      }
    } catch (err) {
      console.warn("[Dashboard] Profile query run failure:", err.message);
    }
  }, [user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("rider_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (err) {
      console.warn("[Dashboard] Notification lookup breakdown:", err.message);
    }
  }, [user?.id]);

  const fetchDashboardMetrics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("rider_id", user.id)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (ordersError) throw ordersError;

      const validOrders = orders?.filter((o) =>
        ["assigned", "picked_up", "in_transit", "delivered"].includes(o.status)
      ) || [];
      
      setDeliveryOrders(
        validOrders.sort((a, b) => (a.route_sequence || 0) - (b.route_sequence || 0))
      );

      const completedDrops = orders?.filter((o) => o.status === "delivered").length || 0;
      const cancelledCount = orders?.filter((o) => o.status === "cancelled").length || 0;
      const totalBookings = orders?.length || 0;
      const cancelledRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

      const { data: revenue, error: revenueError } = await supabase
        .from("revenue")
        .select("amount")
        .eq("rider_id", user.id)
        .gte("order_completed_at", startOfDay)
        .lte("order_completed_at", endOfDay);

      if (revenueError) throw revenueError;

      const earnings = revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const distanceKm = completedDrops * 5.4;

      setDailySummary({
        distanceKm: distanceKm.toFixed(1),
        earnings,
        completedDrops: totalBookings,
        cancelledRate,
      });
    } catch (err) {
      console.warn("[Dashboard] Analytics computation failure:", err.message);
    }
  }, [user?.id, selectedDate]);

  useEffect(() => {
    if (!user) {
      setSyncing(false);
      return;
    }
    fetchCurrentStatus();
    fetchUnreadCount();
    fetchProfileName();

    return () => {
      stopTrackingEngine();
    };
  }, [user, fetchCurrentStatus, fetchUnreadCount, fetchProfileName]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `rider_id=eq.${user.id}`,
        },
        () => fetchUnreadCount(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnreadCount]);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  const toggleAvailabilityState = async () => {
    const nextState = !isOnline;
    setSyncing(true);
    try {
      if (nextState) {
        const trackingActive = await startTrackingEngine();
        if (!trackingActive) {
          setIsOnline(false);
          setSyncing(false);
          return;
        }
      } else {
        await stopTrackingEngine();
      }

      const { error } = await supabase.from("rider_status").upsert({
        id: user.id,
        is_rider_online: nextState,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      setIsOnline(nextState);
    } catch (err) {
      console.warn("[Dashboard] Presence sync pipeline failed:", err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (syncing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // --- Dynamic Style Matrix mapped direct to application theme context ---
  const ui = {
    scrollLayout: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: Platform.OS === "ios" ? 90 + insets.bottom : 105,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 20,
      marginBottom: 14,
      gap: 10,
    },
    sectionTitleText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.4,
    },
    pillCountBadge: {
      backgroundColor: "rgba(250, 100, 50, 0.12)",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 100,
    },
    pillCountText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "800",
    },
    statsGrid: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    accentMetricCard: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 16,
      minHeight: 130,
      justifyContent: "space-between",
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        },
        android: { elevation: 4 },
      }),
    },
    accentCardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textOnPrimary,
      opacity: 0.8,
    },
    accentCardValue: {
      fontSize: 32,
      fontWeight: "900",
      color: colors.textOnPrimary,
      letterSpacing: -1,
    },
    lightArrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      justifyContent: "center",
      alignItems: "center",
    },
    darkMetricCard: {
      flex: 1,
      backgroundColor: colors.backgroundCard,
      borderRadius: 24,
      padding: 16,
      minHeight: 130,
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.03,
          shadowRadius: 8,
        },
        android: { elevation: 3 },
      }),
    },
    darkCardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
    },
    darkCardValue: {
      fontSize: 32,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -1,
    },
    darkArrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cardMetricsFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    emptyContainerFallback: {
      padding: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginTop: 4,
    },
    fallbackMessageText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      marginTop: 8,
      textAlign: "center",
    },
  };

  // Pre-calculate view elements to keep FlatList performant
  const renderDashboardSections = () => (
    <View>
      {/* --- STATS SECTION --- */}
      <View style={ui.sectionHeader}>
        <Text style={ui.sectionTitleText}>Performance Hub</Text>
      </View>

      <View style={ui.statsGrid}>
        <View style={ui.accentMetricCard}>
          <Text style={ui.accentCardTitle}>Total Bookings</Text>
          <View style={ui.cardMetricsFooter}>
            <Text style={ui.accentCardValue}>{dailySummary.completedDrops}</Text>
            <View style={ui.lightArrowCircle}>
              <ArrowUpRight size={16} color={colors.textOnPrimary} strokeWidth={2.5} />
            </View>
          </View>
        </View>

        <View style={ui.darkMetricCard}>
          <Text style={ui.darkCardTitle}>Money Earned</Text>
          <View style={ui.cardMetricsFooter}>
            <Text style={ui.darkCardValue}>¢{dailySummary.earnings.toFixed(2)}</Text>
            <View style={ui.darkArrowCircle}>
              <ArrowUpRight size={16} color={colors.primary} strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </View>

      {/* --- BOOKINGS RUN-LIST HEADER --- */}
      <View style={[ui.sectionHeader, { marginTop: 24 }]}>
        <Text style={ui.sectionTitleText}>Selected Manifest</Text>
        <View style={ui.pillCountBadge}>
          <Text style={ui.pillCountText}>
            {deliveryOrders.length < 10 ? `0${deliveryOrders.length}` : deliveryOrders.length} jobs
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      <DashboardHeader
        isOnline={isOnline}
        unreadCount={unreadCount}
        onToggleOnline={toggleAvailabilityState}
        onNavigateNotifications={() => navigation.navigate("Notifications")}
        onNavigateProfile={() => navigation.navigate("Profile")}
        weekStart={weekStart}
        onMonthPrev={() => setWeekStart(p => new Date(p.setDate(p.getDate() - 7)))}
        onMonthNext={() => setWeekStart(p => new Date(p.setDate(p.getDate() + 7)))}
        calendarDays={calendarDays}
        selectedDayIndex={selectedDayIndex}
        onSelectDay={setSelectedDayIndex}
        profileName={profileName}
        avatarUri={avatarUrl}
      />

      {/* Core FlatList Engine replacing lazy ScrollView layout logic */}
      <FlatList
        data={deliveryOrders}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ui.scrollLayout}
        ListHeaderComponent={renderDashboardSections}
        renderItem={({ item }) => <RiderOrderCard order={item} />}
        ListEmptyComponent={
          <View style={ui.emptyContainerFallback}>
            <Inbox size={24} color={colors.textDisabled} />
            <Text style={ui.fallbackMessageText}>No deliveries logs found for this calendar target.</Text>
          </View>
        }
      />
    </View>
  );
}