import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  Zap,
  TrendingUp,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Gauge,
  Layers,
  Loader2,
  Check,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { getDocuments, where, limit } from "../../services/db";
import { fetchInsights, fetchActionPlans } from "../../services/insightsService";
import { getLocalDateBounds } from "../../services/budgetService";
import { useFocusEffect } from "@react-navigation/native";

export default function SmartInsightsScreen({ navigation }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    operatingCostPerKm: "N/A",
    runwayMonths: "N/A",
    wantsDepletionRate: "0%",
    yieldVsInflation: "N/A",
  });
  const [metricsEarnings, setMetricsEarnings] = useState(0);
  const [outflows, setOutflows] = useState(0);
  const [insights, setInsights] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [revenueResult, manualResult, insightsData, actionsData] = await Promise.all([
        getDocuments("revenue", [where("rider_id", "==", user.uid), limit(100)]),
        getDocuments("manual_entries", [where("rider_id", "==", user.uid), limit(100)]),
        fetchInsights(user.uid),
        fetchActionPlans(user.uid),
      ]);

      const revenue = revenueResult || [];
      const manualEntries = manualResult || [];
      const deliveryEarnings = revenue.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const inflowEarnings = manualEntries.filter((e) => e.type === "inflow").reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const totalEarnings = deliveryEarnings + inflowEarnings;
      const totalDeliveries = revenue.length;
      const outflowTotal = manualEntries.filter((e) => e.type === "outflow").reduce((sum, e) => sum + Number(e.amount || 0), 0);

      console.log("[SmartInsights] Data loaded", {
        totalEarnings,
        totalDeliveries,
        outflowTotal,
        revenueCount: revenue.length,
        manualCount: manualEntries.length,
      });

      const avgCost = totalDeliveries > 0 ? (outflowTotal / totalDeliveries).toFixed(2) : "0.00";
      const runway = totalEarnings > 0 && outflowTotal > 0 ? ((totalEarnings * 0.2) / outflowTotal).toFixed(1) : "0.0";
      const residualWants = totalEarnings * 0.3 - outflowTotal * 0.4;
      const wantsRate = outflowTotal > 0 && totalEarnings * 0.3 > 0
        ? Math.min(100, Math.max(0, Math.round((residualWants / (totalEarnings * 0.3)) * 100)))
        : 0;
      const netMargin = totalEarnings > 0 ? ((totalEarnings - outflowTotal) / totalEarnings * 100).toFixed(1) : "0.0";

      setMetrics({
        operatingCostPerKm: `GHS ${avgCost}`,
        runwayMonths: `${runway} Months`,
        wantsDepletionRate: `${wantsRate}%`,
        yieldVsInflation: totalEarnings > 0 ? `+${netMargin}%` : "N/A",
      });
      setMetricsEarnings(totalEarnings);
      setOutflows(outflowTotal);
      setInsights(insightsData);
      setActions((actionsData || []).filter((a) => a.rider_id === user.uid));
    } catch (e) {
      console.warn("[SmartInsights] load failed:", e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) loadData();
  }, [user?.uid, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const recentInsights = insights.slice(0, 4);
  const actionPlans = actions.slice(0, 3);
  const hasActivity = metricsEarnings > 0 || outflows > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Smart Insights</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <Loader2 size={24} color="#64748b" />
            <Text style={styles.loadingText}>Loading insights...</Text>
          </View>
        ) : (
          <React.Fragment>
            <View style={styles.sectionHeader}>
              <Layers size={16} color="#a855f7" />
              <Text style={styles.sectionTitleText}>Operational Efficiency</Text>
            </View>

            {hasActivity ? (
              <View style={styles.insightGrid}>
                <View style={styles.insightCard}>
                  <View style={styles.cardHeaderInline}>
                    <Gauge size={14} color="#94a3b8" />
                    <Text style={styles.cardLabelText}>True Operating Cost</Text>
                  </View>
                  <Text style={styles.cardMainValueText}>{metrics.operatingCostPerKm}</Text>
                  <Text style={styles.cardUnitText}>per delivery</Text>
                  {outflows > 0 ? (
                    <View style={styles.vectorContainer}>
                      <Svg height="40" width="100%" viewBox="0 0 140 40" preserveAspectRatio="xMidYMidMeet">
                        <Path d="M10,30 Q40,10 70,25 T130,15" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                        <Circle cx="130" cy="15" r="3.5" fill="#ffffff" />
                      </Svg>
                    </View>
                  ) : (
                    <View style={styles.noDataWrap}>
                      <Text style={styles.noDataText}>Log expenses to see cost trajectory</Text>
                    </View>
                  )}
                  <Text style={styles.cardFooterText}>Based on actual delivered deliveries & recorded costs.</Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.cardHeaderInline}>
                    <TrendingUp size={14} color="#94a3b8" />
                    <Text style={styles.cardLabelText}>Net Margin</Text>
                  </View>
                  <Text style={[styles.cardMainValueText, { color: "#22c55e" }]}>{metrics.yieldVsInflation}</Text>
                  <Text style={styles.cardUnitText}>earned vs spent</Text>
                  {outflows > 0 ? (
                    <View style={styles.vectorContainer}>
                      <Svg height="40" width="100%" viewBox="0 0 140 40" preserveAspectRatio="xMidYMidMeet">
                        <Path d="M10,35 Q35,35 50,20 T90,8 T130,25" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
                      </Svg>
                    </View>
                  ) : (
                    <View style={styles.noDataWrap}>
                      <Text style={styles.noDataText}>Add outflows to see margin breakdown</Text>
                    </View>
                  )}
                  <Text style={styles.cardFooterText}>Revenue kept after all recorded expenses.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No activity recorded yet.</Text>
                <Text style={styles.emptySubtext}>Operational metrics will appear once revenue or cash flow is logged.</Text>
              </View>
            )}

            <View style={[styles.sectionHeader, { marginTop: 28 }]}>
              <Clock size={16} color="#6366f1" />
              <Text style={styles.sectionTitleText}>Velocity & Runway Guards</Text>
            </View>

            <View style={styles.bannerInsightCard}>
              <View style={styles.bannerLeftFlex}>
                <View style={[styles.iconCircleContainer, { backgroundColor: "#1e1b4b" }]}>
                  <ShieldCheck size={20} color="#6366f1" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerHeadingText}>Emergency Fund Runway</Text>
                  <Text style={styles.bannerDescriptionText}>
                    Your liquid reserve backing can sustain basic survival demands for exactly <Text style={{ color: "#ffffff", fontWeight: "700" }}>{metrics.runwayMonths}</Text> without active influxes.
                  </Text>
                </View>
              </View>
              {metrics.runwayMonths !== "N/A" && (
                <View style={styles.microArcWrapper}>
                  <Svg height="44" width="44" viewBox="0 0 36 36">
                    <Circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
                    <Circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray="65 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
                  </Svg>
                </View>
              )}
            </View>

            <View style={styles.bannerInsightCard}>
              <View style={styles.bannerLeftFlex}>
                <View style={[styles.iconCircleContainer, { backgroundColor: "#2e1065" }]}>
                  <Zap size={20} color="#a855f7" />
                </View>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerHeadingText}>Discretionary Depletion Rate</Text>
                  <Text style={styles.bannerDescriptionText}>
                    {outflows > 0
                      ? <React.Fragment>You have utilized <Text style={{ color: "#ffffff", fontWeight: "700" }}>{metrics.wantsDepletionRate}</Text> of your 30% Wants bucket.</React.Fragment>
                      : "No expense data recorded yet. Add manual cash flow entries to track discretionary spending."}
                  </Text>
                </View>
              </View>
            </View>

            {hasActivity && recentInsights.length > 0 && (
              <React.Fragment>
                <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                  <TrendingUp size={16} color="#10b981" />
                  <Text style={styles.sectionTitleText}>Recent Signals</Text>
                </View>
                <View style={styles.insightsStack}>
                  {recentInsights.map((insight) => (
                    <View key={insight.id || insight.title} style={styles.rawCard}>
                      <View style={styles.insightHeaderRow}>
                        <View style={styles.insightTitleGroup}>
                          <Text style={styles.insightTitle}>{insight.title}</Text>
                          <View style={[styles.statusTag, {
                            borderColor: insight.type === "warning" ? "#facc1530" : insight.type === "success" ? "#10b98130" : insight.type === "danger" ? "#ef444430" : "#94a3b840"
                          }]}>
                            <Text style={[styles.statusTagText, {
                              color: insight.type === "warning" ? "#facc15" : insight.type === "success" ? "#10b981" : insight.type === "danger" ? "#ef4444" : "#94a3b8"
                            }]}>{insight.type}</Text>
                          </View>
                        </View>
                      </View>
                      <Text style={styles.insightBody}>{insight.body}</Text>
                    </View>
                  ))}
                </View>
              </React.Fragment>
            )}

            {hasActivity && actionPlans.length > 0 && (
              <React.Fragment>
                <View style={[styles.sectionHeader, { marginTop: 28 }]}>
                  <ShieldCheck size={16} color="#10b981" />
                  <Text style={styles.sectionTitleText}>Action Blueprints</Text>
                </View>
                <View style={styles.actionsStack}>
                  {actionPlans.map((action) => (
                    <View key={action.id || action.title} style={styles.actionCard}>
                      <View style={styles.actionHeaderRow}>
                        <View style={[styles.actionIconCircle, { backgroundColor: "#10b98115" }]}>
                          <Check size={14} color="#10b981" />
                        </View>
                        <Text style={styles.actionTitle}>{action.title}</Text>
                      </View>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                    </View>
                  ))}
                </View>
              </React.Fragment>
            )}

            {!hasActivity && insights.length === 0 && actionPlans.length === 0 && (
              <View style={styles.emptyStateWrap}>
                <Text style={styles.emptyStateText}>
                  No insights available yet. Start delivering to generate personalized insights.
                </Text>
              </View>
            )}
          </React.Fragment>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d0f", paddingTop: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 24, paddingBottom: 14, backgroundColor: "#0b0d0f" },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitleText: { fontSize: 18, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  headerRightSpacer: { width: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  loadingWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 14, gap: 8 },
  sectionTitleText: { fontSize: 15, fontWeight: "700", color: "#ffffff", letterSpacing: -0.2 },
  insightGrid: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  insightCard: { backgroundColor: "#16191e", flex: 1, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#ffffff04", gap: 10 },
  rawCard: { backgroundColor: "#16191e", width: "100%", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#ffffff04", gap: 10 },
  cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cardLabelText: { fontSize: 11, fontWeight: "600", color: "#94a3b8" },
  cardMainValueText: { fontSize: 22, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5, marginTop: 4 },
  cardUnitText: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: -2 },
  vectorContainer: { height: 44, justifyContent: "center", alignItems: "center", marginVertical: 6 },
  cardFooterText: { fontSize: 10, fontWeight: "500", color: "#475569", lineHeight: 13 },
  bannerInsightCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#16191e", padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: "#ffffff04" },
  bannerLeftFlex: { flexDirection: "row", alignItems: "flex-start", flex: 1, gap: 14 },
  iconCircleContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  bannerTextContainer: { flex: 1, paddingRight: 4 },
  bannerHeadingText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  bannerDescriptionText: { fontSize: 12, color: "#64748b", fontWeight: "500", marginTop: 4, lineHeight: 16 },
  microArcWrapper: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  insightsStack: { gap: 12, paddingBottom: 8 },
  insightHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  insightTitleGroup: { flex: 1, gap: 6 },
  insightTitle: { fontSize: 14, fontWeight: "800", color: "#ffffff", letterSpacing: -0.2 },
  statusTag: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, backgroundColor: "#0b0d0f" },
  statusTagText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  insightBody: { fontSize: 12, fontWeight: "500", color: "#94a3b8", lineHeight: 17, marginTop: 6 },
  actionsStack: { gap: 12, paddingBottom: 8 },
  actionCard: { backgroundColor: "#16191e", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#ffffff04", gap: 8 },
  actionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionIconCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  actionTitle: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  actionDescription: { fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 17, paddingLeft: 34 },
  emptyStateWrap: { paddingTop: 24, alignItems: "center" },
  emptyStateText: { color: "#64748b", fontSize: 13, fontWeight: "600", textAlign: "center" },
  emptyWrap: { paddingTop: 32, alignItems: "center", gap: 12 },
  emptyText: { color: "#64748b", fontSize: 14, fontWeight: "600", textAlign: "center" },
  emptySubtext: { color: "#475569", fontSize: 12, fontWeight: "500", textAlign: "center" },
  noDataWrap: { height: 44, justifyContent: "center", alignItems: "center", marginVertical: 6 },
  noDataText: { color: "#475569", fontSize: 11, fontWeight: "500", textAlign: "center" },
});
