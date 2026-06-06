import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { 
  CheckCircle2, 
  ArrowUpRight, 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  Loader2,
  ArrowLeft,
  TrendingUp,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { fetchInsightsByCategory, fetchActionPlans } from "../../services/insightsService";
import { fetchBudgetBreakdownData } from "../../services/budgetService";

const INSIGHT_DATA_MAP = {
  needs: {
    title: "50% Needs deep dive",
    accentColor: "#a855f7",
    subtitle: "Essential living & core operational overhead",
    burnRateText: "Optimal",
    chartPath:
      "M 0 35 Q 30 15 60 28 T 120 8 T 180 32 T 240 12 T 300 5",
  },
  wants: {
    title: "30% Wants deep dive",
    accentColor: "#6366f1",
    subtitle: "Lifestyle choices & discretionary outlays",
    burnRateText: "Accelerated",
    chartPath:
      "M 0 35 Q 40 38 80 20 T 160 5 T 240 2 T 300 1",
  },
  savings: {
    title: "20% Savings deep dive",
    accentColor: "#10b981",
    subtitle: "Wealth reserves & emergency runway assets",
    burnRateText: "Target Achieved",
    chartPath:
      "M 0 38 Q 50 35 100 25 T 200 15 T 300 8",
  },
};

export default function BudgetInsightDetailScreen({ route, navigation }) {
  const { user } = useAuth();
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

  const optimizations = actions.map((action, idx) => ({
    title: action.title,
    desc: action.description,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />

      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Insight Analytics</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <Loader2 size={24} color="#64748b" />
            <Text style={styles.loadingText}>Loading insights...</Text>
          </View>
        ) : noData ? (
          <View style={styles.emptyWrap}>
            <AlertTriangle size={32} color="#334155" />
            <Text style={styles.emptyText}>No budget data available yet for this category.</Text>
            <Text style={styles.emptySubtext}>Deliveries and cash flow entries will generate insights.</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroSummaryCard}>
              <Text
                style={[
                  styles.heroBadgeText,
                  { color: currentInsight.accentColor },
                ]}
              >
                {currentInsight.title}
              </Text>
              <Text style={styles.heroSubtitleText}>
                {currentInsight.subtitle}
              </Text>

            <View style={styles.heroStatsFooter}>
              <View>
                <Text style={styles.labelStaticText}>
                  Monthly Exhaust Flow
                </Text>
                <Text style={styles.mainValueText}>
                  {categoryData ? currentInsight.burnRateText : "No Data"}
                </Text>
              </View>
              <View
                style={[
                  styles.statusIndicatorPill,
                  { backgroundColor: currentInsight.accentColor + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: currentInsight.accentColor },
                  ]}
                >
                  {categoryData ? "Active Scan" : "Idle"}
                </Text>
              </View>
            </View>
          </View>

          {categoryData ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitleText}>Velocity Trajectory (30 Days)</Text>
              </View>

              <View style={styles.chartContainerCard}>
                <View style={styles.chartYAxisLegends}>
                  <Text style={styles.axisLegendText}>Max</Text>
                  <Text style={styles.axisLegendText}>Mid</Text>
                  <Text style={styles.axisLegendText}>Min</Text>
                </View>

                <View style={styles.svgCanvasWrapper}>
                  <Svg
                    height="100"
                    width={width - 80}
                    viewBox={`0 0 ${width - 80} 40`}
                  >
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
              <Text style={styles.emptyText}>No activity recorded yet.</Text>
              <Text style={styles.emptySubtext}>Charts will appear once budget data exists.</Text>
            </View>
          )}

            {leaks.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <AlertTriangle size={15} color="#facc15" />
                  <Text style={styles.sectionTitleText}>
                    Detected Outflow Flaws
                  </Text>
                </View>

                {leaks.map((leak) => (
                  <View key={leak.id} style={styles.leakNotificationBar}>
                    <View style={styles.leakLeftNode}>
                      <View
                        style={[
                          styles.leakIndicatorDot,
                          {
                            backgroundColor:
                              leak.type === "danger" || leak.type === "warning"
                                ? "#ef4444"
                                : "#10b981",
                          },
                        ]}
                      />
                      <Text style={styles.leakMessageText}>{leak.message}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {optimizations.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                  <ShieldCheck size={15} color="#10b981" />
                  <Text style={styles.sectionTitleText}>
                    Strategic Action Blueprints
                  </Text>
                </View>

                {optimizations.map((opt, index) => (
                  <View key={index} style={styles.optimizationStrategyCard}>
                    <View style={styles.strategyHeaderRow}>
                      <CheckCircle2
                        size={16}
                        color={currentInsight.accentColor}
                      />
                      <Text style={styles.strategyTitleText}>{opt.title}</Text>
                    </View>
                    <Text style={styles.strategyDescriptionText}>{opt.desc}</Text>
                  </View>
                ))}
              </>
            )}

            {leaks.length === 0 && optimizations.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No insights or actions available yet.</Text>
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

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d0f", paddingTop: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#16191e",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#16191e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff05",
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  headerRightSpacer: { width: 38 },
  scrollContainer: { flex: 1 },
  loadingWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  heroSummaryCard: {
    backgroundColor: "#16191e",
    borderRadius: 28,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  heroBadgeText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  heroSubtitleText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
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
    color: "#475569",
    textTransform: "uppercase",
  },
  mainValueText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
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
    marginTop: 22,
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 4,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8",
  },
  chartContainerCard: {
    backgroundColor: "#16191e",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    height: 130,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff04",
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
    color: "#334155",
  },
  svgCanvasWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
  },
  leakNotificationBar: {
    backgroundColor: "#1c1212",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ef444415",
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
    color: "#e2e8f0",
    lineHeight: 17,
  },
  optimizationStrategyCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ffffff04",
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
    color: "#ffffff",
  },
  strategyDescriptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    lineHeight: 17,
    paddingLeft: 26,
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: "#64748b", fontSize: 14, fontWeight: "600", textAlign: "center" },
  emptySubtext: { color: "#475569", fontSize: 12, fontWeight: "500", textAlign: "center", marginTop: 4 },
});
