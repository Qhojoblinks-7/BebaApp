import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  ScrollView,
  Text,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import {
  startTrackingEngine,
  stopTrackingEngine,
} from "../../services/locationManager";
import DashboardHeader from "../../components/rider/DashboardHeader";
import { ArrowUpRight, ArrowDownRight } from "lucide-react-native";
import RiderOrderCard from "../../components/rider/RiderOrderCard";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeekDays(fromMonday) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(fromMonday);
    d.setDate(fromMonday.getDate() + i);
    return {
      day: DAYS[d.getDay()],
      num: d.getDate(),
      date: d.toISOString().split("T")[0],
    };
  });
}

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
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
  const [deliveryOrders, setDeliveryOrders] = useState([]);

  const calendarDays = buildWeekDays(weekStart);
  const monthLabel = weekStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedDate =
    calendarDays[selectedDayIndex]?.date ||
    new Date().toISOString().split("T")[0];

  async function fetchCurrentStatus() {
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
      console.warn(
        "[Dashboard] System fallback reading presence state:",
        err.message,
      );
    } finally {
      setSyncing(false);
    }
  }

  async function fetchUnreadCount() {
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
      console.warn(
        "[Dashboard] Unread database counter lookup failure:",
        err.message,
      );
    }
  }

  useEffect(() => {
    if (!user) {
      setSyncing(false);
      return;
    }
    fetchCurrentStatus();
    fetchUnreadCount();

    return () => {
      stopTrackingEngine();
    };
  }, [user]);

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
  }, [user?.id]);

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
      console.warn("[Dashboard] State push sync layout error:", err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleMonthPrev = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleMonthNext = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleSelectDay = (index) => {
    setSelectedDayIndex(index);
  };

  async function fetchDashboardMetrics() {
    if (!user?.id) return;
    try {
      const startOfDay = `${selectedDate}T00:00:00`;
      const endOfDay = `${selectedDate}T23:59:59`;

      // Fetch day specific order manifest rows
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

      // Fetch transaction parameters
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
      console.warn("[Dashboard] Metrics parsing failed:", err.message);
    }
  }

  useEffect(() => {
    fetchDashboardMetrics();
  }, [user?.id, selectedDate]);

  if (syncing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#facc15" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Target UI layout header integration */}
      <DashboardHeader
        isOnline={isOnline}
        unreadCount={unreadCount}
        onToggleOnline={toggleAvailabilityState}
        onNavigateNotifications={() => navigation.navigate("Notifications")}
        onMonthPrev={handleMonthPrev}
        onMonthNext={handleMonthNext}
        calendarDays={calendarDays}
        selectedDayIndex={selectedDayIndex}
        onSelectDay={handleSelectDay}
        monthLabel={monthLabel}
      />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- STATS SECTION --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleText}>Your Stats</Text>
        </View>

        {/* Asymmetric Image Analytics Metrics Block */}
        <View style={styles.statsGrid}>
          {/* Accent Display Box */}
          <View style={styles.accentMetricCard}>
            <View>
              <Text style={styles.accentCardTitle}>Total Bookings</Text>
              <Text style={styles.accentCardSubtitle}>Today</Text>
            </View>
            <View style={styles.cardMetricsFooter}>
              <Text style={styles.accentCardValue}>{dailySummary.completedDrops}</Text>
              <View style={styles.lightArrowCircle}>
                <ArrowUpRight size={18} color="#11151a" strokeWidth={2.5} />
              </View>
            </View>
          </View>

           {/* Muted Display Box */}
           <View style={styles.darkMetricCard}>
             <View>
               <Text style={styles.darkCardTitle}>Money Made</Text>
               <Text style={styles.darkCardSubtitle}>Today</Text>
             </View>
             <View style={styles.cardMetricsFooter}>
               <Text style={styles.darkCardValue}>₵ {dailySummary.earnings.toFixed(1)}</Text>
               <View style={styles.darkArrowCircle}>
                 <ArrowUpRight size={18} color="#115e59" strokeWidth={2.5} />
               </View>
             </View>
           </View>
        </View>

        {/* --- BOOKINGS RUN-LIST SECTION --- */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.sectionTitleText}>Todays Bookings</Text>
          <View style={styles.pillCountBadge}>
            <Text style={styles.pillCountText}>
              {deliveryOrders.length < 10 ? `0${deliveryOrders.length}` : deliveryOrders.length}
            </Text>
          </View>
        </View>

        {/* Output Dispatch Mapping */}
        <View style={styles.ordersListWrapper}>
          {deliveryOrders.length === 0 ? (
            <View style={styles.emptyContainerFallback}>
              <Text style={styles.fallbackMessageText}>No bookings queued for this day.</Text>
            </View>
          ) : (
            deliveryOrders.map((item) => (
              <RiderOrderCard key={item.id} order={item} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0b0d0f",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  sectionTitleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#16191e",
    letterSpacing: -0.4,
  },
  pillCountBadge: {
    backgroundColor: "#4b4d4f",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff0a",
  },
  pillCountText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },
  accentMetricCard: {
    flex: 1,
    backgroundColor: "#115e59",
    borderRadius: 28,
    padding: 20,
    minHeight: 155,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  accentCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  accentCardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ffffff",
    opacity: 0.6,
    marginTop: 2,
  },
  cardMetricsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  accentCardValue: {
    fontSize: 38,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 42,
  },
  lightArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  darkMetricCard: {
    flex: 1,
    backgroundColor: "#Fafafa",
    borderRadius: 28,
    padding: 20,
    minHeight: 155,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ffffff0a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  darkCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16191e",
  },
  darkCardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6c6e71",
    marginTop: 2,
  },
  darkCardValue: {
    fontSize: 34,
    fontWeight: "700",
    color: "#115e59",
    lineHeight: 40,
  },
  darkArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#d1e2d9",
    justifyContent: "center",
    alignItems: "center",
  },
  ordersListWrapper: {
    marginTop: 2,
  },
  emptyContainerFallback: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1e2d9",
    borderRadius: 24,
  },
  fallbackMessageText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
});