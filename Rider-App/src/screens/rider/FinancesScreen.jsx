import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { TrendingUp, Wallet, ArrowRight, Download, DollarSign, PieChart, Users, Home, ShoppingBag, PiggyBank, Fuel, CreditCard, Zap } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.44;

const BUDGET_ICON_MAP = {
  Home,
  ShoppingBag,
  PiggyBank,
};

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeekDays(fromMonday) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

export default function FinancesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Overview");
  const [syncing, setSyncing] = useState(true);
  const [financeSummary, setFinanceSummary] = useState({
    totalEarnings: 0,
    weeklyGrowth: "0%",
    avgPerDelivery: 0,
    completionRate: "0%",
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setSyncing(false);
      return;
    }
    fetchFinancialData();
  }, [user?.id]);

  async function fetchFinancialData() {
    try {
      const { data: revenue, error } = await supabase
        .from("revenue")
        .select("amount, order_completed_at")
        .eq("rider_id", user.id);

      if (error) throw error;

      const totalEarnings = revenue?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const deliveriesCompleted = revenue?.length || 0;
      const avgPerDelivery = deliveriesCompleted > 0 ? (totalEarnings / deliveriesCompleted).toFixed(2) : 0;

      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("rider_id", user.id);

      if (ordersError) throw ordersError;

      const totalOrders = orders?.length || 0;
      const completionRate = totalOrders > 0 ? Math.round((deliveriesCompleted / totalOrders) * 100) : 0;

      const thisMonday = getMonday(new Date());
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);

      const lastWeekEarnings = (revenue || []).reduce((sum, r) => {
        const d = new Date(r.order_completed_at);
        return d >= lastMonday && d < thisMonday ? sum + Number(r.amount) : sum;
      }, 0);

      const thisWeekEarnings = (revenue || []).reduce((sum, r) => {
        const d = new Date(r.order_completed_at);
        return d >= thisMonday ? sum + Number(r.amount) : sum;
      }, 0);

      let weeklyGrowth = "0%";
      if (lastWeekEarnings > 0) {
        const growth = ((thisWeekEarnings - lastWeekEarnings) / lastWeekEarnings) * 100;
        weeklyGrowth = (growth >= 0 ? "+" : "") + growth.toFixed(1) + "%";
      } else if (thisWeekEarnings > 0) {
        weeklyGrowth = "+100%";
      }

      setFinanceSummary({
        totalEarnings,
        weeklyGrowth,
        avgPerDelivery,
        completionRate: completionRate + "%",
      });
    } catch (err) {
      console.warn("[Finances] Financial data fetch failed:", err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function fetchWeeklyData() {
    if (!user?.id) return;
    setLoadingWeekly(true);
    try {
      const weekStart = getMonday(new Date());
      const weekDays = buildWeekDays(weekStart);
      
      const weeklyPromises = weekDays.map(async (day) => {
        const startOfDay = day.date + "T00:00:00";
        const endOfDay = day.date + "T23:59:59";
        
        const { data, error } = await supabase
          .from("revenue")
          .select("amount")
          .eq("rider_id", user.id)
          .gte("order_completed_at", startOfDay)
          .lte("order_completed_at", endOfDay);

        if (error) throw error;
        return {
          day: day.day,
          earnings: data?.reduce((sum, r) => sum + Number(r.amount), 0) || 0,
        };
      });

      const results = await Promise.all(weeklyPromises);
      setWeeklyData(results);
    } catch (err) {
      console.warn("[Finances] Weekly data fetch failed:", err.message);
    } finally {
      setLoadingWeekly(false);
    }
  }

  useEffect(() => {
    fetchWeeklyData();
  }, [user?.id]);

  const renderInsightsTab = () => {
    const earningsTrend = weeklyData.length > 0 ? weeklyData.map(d => d.earnings) : [0, 0, 0, 0, 0, 0];
    const maxEarning = Math.max(...earningsTrend, 1);
    const chartPoints = earningsTrend.map((val, i) => {
      const x = 10 + (i * (110 / Math.max(earningsTrend.length - 1, 1)));
      const y = 40 - ((val / maxEarning) * 30);
      return { x, y };
    });
    const pathD = chartPoints.map((p, i) => (i === 0 ? "M " + p.x + " " + p.y : "L " + p.x + " " + p.y)).join(" ");
    const areaD = pathD + " L " + (chartPoints[chartPoints.length - 1]?.x || 110) + " 45 L 10 45 Z";
    const avgNorm = Math.min((financeSummary.avgPerDelivery || 0) / 100, 1);
    const avgDash = (avgNorm * 100).toFixed(1) + " " + (100 - avgNorm * 100).toFixed(1);
    const completionVal = parseInt(financeSummary.completionRate) || 0;
    const growthClean = parseFloat(financeSummary.weeklyGrowth) || 0;
    const growthDir = growthClean >= 0 ? 1 : -1;
    const growthAbs = Math.abs(growthClean);
    const midY = growthDir >= 0 ? Math.max(28 - growthAbs * 1.5, 6) : Math.min(28 + growthAbs * 1.5, 45);
    const peakY = growthDir >= 0 ? Math.max(10, 28 - growthAbs * 2) : Math.min(45, 28 + growthAbs * 2);
    const endY = growthAbs === 0 ? 28 : 22;
    const growthPathD = growthAbs === 0
      ? "M 0 28 L 30 28 L 75 28 L 120 28"
      : "M 0 28 L 30 " + midY + " L 75 " + peakY + " L 120 " + endY;
    return (
      <>
        <View style={styles.analyticsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.cardHeaderInline}>
              <Wallet size={14} color="#94a3b8" />
              <Text style={styles.cardLabelText}>Total Earnings</Text>
            </View>
            <Text style={styles.cardMainValueText}>GH₵ {financeSummary.totalEarnings.toFixed(2)}</Text>
            <View style={styles.vectorMapMockContainer}>
              <Svg height="50" width="130" viewBox="0 0 130 50">
                <Path
                  d={pathD.replace(/M /, "M10,40 ").replace(/L /g, "L").replace(/  /g, " ").replace(/(\d+\.?\d*)\s+(\d+\.?\d*)/g, (m, x, y) => x + "," + y)}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
              </Svg>
            </View>
            <Text style={styles.cardFooterDisclaimer}>All time delivery revenue</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.cardHeaderInline}>
              <PieChart size={14} color="#94a3b8" />
              <Text style={styles.cardLabelText}>Avg Per Delivery</Text>
            </View>
            <View style={styles.arcVisualContainer}>
              <Svg height="76" width="76" viewBox="0 0 40 40">
                <Circle cx="20" cy="20" r="16" fill="none" stroke="#1e293b" strokeWidth="3" />
                <Circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="#115e59"
                  strokeWidth="3.5"
                  strokeDasharray={avgDash}
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                />
              </Svg>
              <View style={styles.arcAbsoluteLabelCenter}>
                <Text style={styles.arcCenterNumberText}>{financeSummary.avgPerDelivery}</Text>
                <Text style={styles.arcCenterSubText}>GH₵ avg</Text>
              </View>
            </View>
            <View style={styles.arcBaseLabelsRow}>
              <Text style={styles.arcMicroLabelText}>Low</Text>
              <Text style={styles.arcMicroLabelText}>High</Text>
            </View>
          </View>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.cardHeaderInline}>
              <TrendingUp size={14} color="#94a3b8" />
              <Text style={styles.cardLabelText}>Completion Rate</Text>
            </View>
            <Text style={styles.cardMainValueText}>{financeSummary.completionRate}</Text>
            <View style={styles.timelineVisualSliderRow}>
              <View style={styles.timelineTrackLine}>
                <View style={[styles.timelineProgressFill, { width: financeSummary.completionRate }]} />
                <View style={[styles.timelineThumbDot, { left: financeSummary.completionRate }]} />
              </View>
            </View>
            <Text style={styles.cardFooterDisclaimer}>Orders delivered successfully</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.cardHeaderInline}>
              <Users size={14} color="#94a3b8" />
              <Text style={styles.cardLabelText}>Weekly Growth</Text>
            </View>
            <Text style={styles.cardMainValueText}>{financeSummary.weeklyGrowth}</Text>
            <View style={styles.splineGraphWrapper}>
              <Svg height="36" width="120" viewBox="0 0 120 36">
                <Path
                  d={growthPathD}
                  fill="none"
                  stroke="#115e59"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeadlineLabel}>Weekly Earnings</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeklyScrollContainer}>
          {loadingWeekly ? (
            <View style={styles.loadingWeeklyContainer}>
              <ActivityIndicator size="small" color="#facc15" />
            </View>
          ) : (
            weeklyData.map((day, index) => (
              <View key={index} style={styles.weeklyBarCard}>
                <View style={styles.weeklyBarWrapper}>
                  <View style={[styles.weeklyBarFill, { height: Math.max(day.earnings / 10, 20) }]} />
                </View>
                <Text style={styles.weeklyDayLabel}>{day.day}</Text>
                <Text style={styles.weeklyAmountLabel}>GH₵ {day.earnings.toFixed(0)}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeadlineLabel}>50/30/20 Budget</Text>
          <TouchableOpacity
            style={styles.inlineHeaderLinkAction}
            activeOpacity={0.7}
            onPress={() => {
              const budgetData = [
                { id: "needs", title: "50% Needs", allocated: financeSummary.totalEarnings * 0.5, spent: financeSummary.totalEarnings * 0.4, color: "#a855f7", description: "Rent, utilities, fuel, food", icon: "Home", subItems: [
                  { name: "Rent", amount: financeSummary.totalEarnings * 0.15 },
                  { name: "Utilities", amount: financeSummary.totalEarnings * 0.05 },
                  { name: "Fuel", amount: financeSummary.totalEarnings * 0.08 },
                  { name: "Groceries", amount: financeSummary.totalEarnings * 0.12 },
                ]},
                { id: "wants", title: "30% Wants", allocated: financeSummary.totalEarnings * 0.3, spent: financeSummary.totalEarnings * 0.25, color: "#6366f1", description: "Dining out, hobbies, shopping", icon: "ShoppingBag", subItems: [
                  { name: "Dining Out", amount: financeSummary.totalEarnings * 0.08 },
                  { name: "Hobbies", amount: financeSummary.totalEarnings * 0.05 },
                  { name: "Shopping", amount: financeSummary.totalEarnings * 0.12 },
                ]},
                { id: "savings", title: "20% Savings", allocated: financeSummary.totalEarnings * 0.2, spent: financeSummary.totalEarnings * 0.2, color: "#10b981", description: "Emergency fund, investments", icon: "PiggyBank", subItems: [
                  { name: "Emergency Fund", amount: financeSummary.totalEarnings * 0.1 },
                  { name: "Investments", amount: financeSummary.totalEarnings * 0.1 },
                ]},
              ];
              navigation.navigate("BudgetBreakdown", { budgetData });
            }}
          >
            <ArrowRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.budgetBucketsScrollWrapper}
        >
          {[
            { id: "needs", title: "50% Needs", allocated: financeSummary.totalEarnings * 0.5, spent: financeSummary.totalEarnings * 0.4, color: "#a855f7", icon: "Home" },
            { id: "wants", title: "30% Wants", allocated: financeSummary.totalEarnings * 0.3, spent: financeSummary.totalEarnings * 0.25, color: "#6366f1", icon: "ShoppingBag" },
            { id: "savings", title: "20% Savings", allocated: financeSummary.totalEarnings * 0.2, spent: financeSummary.totalEarnings * 0.2, color: "#10b981", icon: "PiggyBank" },
          ].map((bucket) => {
            const percentage = bucket.allocated > 0 ? Math.round((bucket.spent / bucket.allocated) * 100) : 0;
            const remaining = bucket.allocated - bucket.spent;
            return (
              <TouchableOpacity key={bucket.id} style={styles.budgetBucketCard} activeOpacity={0.8} onPress={() => {
                const budgetData = [
                  { id: "needs", title: "50% Needs", allocated: financeSummary.totalEarnings * 0.5, spent: financeSummary.totalEarnings * 0.4, color: "#a855f7", description: "Rent, utilities, fuel, food", icon: "Home", subItems: [
                    { name: "Rent", amount: financeSummary.totalEarnings * 0.15 },
                    { name: "Utilities", amount: financeSummary.totalEarnings * 0.05 },
                    { name: "Fuel", amount: financeSummary.totalEarnings * 0.08 },
                    { name: "Groceries", amount: financeSummary.totalEarnings * 0.12 },
                  ]},
                  { id: "wants", title: "30% Wants", allocated: financeSummary.totalEarnings * 0.3, spent: financeSummary.totalEarnings * 0.25, color: "#6366f1", description: "Dining out, hobbies, shopping", icon: "ShoppingBag", subItems: [
                    { name: "Dining Out", amount: financeSummary.totalEarnings * 0.08 },
                    { name: "Hobbies", amount: financeSummary.totalEarnings * 0.05 },
                    { name: "Shopping", amount: financeSummary.totalEarnings * 0.12 },
                  ]},
                  { id: "savings", title: "20% Savings", allocated: financeSummary.totalEarnings * 0.2, spent: financeSummary.totalEarnings * 0.2, color: "#10b981", description: "Emergency fund, investments", icon: "PiggyBank", subItems: [
                    { name: "Emergency Fund", amount: financeSummary.totalEarnings * 0.1 },
                    { name: "Investments", amount: financeSummary.totalEarnings * 0.1 },
                  ]},
                ];
                navigation.navigate("BudgetBreakdown", { budgetData });
              }}>
                <View style={styles.cardHeaderInline}>
                  <View style={[styles.iconCircle, { backgroundColor: bucket.color + "20" }]}>
                  {bucket.icon && BUDGET_ICON_MAP[bucket.icon] && React.createElement(BUDGET_ICON_MAP[bucket.icon], { size: 16, color: bucket.color })}
                </View>
                  <Text style={styles.cardLabelText}>{bucket.title}</Text>
                </View>
                <Text style={styles.cardMainValueText}>{percentage}%</Text>
                <View style={styles.budgetMiniArcContainer}>
                  <View style={styles.miniArcTrack}>
                    <View style={[styles.miniArcFill, { width: percentage + "%", backgroundColor: bucket.color }]} />
                  </View>
                </View>
                <Text style={styles.cardFooterDisclaimer}>
                  GH₵ {remaining.toFixed(0)} remaining
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );
  };

  const renderTransactionsTab = () => (
    <View style={styles.transactionsContainer}>
      <Text style={styles.transactionsPlaceholder}>Transaction history coming soon</Text>
    </View>
  );

  const renderDirectTab = () => (
    <View style={styles.transactionsContainer}>
      <Text style={styles.transactionsPlaceholder}>Direct payouts interface coming soon</Text>
    </View>
  );

  const renderOverviewTab = () => renderInsightsTab();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />

      <View style={styles.headerRow}>
        <View style={styles.profileBadge}>
          <View style={styles.avatarPlaceholder}>
            <DollarSign size={16} color="#ffffff" />
          </View>
          <View style={styles.profileSelectorWrapper}>
            <Text style={styles.headerTitleText}>Finances</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationTrigger} activeOpacity={0.7}>
          <View style={styles.calendarIconMock}>
            <Text style={styles.calendarDateText}>{new Date().getDate()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {["Overview", "Insights", "Direct", "Transactions"].map((tab) => {
            const isSelected = activeTab === tab;
            const handlePress = () => {
              if (tab === "Insights") {
                navigation.navigate("SmartInsights");
              } else {
                setActiveTab(tab);
              }
            };
            return (
              <TouchableOpacity
                key={tab}
                onPress={handlePress}
                style={[styles.tabButton, isSelected && styles.activeTabButton]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, isSelected && styles.activeTabButtonText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {syncing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#facc15" />
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === "Overview" && renderOverviewTab()}
          {activeTab === "Insights" && renderInsightsTab()}
          {activeTab === "Direct" && renderDirectTab()}
          {activeTab === "Transactions" && renderTransactionsTab()}

          <TouchableOpacity style={styles.actionExportBannerButton} activeOpacity={0.9} onPress={() => navigation.navigate("Reports")}>
            <View style={styles.bannerLeftFlexNode}>
              <PieChart size={18} color="#94a3b8" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.bannerMainHeadingText}>Detailed Reports</Text>
                <Text style={styles.bannerSubTextDesc}>Daily, weekly & monthly breakdowns</Text>
              </View>
            </View>
            <View style={styles.circleDownWrapper}>
              <Text style={{ color: "#ffffff", fontSize: 12 }}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionExportBannerButton} activeOpacity={0.9} onPress={() => navigation.navigate("ManualCashFlow")}>
            <View style={styles.bannerLeftFlexNode}>
              <TrendingUp size={18} color="#facc15" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.bannerMainHeadingText}>Manual Cash Flow</Text>
                <Text style={styles.bannerSubTextDesc}>Log inflows and outflows outside the system</Text>
              </View>
            </View>
            <View style={styles.circleDownWrapper}>
              <Text style={{ color: "#ffffff", fontSize: 12 }}>+</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d0f" },
  loadingContainer: { flex: 1, backgroundColor: "#0b0d0f", justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 44,
    paddingBottom: 14,
  },
  profileBadge: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  profileSelectorWrapper: { flexDirection: "row", alignItems: "center" },
  headerTitleText: { fontSize: 20, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  notificationTrigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16191e",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarIconMock: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDateText: { fontSize: 10, fontWeight: "800", color: "#94a3b8" },
  tabContainer: { height: 40, marginBottom: 12 },
  tabScrollContent: { paddingHorizontal: 18, alignItems: "center", gap: 8 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  activeTabButton: { backgroundColor: "#1e222b" },
  tabButtonText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  activeTabButtonText: { color: "#ffffff", fontWeight: "700" },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  analyticsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#16191e",
    borderRadius: 24,
    padding: 16,
    minHeight: 160,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardLabelText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  cardMainValueText: { fontSize: 28, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  cardFooterDisclaimer: { fontSize: 11, fontWeight: "500", color: "#64748b", marginTop: 4, lineHeight: 14 },
  sparklineContainer: { height: 46, justifyContent: "center", alignItems: "center" },
  arcVisualContainer: { height: 80, justifyContent: "center", alignItems: "center", position: "relative" },
  arcAbsoluteLabelCenter: { position: "absolute", justifyContent: "center", alignItems: "center", top: 0, left: 0, right: 0, bottom: 0 },
  arcCenterNumberText: { fontSize: 18, fontWeight: "800", color: "#ffffff" },
  arcCenterSubText: { fontSize: 9, fontWeight: "600", color: "#64748b", marginTop: -2 },
  arcBaseLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 4 },
  arcMicroLabelText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  timelineVisualSliderRow: { height: 20, justifyContent: "center" },
  timelineTrackLine: { height: 3, width: "100%", backgroundColor: "#1e293b", borderRadius: 2, position: "relative" },
  timelineProgressFill: { height: "100%", backgroundColor: "#115e59", borderRadius: 2 },
  timelineThumbDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ffffff", position: "absolute", top: -3.5, marginLeft: -5 },
  splineGraphWrapper: { height: 46, justifyContent: "flex-end", alignItems: "center" },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 14 },
  sectionHeadlineLabel: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  weeklyScrollContainer: { gap: 10, paddingRight: 20, paddingVertical: 12, paddingBottom: 16 },
  weeklyBarCard: { alignItems: "center", width: 50 },
  weeklyBarWrapper: { width: 30, height: 100, backgroundColor: "#1e293b", borderRadius: 15, overflow: "hidden", justifyContent: "flex-end" },
  weeklyBarFill: { width: "100%", backgroundColor: "#115e59", borderRadius: 15 },
  weeklyDayLabel: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginTop: 8 },
  weeklyAmountLabel: { fontSize: 11, fontWeight: "600", color: "#ffffff", marginTop: 2 },
  loadingWeeklyContainer: { minHeight: 120, justifyContent: "center", alignItems: "center" },
  transactionsContainer: { padding: 40, alignItems: "center" },
  transactionsPlaceholder: { color: "#64748b", fontSize: 14, fontWeight: "500", textAlign: "center" },
  bucketOverviewTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff", marginBottom: 12 },
  budgetMiniArcContainer: { height: 20, justifyContent: "center", alignItems: "center", marginVertical: 8 },
  miniArcTrack: { height: 3, width: "100%", backgroundColor: "#1e293b", borderRadius: 2, overflow: "hidden" },
  miniArcFill: { height: "100%", borderRadius: 2 },
  inlineHeaderLinkAction: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  budgetBucketsScrollWrapper: { gap: 12, paddingRight: 20, paddingBottom: 4 },
  budgetBucketCard: {
    backgroundColor: "#16191e",
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 16,
    minHeight: 130,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ffffff05",
  },
  bucketTopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bucketTitleText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  bucketIndicatorTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  bucketTagText: { fontSize: 10, fontWeight: "800" },
  bucketMetricsDividersLayout: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  bucketSublabelStatic: { fontSize: 10, fontWeight: "600", color: "#475569", textTransform: "uppercase" },
  bucketDescriptionText: { fontSize: 12, color: "#64748b", fontWeight: "500", marginTop: 4, height: 32 },
  bucketAmountValueMain: { fontSize: 13, fontWeight: "800", color: "#94a3b8", marginTop: 2 },
  bucketLinearBarWrapper: { marginTop: 12 },
  bucketLinearBarTrackBase: { height: 4, width: "100%", backgroundColor: "#1e293b", borderRadius: 2 },
  bucketLinearBarProgressFill: { height: "100%", borderRadius: 2 },
  actionExportBannerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16191e",
    padding: 16,
    borderRadius: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  bannerLeftFlexNode: { flexDirection: "row", alignItems: "center" },
  bannerMainHeadingText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  bannerSubTextDesc: { fontSize: 11, fontWeight: "500", color: "#64748b", marginTop: 2 },
  circleDownWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#312e81",
    justifyContent: "center",
    alignItems: "center",
  },
});
