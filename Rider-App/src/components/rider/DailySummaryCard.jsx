import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Zap, MessageSquare } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";
import { useAuth } from "../../context/AuthContext";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

function MetricRow({ value, unit, target, targetValue, isLast, colors }) {
  return (
    <View style={[styles.metricItemRow, isLast && styles.lastMetricItemRow]}>
      <View>
        <Text style={[styles.metricMainValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.metricSubLabelText, { color: colors.textMuted }]}>{unit}</Text>
      </View>
      <View style={styles.targetBlock}>
        <Text style={[styles.targetIndicatorText, { color: colors.warning || "#f59e0b" }]}>{target}</Text>
        <Text style={[styles.targetValueText, { color: colors.textSecondary }]}>{targetValue}</Text>
      </View>
    </View>
  );
}

export default function DailySummaryCard({
  distanceKm = "0.0",
  earnings = 0,
  completedDrops = 0,
  onViewHistory,
  userId,
  selectedDate,
}) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();

  const [localMetrics, setLocalMetrics] = useState({
    distanceKm: "0.0",
    earnings: 0,
    completedDrops: 0,
  });

  useEffect(() => {
    const uid = userId || user?.id;
    if (!uid || !selectedDate) return;

    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;

    const q = query(
      collection(db, "orders"),
      where("rider_id", "==", uid),
      where("created_at", ">=", startOfDay),
      where("created_at", "<", endOfDay)
    );

    const unsubOrders = onSnapshot(
      q,
      (snap) => {
        const orders = snap.docs.map((d) => d.data());
        const completedDrops = orders.filter((o) => o.status === "delivered").length || 0;
        const cancelledCount = orders.filter((o) => o.status === "cancelled").length || 0;
        const totalBookings = orders.length || 0;
        const cancelledRate = totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0;
        const distanceKm = completedDrops * 5.4;

        setLocalMetrics({
          distanceKm: distanceKm.toFixed(1),
          earnings: localMetrics.earnings,
          completedDrops,
        });

        const revenueQ = query(
          collection(db, "revenue"),
          where("rider_id", "==", uid),
          where("order_completed_at", ">=", startOfDay),
          where("order_completed_at", "<", endOfDay)
        );

        const unsubRevenue = onSnapshot(
          revenueQ,
          (revSnap) => {
            const revenue = revSnap.docs.map((d) => d.data());
            const earnings = revenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
            setLocalMetrics((prev) => ({
              ...prev,
              earnings,
            }));
          },
          (err) => console.warn("[DailySummaryCard] revenue listen failed:", err.message)
        );

        return () => unsubRevenue();
      },
      (err) => console.warn("[DailySummaryCard] orders listen failed:", err.message)
    );

    return () => unsubOrders();
  }, [user?.uid, selectedDate]);

  const safeDistance = typeof distanceKm === "number" ? distanceKm : parseFloat(distanceKm) || 0;
  const safeEarnings = Number(earnings) || 0;
  const safeDrops = Number(completedDrops) || 0;

  const displayDistance = localMetrics.distanceKm !== "0.0" ? localMetrics.distanceKm : (typeof distanceKm === "number" ? distanceKm : parseFloat(distanceKm) || 0).toFixed(1);
  const displayEarnings = localMetrics.earnings > 0 || localMetrics.completedDrops > 0 ? localMetrics.earnings : Number(earnings) || 0;
  const displayDrops = localMetrics.completedDrops > 0 ? localMetrics.completedDrops : Number(completedDrops) || 0;

  const metrics = [
    {
      value: displayDistance,
      unit: "Kilometers Tracked",
      target: "| Distance",
      targetValue: "60.0 km Target",
    },
    {
      value: `GH₵ ${displayEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      unit: "Collected Funds",
      target: "| Earnings",
      targetValue: "GH₵ 500 Target",
    },
    {
      value: String(displayDrops),
      unit: "Completed Drops",
      target: "| Manifests",
      targetValue: "12 Runs Target",
    },
  ];

  // Dynamic system shadows matching existing screen instances
  const cardDepthShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.25 : 0.04,
    shadowRadius: 10,
    elevation: 2,
  };

  // Safe fallback branding accents if custom palette profiles aren't bound yet
  const primaryAccent = colors.primary || "#115e59";

  return (
    <View style={[
      styles.summaryCard, 
      cardDepthShadow, 
      { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }
    ]}>
      
      {/* Header section with theme-bound boundary split */}
      <View style={[styles.cardHeader, { borderColor: colors.borderLight }]}>
        <Zap size={16} color={primaryAccent} />
        <Text style={[styles.cardHeaderTitle, { color: primaryAccent }]}>Daily Summary</Text>
      </View>

      {/* Metrics Render Mapping Loop */}
      {metrics.map((metric, index) => (
        <MetricRow
          key={index}
          value={metric.value}
          unit={metric.unit}
          target={metric.target}
          targetValue={metric.targetValue}
          isLast={index === metrics.length - 1}
          colors={colors}
        />
      ))}

      {/* Primary Navigation Trigger Component */}
      <TouchableOpacity 
        style={[styles.primaryActionButton, { backgroundColor: primaryAccent }]} 
        onPress={onViewHistory}
        activeOpacity={0.8}
      >
        <MessageSquare size={16} color="#ffffff" />
        <Text style={styles.primaryActionText}>View History</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  lastMetricItemRow: {
    marginBottom: 16,
  },
  metricMainValue: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  metricSubLabelText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: -1,
  },
  targetBlock: { alignItems: "flex-end" },
  targetIndicatorText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  targetValueText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  primaryActionButton: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  primaryActionText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
});