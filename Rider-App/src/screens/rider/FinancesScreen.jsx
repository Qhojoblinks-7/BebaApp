import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import {
  getDocs,
  query,
  where,
  collection,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import { getLiveBudgetWithExpenses, buildDefaultBudget } from "../../services/budgetService";
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

export default function FinancesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
    if (!user?.uid) {
      setSyncing(false);
      setLoadingWeekly(false);
      return;
    }
    fetchFinancialData();
  }, [user?.uid]);

  const loadBudgetData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const data = await getLiveBudgetWithExpenses(user.uid);
      if (data && data.length > 0) {
        setBudgetData(data);
      } else {
        setBudgetData(buildDefaultBudget(financeSummary.totalEarnings));
      }
    } catch (e) {
      console.warn("[Finances] budget load failed:", e.message);
      setBudgetData(buildDefaultBudget(financeSummary.totalEarnings));
    }
  }, [user?.uid, financeSummary.totalEarnings]);

  useEffect(() => {
    if (user?.uid && financeSummary.totalEarnings > 0) {
      loadBudgetData();
    }
  }, [user?.uid, financeSummary.totalEarnings, loadBudgetData]);

  async function fetchFinancialData() {
    try {
      const revenueQ = query(collection(db, "revenue"), where("rider_id", "==", user.uid));
      const revenueSnap = await getDocs(revenueQ);
      const revenue = revenueSnap.docs.map((d) => d.data());

      const totalEarnings = revenue.reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;
      const deliveriesCompleted = revenue.length || 0;
      const avgPerDelivery = deliveriesCompleted > 0 ? (totalEarnings / deliveriesCompleted).toFixed(2) : 0;

      const ordersQ = query(collection(db, "orders"), where("rider_id", "==", user.uid));
      const ordersSnap = await getDocs(ordersQ);
      const orders = ordersSnap.docs.map((d) => d.data());

      const totalOrders = orders.length || 0;
      const completionRate = totalOrders > 0 ? Math.round((deliveriesCompleted / totalOrders) * 100) : 0;

      const thisMonday = getMonday(new Date());
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);

      const lastWeekEarnings = revenue.reduce((sum, r) => {
        const d = new Date(r.order_completed_at);
        return d >= lastMonday && d < thisMonday ? sum + Number(r.amount) : sum;
      }, 0);

      const thisWeekEarnings = revenue.reduce((sum, r) => {
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
    if (!user?.uid) return;
    setLoadingWeekly(true);
    try {
      const weekStart = getMonday(new Date());
      const weekDays = buildWeekDays(weekStart);

      const revenueQ = query(collection(db, "revenue"), where("rider_id", "==", user.uid));
      const revenueSnap = await getDocs(revenueQ);
      const revenue = revenueSnap.docs.map((d) => d.data());

      const weeklyPromises = weekDays.map(async (day) => {
        const dayStart = new Date(day.date + "T00:00:00");
        const dayEnd = new Date(day.date + "T23:59:59.999");

        const dayEarnings = revenue.reduce((sum, r) => {
          const d = new Date(r.order_completed_at || r.created_at);
          return d >= dayStart && d <= dayEnd ? sum + Number(r.amount) : sum;
        }, 0);

        return {
          day: day.day,
          earnings: dayEarnings,
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
  }, [user?.uid]);

  // --- Dynamic Style Matrix mapped direct to application theme context ---
  const ui = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingBottom: "5.25rem",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
      paddingBottom: 14,
    },
    profileBadge: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
      borderWidth: 1,
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.borderLight,
    },
    profileSelectorWrapper: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerTitleText: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
      color: colors.text,
    },
    notificationTrigger: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
    },
    calendarIconMock: {
      width: 22,
      height: 22,
      borderWidth: 1.5,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
      borderColor: colors.textMuted,
    },
    calendarDateText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.textMuted,
    },
    tabContainer: {
      height: 40,
      marginBottom: 12,
    },
    tabScrollContent: {
      paddingHorizontal: 18,
      alignItems: "center",
      gap: 8,
    },
    tabButton: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
    },
    tabButtonText: {
      fontSize: 14,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: 18,
    },
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
      backgroundColor: colors.backgroundCard,
      borderColor: colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    cardHeaderInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    iconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    cardLabelText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    cardMainValueText: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: colors.text,
    },
    cardFooterDisclaimer: {
      fontSize: 11,
      fontWeight: "500",
      marginTop: 4,
      lineHeight: 14,
      color: colors.textSecondary,
    },
    vectorMapMockContainer: {
      height: 46,
      justifyContent: "center",
      alignItems: "center",
    },
    arcVisualContainer: {
      height: 80,
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    arcAbsoluteLabelCenter: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    arcCenterNumberText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    arcCenterSubText: {
      fontSize: 9,
      fontWeight: "600",
      marginTop: -2,
      color: colors.textSecondary,
    },
    arcBaseLabelsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 4,
      paddingHorizontal: 4,
    },
    arcMicroLabelText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textDisabled,
    },
    timelineVisualSliderRow: {
      height: 20,
      justifyContent: "center",
    },
    timelineTrackLine: {
      height: 3,
      width: "100%",
      borderRadius: 2,
      position: "relative",
      backgroundColor: colors.backgroundSecondary,
    },
    timelineProgressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    timelineThumbDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      position: "absolute",
      top: -3.5,
      marginLeft: -5,
      backgroundColor: colors.text,
    },
    splineGraphWrapper: {
      height: 46,
      justifyContent: "flex-end",
      alignItems: "center",
    },
    sectionTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 24,
      marginBottom: 14,
    },
    sectionHeadlineLabel: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    weeklyScrollContainer: {
      gap: 10,
      paddingRight: 20,
      paddingVertical: 12,
      paddingBottom: 16,
    },
    weeklyBarCard: {
      alignItems: "center",
      width: 50,
    },
    weeklyBarWrapper: {
      width: 30,
      height: 100,
      borderRadius: 15,
      overflow: "hidden",
      justifyContent: "flex-end",
      backgroundColor: colors.backgroundSecondary,
    },
    weeklyBarFill: {
      width: "100%",
      borderRadius: 15,
      backgroundColor: colors.primary,
    },
    weeklyDayLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 8,
      color: colors.textMuted,
    },
    weeklyAmountLabel: {
      fontSize: 11,
      fontWeight: "600",
      marginTop: 2,
      color: colors.text,
    },
    loadingWeeklyContainer: {
      minHeight: 120,
      justifyContent: "center",
      alignItems: "center",
    },
    transactionsContainer: {
      padding: 40,
      alignItems: "center",
    },
    transactionsPlaceholder: {
      fontSize: 14,
      fontWeight: "500",
      textAlign: "center",
      color: colors.textSecondary,
    },
    budgetMiniArcContainer: {
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      marginVertical: 8,
    },
    miniArcTrack: {
      height: 3,
      width: "100%",
      borderRadius: 2,
      overflow: "hidden",
      backgroundColor: colors.backgroundSecondary,
    },
    miniArcFill: {
      height: "100%",
      borderRadius: 2,
    },
    inlineHeaderLinkAction: {
      width: 28,
      height: 28,
      justifyContent: "center",
      alignItems: "center",
    },
    budgetBucketsScrollWrapper: {
      gap: 12,
      paddingRight: 20,
      paddingBottom: 4,
    },
    budgetBucketCard: {
      width: CARD_WIDTH,
      borderRadius: 24,
      padding: 16,
      minHeight: 130,
      justifyContent: "space-between",
      borderWidth: 1,
      backgroundColor: colors.backgroundCard,
      borderColor: colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    actionExportBannerButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderRadius: 24,
      marginTop: 12,
      borderWidth: 1,
      backgroundColor: colors.backgroundCard,
      borderColor: colors.borderLight,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.2 : 0.06,
          shadowRadius: 6,
        },
        android: { elevation: 2 },
      }),
    },
    bannerLeftFlexNode: {
      flexDirection: "row",
      alignItems: "center",
    },
    bannerMainHeadingText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    bannerSubTextDesc: {
      fontSize: 11,
      fontWeight: "500",
      marginTop: 2,
      color: colors.textSecondary,
    },
    circleDownWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primaryAlpha || "rgba(17, 94, 89, 0.1)",
    },
  };

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
        <View style={ui.analyticsGrid}>
          <View style={ui.metricCard}>
            <View style={ui.cardHeaderInline}>
              <Wallet size={14} color={colors.textMuted} />
              <Text style={ui.cardLabelText}>Total Earnings</Text>
            </View>
            <Text style={ui.cardMainValueText}>GH₵ {financeSummary.totalEarnings.toFixed(2)}</Text>
            <View style={ui.vectorMapMockContainer}>
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
            <Text style={ui.cardFooterDisclaimer}>All time delivery revenue</Text>
          </View>

          <View style={ui.metricCard}>
            <View style={ui.cardHeaderInline}>
              <PieChart size={14} color={colors.textMuted} />
              <Text style={ui.cardLabelText}>Avg Per Delivery</Text>
            </View>
            <View style={ui.arcVisualContainer}>
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
              <View style={ui.arcAbsoluteLabelCenter}>
                <Text style={ui.arcCenterNumberText}>{financeSummary.avgPerDelivery}</Text>
                <Text style={ui.arcCenterSubText}>GH₵ avg</Text>
              </View>
            </View>
            <View style={ui.arcBaseLabelsRow}>
              <Text style={ui.arcMicroLabelText}>Low</Text>
              <Text style={ui.arcMicroLabelText}>High</Text>
            </View>
          </View>
        </View>

        <View style={ui.analyticsGrid}>
          <View style={ui.metricCard}>
            <View style={ui.cardHeaderInline}>
              <TrendingUp size={14} color={colors.textMuted} />
              <Text style={ui.cardLabelText}>Completion Rate</Text>
            </View>
            <Text style={ui.cardMainValueText}>{financeSummary.completionRate}</Text>
            <View style={ui.timelineVisualSliderRow}>
              <View style={ui.timelineTrackLine}>
                <View style={[ui.timelineProgressFill, { width: financeSummary.completionRate }]} />
                <View style={[ui.timelineThumbDot, { left: financeSummary.completionRate }]} />
              </View>
            </View>
            <Text style={ui.cardFooterDisclaimer}>Orders delivered successfully</Text>
          </View>

          <View style={ui.metricCard}>
            <View style={ui.cardHeaderInline}>
              <Users size={14} color={colors.textMuted} />
              <Text style={ui.cardLabelText}>Weekly Growth</Text>
            </View>
            <Text style={ui.cardMainValueText}>{financeSummary.weeklyGrowth}</Text>
            <View style={ui.splineGraphWrapper}>
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

        <View style={ui.sectionTitleRow}>
          <Text style={ui.sectionHeadlineLabel}>Weekly Earnings</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.weeklyScrollContainer}>
          {loadingWeekly ? (
            <View style={ui.loadingWeeklyContainer}>
              <ActivityIndicator size="small" color={colors.warning} />
            </View>
          ) : (
            weeklyData.map((day, index) => {
              const maxEarning = Math.max(...weeklyData.map(d => d.earnings), 1);
              const barHeight = Math.max((day.earnings / maxEarning) * 80, 4);
              return (
                <View key={index} style={ui.weeklyBarCard}>
                  <View style={ui.weeklyBarWrapper}>
                    <View style={[ui.weeklyBarFill, { height: barHeight }]} />
                  </View>
                  <Text style={ui.weeklyDayLabel}>{day.day}</Text>
                  <Text style={ui.weeklyAmountLabel}>GH₵{day.earnings.toFixed(0)}</Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={ui.sectionTitleRow}>
          <Text style={ui.sectionHeadlineLabel}>50/30/20 Budget</Text>
          <TouchableOpacity
            style={ui.inlineHeaderLinkAction}
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
          contentContainerStyle={ui.budgetBucketsScrollWrapper}
        >
          {(budgetData.length > 0 ? budgetData : buildDefaultBudget(financeSummary.totalEarnings)).map((bucket) => {
            const savedAmount = Math.max(bucket.allocated - bucket.spent, 0);
            const savedPercent = bucket.allocated > 0 ? Math.round((savedAmount / bucket.allocated) * 100) : 0;
            return (
              <TouchableOpacity 
                key={bucket.id} 
                style={ui.budgetBucketCard} 
                activeOpacity={0.8} 
                onPress={() => navigation.navigate("BudgetInsightDetail", { categoryId: bucket.id })}
              >
                <View style={ui.cardHeaderInline}>
                  <View style={[ui.iconCircle, { backgroundColor: bucket.color + "20" }]}>
                    {bucket.icon && BUDGET_ICON_MAP[bucket.icon] && React.createElement(BUDGET_ICON_MAP[bucket.icon], { size: 16, color: bucket.color })}
                  </View>
                  <Text style={ui.cardLabelText}>{bucket.title}</Text>
                </View>
                <Text style={ui.cardMainValueText}>{savedPercent}%</Text>
                <View style={ui.budgetMiniArcContainer}>
                  <View style={ui.miniArcTrack}>
                    <View style={[ui.miniArcFill, { width: savedPercent + "%", backgroundColor: bucket.color }]} />
                  </View>
                </View>
                <Text style={ui.cardFooterDisclaimer}>
                  GH₵{savedAmount.toFixed(0)} saved
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </>
    );
  };

  const renderTransactionsTab = () => (
    <View style={ui.transactionsContainer}>
      <Text style={ui.transactionsPlaceholder}>Transaction history coming soon</Text>
    </View>
  );

  const renderDirectTab = () => (
    <View style={ui.transactionsContainer}>
      <Text style={ui.transactionsPlaceholder}>Direct payouts interface coming soon</Text>
    </View>
  );

  return (
    <View style={ui.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      <View style={ui.headerRow}>
        <View style={ui.profileBadge}>
          <View style={ui.avatarPlaceholder}>
            <DollarSign size={16} color={colors.primary} />
          </View>
          <View style={ui.profileSelectorWrapper}>
            <Text style={ui.headerTitleText}>Finances</Text>
          </View>
        </View>
        <TouchableOpacity style={ui.notificationTrigger} activeOpacity={0.7}>
          <View style={ui.calendarIconMock}>
            <Text style={ui.calendarDateText}>{new Date().getDate()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={ui.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.tabScrollContent}>
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
                style={[ui.tabButton, isSelected && { backgroundColor: colors.backgroundSecondary }]}
                activeOpacity={0.8}
              >
                <Text style={[ui.tabButtonText, { color: isSelected ? colors.text : colors.textMuted, fontWeight: isSelected ? "700" : "600" }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {syncing ? (
        <View style={ui.loadingContainer}>
          <ActivityIndicator size="large" color={colors.warning} />
        </View>
      ) : (
        <ScrollView style={ui.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === "Overview" && renderInsightsTab()}
          {activeTab === "Direct" && renderDirectTab()}
          {activeTab === "Transactions" && renderTransactionsTab()}

          <TouchableOpacity style={ui.actionExportBannerButton} activeOpacity={0.9} onPress={() => navigation.navigate("Reports")}>
            <View style={ui.bannerLeftFlexNode}>
              <PieChart size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <View>
                <Text style={ui.bannerMainHeadingText}>Detailed Reports</Text>
                <Text style={ui.bannerSubTextDesc}>Daily, weekly & monthly breakdowns</Text>
              </View>
            </View>
            <View style={ui.circleDownWrapper}>
              <Text style={{ color: colors.text, fontSize: 12 }}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={ui.actionExportBannerButton} activeOpacity={0.9} onPress={() => navigation.navigate("ManualCashFlow")}>
            <View style={ui.bannerLeftFlexNode}>
              <TrendingUp size={18} color={colors.warning} style={{ marginRight: 12 }} />
              <View>
                <Text style={ui.bannerMainHeadingText}>Manual Cash Flow</Text>
                <Text style={ui.bannerSubTextDesc}>Log inflows and outflows outside the system</Text>
              </View>
            </View>
            <View style={ui.circleDownWrapper}>
              <Text style={{ color: colors.text, fontSize: 12 }}>+</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={ui.actionExportBannerButton} activeOpacity={0.9} onPress={() => navigation.navigate("DeliveryHistory")}>
            <View style={ui.bannerLeftFlexNode}>
              <ClipboardList size={18} color={colors.textMuted} style={{ marginRight: 12 }} />
              <View>
                <Text style={ui.bannerMainHeadingText}>Delivery History</Text>
                <Text style={ui.bannerSubTextDesc}>Review past completed deliveries</Text>
              </View>
            </View>
            <View style={ui.circleDownWrapper}>
              <Text style={{ color: colors.text, fontSize: 12 }}>→</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: Platform.OS === "ios" ? insets.bottom + 40 : 56 }} />
        </ScrollView>
      )}
    </View>
  );
}