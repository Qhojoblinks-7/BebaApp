import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2,
  ArrowLeft,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { fetchInsightsByCategory, fetchActionPlans } from "../../services/insightsService";
import { fetchBudgetBreakdownData } from "../../services/budgetService";

const INSIGHT_DATA_MAP = {
  needs: {
    title: "50% Needs deep dive",
    accentColor: "#a855f7",
    subtitle: "Essential living & core operational overhead",
    burnRateText: "Optimal",
    chartPath: "M 10 35 Q 40 15 80 28 T 160 8 T 240 32 T 320 12 T 390 5",
  },
  wants: {
    title: "30% Wants deep dive",
    accentColor: "#6366f1",
    subtitle: "Lifestyle choices & discretionary outlays",
    burnRateText: "Accelerated",
    chartPath: "M 10 35 Q 50 38 100 20 T 200 5 T 300 2 T 390 1",
  },
  savings: {
    title: "20% Savings deep dive",
    accentColor: "#10b981",
    subtitle: "Wealth reserves & emergency runway assets",
    burnRateText: "Target Achieved",
    chartPath: "M 10 38 Q 60 35 120 25 T 240 15 T 390 8",
  },
};

export default function BudgetInsightDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const { categoryId } = route.params || { categoryId: "needs" };
  const [categoryData, setCategoryData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentInsight = INSIGHT_DATA_MAP[categoryId] || INSIGHT_DATA_MAP.needs;

  useEffect(() => {
    if (user?.id) {
      loadCategoryData();
    }
  }, [user?.id, categoryId]);

  const loadCategoryData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [breakdownData, rawInsights, rawActions] = await Promise.all([
        fetchBudgetBreakdownData(user.id),
        fetchInsightsByCategory(user.id, categoryId),
        fetchActionPlans(user.id),
      ]);

      if (breakdownData && breakdownData[categoryId]) {
        setCategoryData(breakdownData[categoryId]);
      } else {
        setCategoryData(null);
      }

      setInsights(rawInsights);
      const categoryActions = rawActions.filter((a) => a.category === categoryId);
      setActions(categoryActions);
    } catch (e) {
      console.warn("[BudgetInsightDetail] load failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const noData = !loading && !categoryData;

  const leaks = insights.map((ins) => ({
    id: ins.id,
    type: ins.type,
    message: ins.body,
  }));

  const optimizations = actions.map((action) => ({
    title: action.title,
    desc: action.description,
  }));

  // Memory optimized drop-shadow layout configs
  const cardDepthShadow = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDarkMode ? 0.28 : 0.06,
    shadowRadius: 14,
    elevation: 4, 
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={[styles.headerRow, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Insight Analytics</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <Loader2 size={24} color={colors.textMuted} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading insights...</Text>
          </View>
        ) : noData ? (
          <View style={styles.emptyWrap}>
            <AlertTriangle size={32} color={colors.textDisabled} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No budget data available yet for this category.</Text>
            <Text style={styles.emptySubtext}>Deliveries and cash flow entries will generate insights.</Text>
          </View>
        ) : (
          <>
            {/* HERO SUMMARY CARD */}
            <View style={[styles.heroSummaryCard, cardDepthShadow, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
              <Text style={[styles.heroBadgeText, { color: currentInsight.accentColor }]}>
                {currentInsight.title}
              </Text>
              <Text style={[styles.heroSubtitleText, { color: colors.textSecondary }]}>
                {currentInsight.subtitle}
              </Text>

              <View style={styles.heroStatsFooter}>
                <View>
                  <Text style={[styles.labelStaticText, { color: colors.textDisabled }]}>Monthly Exhaust Flow</Text>
                  <Text style={[styles.mainValueText, { color: colors.text }]}>
                    {categoryData ? currentInsight.burnRateText : "No Data"}
                  </Text>
                </View>
                <View style={[styles.statusIndicatorPill, { backgroundColor: currentInsight.accentColor + "15" }]}>
                  <Text style={[styles.statusPillText, { color: currentInsight.accentColor }]}>
                    {categoryData ? "Active Scan" : "Idle"}
                  </Text>
                </View>
              </View>
            </View>

            {categoryData ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitleText, { color: colors.textSecondary }]}>Velocity Trajectory (30 Days)</Text>
                </View>

                {/* CHART CONTAINER CARD */}
                <View style={[styles.chartContainerCard, cardDepthShadow, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
                  <View style={styles.chartYAxisLegends}>
                    <Text style={[styles.axisLegendText, { color: colors.textDisabled }]}>Max</Text>
                    <Text style={[styles.axisLegendText, { color: colors.textDisabled }]}>Mid</Text>
                    <Text style={[styles.axisLegendText, { color: colors.textDisabled }]}>Min</Text>
                  </View>

                  <View style={styles.svgCanvasWrapper}>
                    {/* Fixed aspect ratio scale map layout box container */}
                    <Svg height="100%" width="100%" viewBox="0 0 400 40" preserveAspectRatio="none">
                      <Path
                        d={currentInsight.chartPath}
                        fill="none"
                        stroke={currentInsight.accentColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No activity recorded yet.</Text>
                <Text style={styles.emptySubtext}>Charts will appear once budget data exists.</Text>
              </View>
            )}

            {/* DETECTED LEAKS */}
            {leaks.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <AlertTriangle size={15} color={colors.warning} />
                  <Text style={[styles.sectionTitleText, { color: colors.textSecondary }]}>Detected Outflow Flaws</Text>
                </View>

                {leaks.map((leak) => (
                  <View key={leak.id} style={[styles.leakNotificationBar, { backgroundColor: colors.dangerLight, borderColor: colors.danger + "15" }]}>
                    <View style={styles.leakLeftNode}>
                      <View
                        style={[
                          styles.leakIndicatorDot,
                          { backgroundColor: leak.type === "danger" || leak.type === "warning" ? colors.danger : colors.success }
                        ]}
                      />
                      <Text style={[styles.leakMessageText, { color: colors.text }]}>{leak.message}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* STRATEGIC OPTIMIZATIONS */}
            {optimizations.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                  <ShieldCheck size={15} color={colors.success} />
                  <Text style={[styles.sectionTitleText, { color: colors.textSecondary }]}>Strategic Action Blueprints</Text>
                </View>

                {optimizations.map((opt, index) => (
                  <View key={index} style={[styles.optimizationStrategyCard, cardDepthShadow, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
                    <View style={styles.strategyHeaderRow}>
                      <CheckCircle2 size={16} color={currentInsight.accentColor} />
                      <Text style={[styles.strategyTitleText, { color: colors.text }]}>{opt.title}</Text>
                    </View>
                    <Text style={[styles.strategyDescriptionText, { color: colors.textMuted }]}>{opt.desc}</Text>
                  </View>
                ))}
              </>
            )}

            {leaks.length === 0 && optimizations.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No insights or actions available yet.</Text>
                <Text style={styles.emptySubtext}>Insights will appear as activity is recorded.</Text>
              </View>
            )}

            <View style={{ height: 60 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerRightSpacer: { width: 38 },
  scrollContainer: { flex: 1 },
  loadingWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  heroSummaryCard: {
    borderRadius: 28,
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitleText: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 18,
  },
  heroStatsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 24,
  },
  labelStaticText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  mainValueText: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  statusIndicatorPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 20,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  chartContainerCard: {
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    height: 130,
    alignItems: "center",
    borderWidth: 1,
  },
  chartYAxisLegends: {
    height: "100%",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginRight: 12,
  },
  axisLegendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  svgCanvasWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
  },
  leakNotificationBar: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  leakLeftNode: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  leakIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  leakMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  optimizationStrategyCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  strategyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  strategyTitleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  strategyDescriptionText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    paddingLeft: 26,
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  emptySubtext: { fontSize: 12, fontWeight: "500", textAlign: "center", marginTop: 4 },
});