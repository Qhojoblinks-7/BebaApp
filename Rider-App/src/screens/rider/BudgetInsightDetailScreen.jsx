import React, { useState, useEffect, useMemo } from "react";
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
import { getLiveBudgetWithExpenses, buildDefaultBudget } from "../../services/budgetService";

// Static mapping layout configuration safely pulled outside render lifecycle scope
const INSIGHT_DATA_MAP = {
  needs: {
    title: "50% Needs Deep Dive",
    accentColor: "#a855f7",
    subtitle: "Essential living & core operational overhead",
    burnRateText: "Optimal",
    chartPath: "M 10 100 Q 80 40 160 80 T 240 30 T 320 70 T 390 20",
  },
  wants: {
    title: "30% Wants Deep Dive",
    accentColor: "#6366f1",
    subtitle: "Lifestyle choices & discretionary outlays",
    burnRateText: "Accelerated",
    chartPath: "M 10 100 Q 100 110 200 50 T 300 20 T 390 10",
  },
  savings: {
    title: "20% Savings Deep Dive",
    accentColor: "#10b981",
    subtitle: "Wealth reserves & emergency runway assets",
    burnRateText: "Target Achieved",
    chartPath: "M 10 110 Q 100 90 200 60 T 300 30 T 390 15",
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
  const params = route.params || {};
  const serverBudgetData = params.budgetData;

  const currentInsight = useMemo(() => INSIGHT_DATA_MAP[categoryId] || INSIGHT_DATA_MAP.needs, [categoryId]);

  useEffect(() => {
    let isMounted = true;

    async function loadCategoryData() {
      if (!user?.id) return;
      setLoading(true);
      try {
        let breakdownData = null;

        if (serverBudgetData && serverBudgetData[categoryId]) {
          breakdownData = { [categoryId]: serverBudgetData[categoryId] };
        } else if (serverBudgetData && Array.isArray(serverBudgetData) && serverBudgetData.length > 0) {
          breakdownData = serverBudgetData.reduce((acc, cat) => {
            acc[cat.id] = cat;
            return acc;
          }, {});
        } else {
          const liveData = await getLiveBudgetWithExpenses(user.id);
          if (liveData && Array.isArray(liveData) && liveData.length > 0) {
            breakdownData = liveData.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {});
          } else {
            const fallback = buildDefaultBudget(0);
            breakdownData = fallback.reduce((acc, cat) => {
              acc[cat.id] = cat;
              return acc;
            }, {});
          }
        }

        if (!isMounted) return;

        if (breakdownData && breakdownData[categoryId]) {
          setCategoryData(breakdownData[categoryId]);
        } else {
          setCategoryData(null);
        }

        const [rawInsights, rawActions] = await Promise.all([
          fetchInsightsByCategory(user.id, categoryId),
          fetchActionPlans(user.id),
        ]);

        setInsights(rawInsights);
        setActions(rawActions.filter((a) => a.category === categoryId));
      } catch (e) {
        console.warn("[BudgetInsightDetail] Async pipeline error load crash:", e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCategoryData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, categoryId]);

  // Transform raw row models into sanitized UI arrays via structural useMemo memoizations
  const leaks = useMemo(() => insights.map((ins) => ({
    id: ins.id,
    type: ins.type,
    message: ins.body,
  })), [insights]);

  const optimizations = useMemo(() => actions.map((action) => ({
    title: action.title,
    desc: action.description,
  })), [actions]);

  // FIX 1: Lock component dynamic object style configurations safely in cache memory memory blocks
  const cardDepthShadow = useMemo(() => ({
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDarkMode ? 0.25 : 0.05,
    shadowRadius: 12,
    elevation: 3, 
  }), [isDarkMode]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* HEADER SECTION BAR */}
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
            <Loader2 size={24} color={colors.textMuted} style={styles.spinningLoaderAnimation} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading category insights...</Text>
          </View>
        ) : !categoryData ? (
          <View style={styles.emptyWrap}>
            <AlertTriangle size={32} color={colors.textDisabled} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No budget data available yet for this category.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textDisabled }]}>Deliveries and cash flow entries will generate insights.</Text>
          </View>
        ) : (
          <>
            {/* HERO PANELS SUMMARY MATRIX BOX */}
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
                    {currentInsight.burnRateText}
                  </Text>
                </View>
                <View style={[styles.statusIndicatorPill, { backgroundColor: currentInsight.accentColor + "15" }]}>
                  <Text style={[styles.statusPillText, { color: currentInsight.accentColor }]}>
                    Active Scan
                  </Text>
                </View>
              </View>
            </View>

            {/* TRAJECTORY DATA GRAPH PLOT AREA CARD */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleText, { color: colors.textSecondary }]}>Velocity Trajectory (30 Days)</Text>
            </View>

            <View style={[styles.chartContainerCard, cardDepthShadow, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
              <View style={styles.chartYAxisLegends}>
                <Text style={[styles.axisLegendText, { color: colors.textDisabled }]}>Max</Text>
                <Text style={[styles.axisLegendText, { color: colors.textDisabled }]}>Mid</Text>
                <Text style={[styles.axisLegendText, { color: colors.textDisabled }]}>Min</Text>
              </View>

              <View style={styles.svgCanvasWrapper}>
                {/* FIX 2: Restored standard aspect bounding box paths to prevent line squishing */}
                <Svg height="100%" width="100%" viewBox="0 0 400 120">
                  <Path
                    d={currentInsight.chartPath}
                    fill="none"
                    stroke={currentInsight.accentColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>

            {/* ERROR LEAK BARS BLOCK */}
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

            {/* ACTION PLAN BLUEPRINTS BLOCK */}
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

            {/* COURIER EMPTY PLACEHOLDER FEEDBACK TILES */}
            {leaks.length === 0 && optimizations.length === 0 && (
              <View style={styles.emptyWrap}>
                <ShieldCheck size={28} color={colors.success} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Budget structure stable.</Text>
                <Text style={[styles.emptySubtext, { color: colors.textDisabled }]}>No structural leakage variants found for this sector range tracking cycle.</Text>
              </View>
            )}

            <View style={styles.bottomSpacerPadding} />
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
  loadingWrap: { paddingTop: 60, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  spinningLoaderAnimation: { transform: [{ rotate: "0deg" }] }, 
  heroSummaryCard: {
    borderRadius: 24,
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
    marginTop: 6,
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
    fontWeight: "700",
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
    height: 140,
    alignItems: "center",
    borderWidth: 1,
  },
  chartYAxisLegends: {
    height: "100%",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginRight: 16,
  },
  axisLegendText: {
    fontSize: 10,
    fontWeight: "700",
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
    marginTop: 6,
  },
  leakMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
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
    lineHeight: 18,
    paddingLeft: 26,
  },
  emptyWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  emptySubtext: { fontSize: 12, fontWeight: "500", textAlign: "center", marginTop: 2, lineHeight: 17 },
  bottomSpacerPadding: { height: 60 }
});