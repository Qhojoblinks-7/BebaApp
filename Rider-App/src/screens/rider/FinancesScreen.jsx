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
import Svg, { Path, Circle } from "react-native-svg";
import { 
  TrendingUp, 
  Wallet, 
  ArrowRight, 
  PieChart, 
  Users, 
  Home, 
  ShoppingBag, 
  PiggyBank, 
  DollarSign, 
  ClipboardList 
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { useNavigation } from "@react-navigation/native";
import { getLiveBudgetFromRevenue } from "../../services/budgetService";
import { useThemeStore } from "../../store/themeStore";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.44;

const BUDGET_ICON_MAP = {
  Home,
  ShoppingBag,
  PiggyBank,
  ClipboardList,
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

function buildDefaultBudget(totalEarnings) {
  return [
    { id: "needs", title: "50% Needs", allocated: totalEarnings * 0.5, spent: totalEarnings * 0.4, color: "#a855f7", description: "Rent, utilities, fuel, food", icon: "Home", subItems: [
      { name: "Rent", amount: totalEarnings * 0.15 },
      { name: "Utilities", amount: totalEarnings * 0.05 },
      { name: "Fuel", amount: totalEarnings * 0.08 },
      { name: "Groceries", amount: totalEarnings * 0.12 },
    ]},
    { id: "wants", title: "30% Wants", allocated: totalEarnings * 0.3, spent: totalEarnings * 0.25, color: "#6366f1", description: "Dining out, hobbies, shopping", icon: "ShoppingBag", subItems: [
      { name: "Dining Out", amount: totalEarnings * 0.08 },
      { name: "Hobbies", amount: totalEarnings * 0.05 },
      { name: "Shopping", amount: totalEarnings * 0.12 },
    ]},
    { id: "savings", title: "20% Savings", allocated: totalEarnings * 0.2, spent: totalEarnings * 0.2, color: "#10b981", description: "Emergency fund, investments", icon: "PiggyBank", subItems: [
      { name: "Emergency Fund", amount: totalEarnings * 0.1 },
      { name: "Investments", amount: totalEarnings * 0.1 },
    ]},
  ];
}

export default function FinancesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { colors, isDarkMode } = useThemeStore();
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
  const [budgetData, setBudgetData] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setSyncing(false);
      return;
    }
    fetchFinancialData();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && financeSummary.totalEarnings > 0) {
      loadBudgetData();
    }
  }, [user?.id, financeSummary.totalEarnings]);

  const loadBudgetData = async () => {
    if (!user?.id) return;
    try {
      const data = await getLiveBudgetFromRevenue(user.id);
      if (data) setBudgetData(data);
    } catch (e) {
      console.warn("[Finances] budget load failed:", e.message);
    }
  };

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
    
    const avgNorm = Math.min((financeSummary.avgPerDelivery || 0) / 100, 1);
    const avgDash = (avgNorm * 100).toFixed(1) + " " + (100 - avgNorm * 100).toFixed(1);
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
          <View style={[styles.metricCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
            <View style={styles.cardHeaderInline}>
              <Wallet size={14} color={colors.textMuted} />
              <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Total Earnings</Text>
            </View>
            <Text style={[styles.cardMainValueText, { color: colors.text }]}>GH₵ {financeSummary.totalEarnings.toFixed(2)}</Text>
            <View style={styles.vectorMapMockContainer}>
              <Svg height="50" width="130" viewBox="0 0 130 50">
                <Path
                  d={pathD ? pathD.replace(/M /, "M10,40 ").replace(/L /g, "L").replace(/  /g, " ") : "M10,40 L120,40"}
                  fill="none"
                  stroke={colors.borderLight}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
              </Svg>
            </View>
            <Text style={[styles.cardFooterDisclaimer, { color: colors.textSecondary }]}>All time delivery revenue</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
            <View style={styles.cardHeaderInline}>
              <PieChart size={14} color={colors.textMuted} />
              <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Avg Per Delivery</Text>
            </View>
            <View style={styles.arcVisualContainer}>
              <Svg height="76" width="76" viewBox="0 0 40 40">
                <Circle cx="20" cy="20" r="16" fill="none" stroke={colors.backgroundSecondary} strokeWidth="3" />
                <Circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="3.5"
                  strokeDasharray={avgDash}
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                />
              </Svg>
              <View style={styles.arcAbsoluteLabelCenter}>
                <Text style={[styles.arcCenterNumberText, { color: colors.text }]}>{financeSummary.avgPerDelivery}</Text>
                <Text style={[styles.arcCenterSubText, { color: colors.textSecondary }]}>GH₵ avg</Text>
              </View>
            </View>
            <View style={styles.arcBaseLabelsRow}>
              <Text style={[styles.arcMicroLabelText, { color: colors.textDisabled }]}>Low</Text>
              <Text style={[styles.arcMicroLabelText, { color: colors.textDisabled }]}>High</Text>
            </View>
          </View>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
            <View style={styles.cardHeaderInline}>
              <TrendingUp size={14} color={colors.textMuted} />
              <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Completion Rate</Text>
            </View>
            <Text style={[styles.cardMainValueText, { color: colors.text }]}>{financeSummary.completionRate}</Text>
            <View style={styles.timelineVisualSliderRow}>
              <View style={[styles.timelineTrackLine, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.timelineProgressFill, { width: financeSummary.completionRate, backgroundColor: colors.primary }]} />
                <View style={[styles.timelineThumbDot, { left: financeSummary.completionRate, backgroundColor: colors.text }]} />
              </View>
            </View>
            <Text style={[styles.cardFooterDisclaimer, { color: colors.textSecondary }]}>Orders delivered successfully</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
            <View style={styles.cardHeaderInline}>
              <Users size={14} color={colors.textMuted} />
              <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Weekly Growth</Text>
            </View>
            <Text style={[styles.cardMainValueText, { color: colors.text }]}>{financeSummary.weeklyGrowth}</Text>
            <View style={styles.splineGraphWrapper}>
              <Svg height="36" width="120" viewBox="0 0 120 36">
                <Path
                  d={growthPathD}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionHeadlineLabel, { color: colors.text }]}>Weekly Earnings</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeklyScrollContainer}>
          {loadingWeekly ? (
            <View style={styles.loadingWeeklyContainer}>
              <ActivityIndicator size="small" color={colors.warning} />
            </View>
          ) : (
            weeklyData.map((day, index) => (
              <View key={index} style={styles.weeklyBarCard}>
                <View style={[styles.weeklyBarWrapper, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={[styles.weeklyBarFill, { height: Math.max(day.earnings / 10, 20), backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.weeklyDayLabel, { color: colors.textMuted }]}>{day.day}</Text>
                <Text style={[styles.weeklyAmountLabel, { color: colors.text }]}>GH₵ {day.earnings.toFixed(0)}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionHeadlineLabel, { color: colors.text }]}>50/30/20 Budget</Text>
          <TouchableOpacity
            style={styles.inlineHeaderLinkAction}
            activeOpacity={0.7}
            onPress={() => {
              const data = budgetData.length > 0 ? budgetData : buildDefaultBudget(financeSummary.totalEarnings);
              navigation.navigate("BudgetBreakdown", { budgetData: data });
            }}
          >
            <ArrowRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.budgetBucketsScrollWrapper}
        >
          {(budgetData.length > 0 ? budgetData : buildDefaultBudget(financeSummary.totalEarnings)).map((bucket) => {
            const savedAmount = Math.max(bucket.allocated - bucket.spent, 0);
            const savedPercent = bucket.allocated > 0 ? Math.round((savedAmount / bucket.allocated) * 100) : 0;
            return (
              <TouchableOpacity 
                key={bucket.id} 
                style={[styles.budgetBucketCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]} 
                activeOpacity={0.8} 
                onPress={() => navigation.navigate("BudgetInsightDetail", { categoryId: bucket.id })}
              >
                <View style={styles.cardHeaderInline}>
                  <View style={[styles.iconCircle, { backgroundColor: bucket.color + "20" }]}>
                    {bucket.icon && BUDGET_ICON_MAP[bucket.icon] && React.createElement(BUDGET_ICON_MAP[bucket.icon], { size: 16, color: bucket.color })}
                  </View>
                  <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>{bucket.title}</Text>
                </View>
                <Text style={[styles.cardMainValueText, { color: colors.text }]}>{savedPercent}%</Text>
                <View style={styles.budgetMiniArcContainer}>
                  <View style={[styles.miniArcTrack, { backgroundColor: colors.backgroundSecondary }]}>
                    <View style={[styles.miniArcFill, { width: savedPercent + "%", backgroundColor: bucket.color }]} />
                  </View>
                </View>
                <Text style={[styles.cardFooterDisclaimer, { color: colors.textSecondary }]}>
                  GH₵ {savedAmount.toFixed(0)} saved
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
      <Text style={[styles.transactionsPlaceholder, { color: colors.textSecondary }]}>Transaction history coming soon</Text>
    </View>
  );

  const renderDirectTab = () => (
    <View style={styles.transactionsContainer}>
      <Text style={[styles.transactionsPlaceholder, { color: colors.textSecondary }]}>Direct payouts interface coming soon</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.headerRow}>
        <View style={styles.profileBadge}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            <DollarSign size={16} color={colors.primary} />
          </View>
          <View style={styles.profileSelectorWrapper}>
            <Text style={[styles.headerTitleText, { color: colors.text }]}>Finances</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.notificationTrigger, { backgroundColor: colors.backgroundSecondary }]} activeOpacity={0.7}>
          <View style={[styles.calendarIconMock, { borderColor: colors.textMuted }]}>
            <Text style={[styles.calendarDateText, { color: colors.textMuted }]}>{new Date().getDate()}</Text>
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
                style={[styles.tabButton, isSelected && { backgroundColor: colors.backgroundSecondary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabButtonText, { color: isSelected ? colors.text : colors.textMuted, fontWeight: isSelected ? "700" : "600" }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {syncing ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.warning} />
        </View>
      ) : (
        <ScrollView style={[styles.scrollContent, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
          {activeTab === "Overview" && renderInsightsTab()}
          {activeTab === "Direct" && renderDirectTab()}
          {activeTab === "Transactions" && renderTransactionsTab()}

          <TouchableOpacity style={[styles.actionExportBannerButton, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]} activeOpacity={0.9} onPress={() => navigation.navigate("Reports")}>
            <View style={styles.bannerLeftFlexNode}>
              <PieChart size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.bannerMainHeadingText, { color: colors.text }]}>Detailed Reports</Text>
                <Text style={[styles.bannerSubTextDesc, { color: colors.textSecondary }]}>Daily, weekly & monthly breakdowns</Text>
              </View>
            </View>
            <View style={[styles.circleDownWrapper, { backgroundColor: colors.primaryAlpha }]}>
              <Text style={{ color: colors.text, fontSize: 12 }}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionExportBannerButton, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]} activeOpacity={0.9} onPress={() => navigation.navigate("ManualCashFlow")}>
            <View style={styles.bannerLeftFlexNode}>
              <TrendingUp size={18} color={colors.warning} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.bannerMainHeadingText, { color: colors.text }]}>Manual Cash Flow</Text>
                <Text style={[styles.bannerSubTextDesc, { color: colors.textSecondary }]}>Log inflows and outflows outside the system</Text>
              </View>
            </View>
            <View style={[styles.circleDownWrapper, { backgroundColor: colors.primaryAlpha }]}>
              <Text style={{ color: colors.text, fontSize: 12 }}>+</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionExportBannerButton, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]} activeOpacity={0.9} onPress={() => navigation.navigate("DeliveryHistory")}>
            <View style={styles.bannerLeftFlexNode}>
              <ClipboardList size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <View>
                <Text style={[styles.bannerMainHeadingText, { color: colors.text }]}>Delivery History</Text>
                <Text style={[styles.bannerSubTextDesc, { color: colors.textSecondary }]}>Review past completed deliveries</Text>
              </View>
            </View>
            <View style={[styles.circleDownWrapper, { backgroundColor: colors.primaryAlpha }]}>
              <Text style={{ color: colors.text, fontSize: 12 }}>→</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 54 : 24,
    paddingBottom: 14,
  },
  profileBadge: { flexDirection: "row", alignItems: "center" },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 1,
  },
  profileSelectorWrapper: { flexDirection: "row", alignItems: "center" },
  headerTitleText: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  notificationTrigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarIconMock: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarDateText: { fontSize: 10, fontWeight: "800" },
  tabContainer: { height: 40, marginBottom: 12 },
  tabScrollContent: { paddingHorizontal: 18, alignItems: "center", gap: 8 },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabButtonText: { fontSize: 14 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  analyticsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
metricCard: {
     flex: 1,
     borderRadius: 24,
     padding: 16,
     minHeight: 160,
     justifyContent: "space-between",
     borderWidth: 1,
     shadowColor: "#000000",
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 6,
     elevation: 3,
   },
  cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardLabelText: { fontSize: 13, fontWeight: "600" },
  cardMainValueText: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  cardFooterDisclaimer: { fontSize: 11, fontWeight: "500", marginTop: 4, lineHeight: 14 },
  vectorMapMockContainer: { height: 46, justifyContent: "center", alignItems: "center" },
  arcVisualContainer: { height: 80, justifyContent: "center", alignItems: "center", position: "relative" },
  arcAbsoluteLabelCenter: { position: "absolute", justifyContent: "center", alignItems: "center", top: 0, left: 0, right: 0, bottom: 0 },
  arcCenterNumberText: { fontSize: 16, fontWeight: "800" },
  arcCenterSubText: { fontSize: 9, fontWeight: "600", marginTop: -2 },
  arcBaseLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 4 },
  arcMicroLabelText: { fontSize: 11, fontWeight: "600" },
  timelineVisualSliderRow: { height: 20, justifyContent: "center" },
  timelineTrackLine: { height: 3, width: "100%", borderRadius: 2, position: "relative" },
  timelineProgressFill: { height: "100%", borderRadius: 2 },
  timelineThumbDot: { width: 10, height: 10, borderRadius: 5, position: "absolute", top: -3.5, marginLeft: -5 },
  splineGraphWrapper: { height: 46, justifyContent: "flex-end", alignItems: "center" },
  sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 14 },
  sectionHeadlineLabel: { fontSize: 16, fontWeight: "700" },
  weeklyScrollContainer: { gap: 10, paddingRight: 20, paddingVertical: 12, paddingBottom: 16 },
  weeklyBarCard: { alignItems: "center", width: 50 },
  weeklyBarWrapper: { width: 30, height: 100, borderRadius: 15, overflow: "hidden", justifyContent: "flex-end" },
  weeklyBarFill: { width: "100%", borderRadius: 15 },
  weeklyDayLabel: { fontSize: 12, fontWeight: "600", marginTop: 8 },
  weeklyAmountLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  loadingWeeklyContainer: { minHeight: 120, justifyContent: "center", alignItems: "center" },
  transactionsContainer: { padding: 40, alignItems: "center" },
  transactionsPlaceholder: { fontSize: 14, fontWeight: "500", textAlign: "center" },
  budgetMiniArcContainer: { height: 20, justifyContent: "center", alignItems: "center", marginVertical: 8 },
  miniArcTrack: { height: 3, width: "100%", borderRadius: 2, overflow: "hidden" },
  miniArcFill: { height: "100%", borderRadius: 2 },
  inlineHeaderLinkAction: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  budgetBucketsScrollWrapper: { gap: 12, paddingRight: 20, paddingBottom: 4 },
  budgetBucketCard: {
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 16,
    minHeight: 130,
    justifyContent: "space-between",
    borderWidth: 1,
    shadowColor: "#000000",
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 6,
     elevation: 3,
  },
  actionExportBannerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 24,
    marginTop: 12,
    borderWidth: 1,
    shadowColor: "#000000",
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.1,
     shadowRadius: 6,
     elevation: 3,
  },
  bannerLeftFlexNode: { flexDirection: "row", alignItems: "center" },
  bannerMainHeadingText: { fontSize: 14, fontWeight: "700" },
  bannerSubTextDesc: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  circleDownWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});