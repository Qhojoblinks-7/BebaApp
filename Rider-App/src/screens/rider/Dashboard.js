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
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import {
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  collection,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { useThemeStore } from "../../store/themeStore";
import useRiderStore from "../../store/riderStore";
import useNotificationStore from "../../store/notificationStore";
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

  const riderStore = useRiderStore();
  const notificationStore = useNotificationStore();

  const riderStatus = riderStore.riderStatus;
  const syncing = riderStore.syncing;
  const deliveryOrders = riderStore.activeOrders;
  const profileName = riderStore.profile.fullName;
  const avatarUrl = riderStore.profile.avatarUrl;
  const unreadCount = notificationStore.unreadCount;
  const dailySummary = riderStore.dailySummary;

  const setRiderStatus = riderStore.setRiderStatus;
  const setSyncing = riderStore.setSyncing;
  const setActiveOrders = riderStore.setActiveOrders;
  const setRiderProfile = riderStore.setProfile;
  const setUnreadCount = notificationStore.setUnreadCount;
  const setDailySummary = riderStore.setDailySummary;

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
    if (!user?.uid) {
      setSyncing(false);
      return;
    }
    try {
      setSyncing(true);
      const snap = await getDoc(doc(db, "rider_status", user.uid));
      if (snap.exists()) {
        const status = snap.data().rider_status || "offline";
        setRiderStatus(status);
        if (status === "online") {
          await startTrackingEngine();
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Fallback capturing state presence:", err.message);
    } finally {
      setSyncing(false);
    }
  }, [user?.uid, setRiderStatus, setSyncing]);

  const fetchProfile = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.full_name || data.avatar_url) {
          setRiderProfile({ fullName: data.full_name || "", avatarUrl: data.avatar_url || "" });
        }
      }
    } catch (err) {
      console.warn("[Dashboard] Profile query run failure:", err.message);
    }
  }, [user?.uid, setRiderProfile]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("rider_id", "==", user.uid),
        where("is_read", "==", false)
      );
      const snap = await getDocs(q);
      setUnreadCount(snap.size);
    } catch (err) {
      console.warn("[Dashboard] Notification lookup breakdown:", err.message);
    }
  }, [user?.uid, setUnreadCount]);

  const fetchDashboardMetrics = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);
      const startStr = startOfDay.toISOString();
      const endStr = endOfDay.toISOString();

      const q = query(
        collection(db, "orders"),
        where("rider_id", "==", user.uid),
        where("created_at", ">=", startStr),
        where("created_at", "<", endStr)
      );
      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const validOrders = orders.filter((o) =>
        ["assigned", "picked_up", "in_transit", "delivered"].includes(o.status)
      );

      setActiveOrders(
        validOrders.sort((a, b) => (a.route_sequence || 0) - (b.route_sequence || 0))
      );

      const completedDrops = orders.filter((o) => o.status === "delivered").length || 0;
      const cancelledCount = orders.filter((o) => o.status === "cancelled").length || 0;
      const totalBookings = orders.length || 0;
      const cancelledRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;

      const revenueQ = query(
        collection(db, "revenue"),
        where("rider_id", "==", user.uid),
        where("order_completed_at", ">=", startStr),
        where("order_completed_at", "<", endStr)
      );
      const revenueSnap = await getDocs(revenueQ);
      const revenue = revenueSnap.docs.map((d) => d.data());

      const earnings = revenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const distanceKm = completedDrops * 5.4;

      setDailySummary({
        distanceKm: distanceKm.toFixed(1),
        earnings,
        completedDrops,
        cancelledRate,
      });
    } catch (err) {
      console.warn("[Dashboard] Analytics computation failure:", err.message);
    }
  }, [user?.uid, selectedDate, setActiveOrders, setDailySummary]);

  useEffect(() => {
    if (!user) {
      setSyncing(false);
      return;
    }
    fetchCurrentStatus();
    fetchProfile();
    fetchUnreadCount();

    return () => {
      stopTrackingEngine();
    };
  }, [user, fetchCurrentStatus, fetchUnreadCount, fetchProfile, setSyncing]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("rider_id", "==", user.uid),
      orderBy("created_at", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUnreadCount(notifications.filter((n) => !n.is_read).length);
      },
      (err) => console.warn("[Dashboard] notifications listen failed:", err.message)
    );

    return () => unsub();
  }, [user?.uid, setUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) return;

      fetchDashboardMetrics();

      const ordersQ = query(
        collection(db, "orders"),
        where("rider_id", "==", user.uid)
      );

      const revenueQ = query(
        collection(db, "revenue"),
        where("rider_id", "==", user.uid)
      );

      const unsubOrders = onSnapshot(
        ordersQ,
        () => {
          fetchDashboardMetrics();
        },
        (err) => console.warn("[Dashboard] orders listen failed:", err.message)
      );

      const unsubRevenue = onSnapshot(
        revenueQ,
        () => {
          fetchDashboardMetrics();
        },
        (err) => console.warn("[Dashboard] revenue listen failed:", err.message)
      );

      return () => {
        unsubOrders();
        unsubRevenue();
      };
    }, [user?.uid, fetchDashboardMetrics])
  );

  const statusConfig = {
    online:  { label: "Go Offline",  colorKey: "success",  icon: "online",  nextState: "in_class" },
    in_class: { label: "In Class →",  colorKey: "warning",  icon: "class",   nextState: "offline" },
    offline: { label: "Go Online",  colorKey: "textSecondary", icon: "offline", nextState: "online" },
  };

  const toggleAvailabilityState = async () => {
    const current = riderStatus;
    const nextState = statusConfig[current]?.nextState || "online";
    setSyncing(true);

    try {
      if (nextState === "online") {
        const trackingActive = await startTrackingEngine();
        if (!trackingActive) {
          setSyncing(false);
          return;
        }
      } else {
        await stopTrackingEngine();
      }

      await riderStore.setRiderStatusInFirebase(user.uid, nextState);
      setRiderStatus(nextState);
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

  const renderDashboardSections = () => (
    <View>
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
        riderStatus={riderStatus}
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