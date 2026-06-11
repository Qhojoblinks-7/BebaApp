import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Target,
  ChevronDown,
  ChevronUp,
  Brain,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { getDocuments, where } from "../../services/db";
import { fetchInsights } from "../../services/insightsService";
import { useRevenueForecast } from "../../hooks/useRevenueForecast";
import { generateAndStoreActionPlans } from "../../services/actionPlanService";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.44;

function getStartOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getStartOfMonth(d) {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfMonth(d) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getPeriodRange(period, startDate, endDate) {
  const now = new Date();
  if (period === "daily") {
    const start = getStartOfDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end, prevStart: new Date(start.getTime() - 24 * 60 * 60 * 1000), prevEnd: start };
  }
  if (period === "weekly") {
    const monday = getMonday(now);
    const start = monday;
    const end = new Date(monday);
    end.setDate(end.getDate() + 7);
    const prevStart = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEnd = monday;
    return { start, end, prevStart, prevEnd };
  }
  if (period === "monthly") {
    const start = getStartOfMonth(now);
    const end = getEndOfMonth(now);
    const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    const prevEnd = start;
    return { start, end, prevStart, prevEnd };
  }
  if (period === "custom" && startDate && endDate) {
    const start = getStartOfDay(startDate);
    const end = getStartOfDay(endDate);
    end.setDate(end.getDate() + 1);
    const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const prevEnd = start;
    return { start, end, prevStart, prevEnd };
  }
  const start = getStartOfMonth(now);
  const end = getEndOfMonth(now);
  return { start, end, prevStart: new Date(start.getFullYear(), start.getMonth() - 1, 1), prevEnd: start };
}

async function fetchMetricsForRange(userId, start, end) {
  const revenue = await getDocuments("revenue", [where("rider_id", "==", userId)]);
  const orders = await getDocuments("orders", [where("rider_id", "==", userId)]);
  const inflows = await getDocuments("manual_entries", [where("rider_id", "==", userId), where("type", "==", "inflow")]);
  const outflows = await getDocuments("manual_entries", [where("rider_id", "==", userId), where("type", "==", "outflow")]);

  const startMs = start.getTime();
  const endMs = end.getTime();

  const inRange = (item) => {
    const t = item.order_completed_at ? new Date(item.order_completed_at).getTime() : 0;
    return t >= startMs && t < endMs;
  };
  const inRangeOrder = (item) => {
    const t = item.created_at ? new Date(item.created_at).getTime() : 0;
    return t >= startMs && t < endMs;
  };
  const inRangeEntry = (item) => {
    const t = item.occurred_at ? new Date(item.occurred_at).getTime() : 0;
    return t >= startMs && t < endMs;
  };

  const filteredRevenue = (revenue || []).filter(inRange);
  const filteredOrders = (orders || []).filter(inRangeOrder);
  const filteredInflows = (inflows || []).filter(inRangeEntry);
  const filteredOutflows = (outflows || []).filter(inRangeEntry);

  const deliveryEarnings = (filteredRevenue || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const externalIncome = (filteredInflows || []).reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0);
  const totalEarnings = deliveryEarnings + externalIncome;
  const totalOutflows = (filteredOutflows || []).reduce((sum, r) => sum + Math.abs(Number(r.amount || 0)), 0);
  const totalCompletions = (filteredOrders || []).filter((o) => o.status === "delivered").length;
  const totalOrders = (filteredOrders || []).length;
  const completionRate = totalOrders > 0 ? Math.round((totalCompletions / totalOrders) * 100) : 0;

  const outflowByCategory = { needs: 0, wants: 0, savings: 0 };
  (filteredOutflows || []).forEach((entry) => {
    const amount = Math.abs(Number(entry.amount || 0));
    const cat = entry.category;
    if (cat === "needs" || cat === "wants" || cat === "savings") {
      outflowByCategory[cat] += amount;
    } else {
      outflowByCategory.needs += amount * 0.5;
      outflowByCategory.wants += amount * 0.3;
      outflowByCategory.savings += amount * 0.2;
    }
  });

  return { totalEarnings, totalCompletions, completionRate, totalOrders, totalOutflows, outflowByCategory };
}

export default function ReportsScreen({ route, navigation }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState(route?.params?.period || "monthly");
  const [expandedInsight, setExpandedInsight] = useState(null);
  
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  
  // Scoped modal selections to prevent rapid recalculation triggers
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [dateMode, setDateMode] = useState("start"); // "start" or "end"
  const [tempDate, setTempDate] = useState(new Date());
  
  const [showDateModal, setShowDateModal] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodOutflows, setPeriodOutflows] = useState(0);
  const [outflowByCategory, setOutflowByCategory] = useState({ needs: 0, wants: 0, savings: 0 });

  const { forecast, loading: forecastLoadingState } = useRevenueForecast(user?.uid, 7);

  const range = useMemo(
    () => getPeriodRange(period, startDate, endDate),
    [period, startDate, endDate],
  );

  const loadData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [current, previous] = await Promise.all([
        fetchMetricsForRange(user.uid, range.start, range.end),
        fetchMetricsForRange(user.uid, range.prevStart, range.prevEnd),
      ]);

      setPeriodOutflows(current.totalOutflows);
      setOutflowByCategory(current.outflowByCategory);

      const earningsDelta = previous.totalEarnings > 0 ? ((current.totalEarnings - previous.totalEarnings) / previous.totalEarnings) * 100 : current.totalEarnings > 0 ? 100 : 0;
      const completionDelta = previous.completionRate > 0 ? ((current.completionRate - previous.completionRate) / previous.completionRate) * 100 : current.completionRate > 0 ? 100 : 0;
      const completionsDelta = previous.totalCompletions > 0 ? ((current.totalCompletions - previous.totalCompletions) / previous.totalCompletions) * 100 : 0;

      setMetrics({
        completionRate: current.completionRate,
        totalEarnings: current.totalEarnings,
        totalCompletions: current.totalCompletions,
        totalOrders: current.totalOrders,
        prevCompletionRate: previous.completionRate,
        prevTotalEarnings: previous.totalEarnings,
        prevTotalCompletions: previous.totalCompletions,
        earningsDelta,
        completionDelta,
        completionsDelta,
      });

      const insightsData = await fetchInsights(user.uid);
      setInsights(insightsData);

      const plans = await generateAndStoreActionPlans(user.uid);
      setActionPlans(plans);
    } catch (err) {
      console.warn("[Reports] load failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.uid, period, startDate, endDate]);

  const earnings = metrics?.totalEarnings || 0;
  const totalOutflows = periodOutflows;
  const needsAllocated = earnings * 0.5;
  const wantsAllocated = earnings * 0.3;
  const savingsAllocated = earnings * 0.2;

  const hasActivity = earnings > 0;

  const renderDelta = (delta) => {
    if (!delta || delta === 0) return null;
    const isUp = delta >= 0;
    return (
      <View style={styles.deltaRow}>
        {isUp ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#ef4444" />}
        <Text style={[styles.deltaText, { color: isUp ? "#10b981" : "#ef4444" }]}>
          {delta >= 0 ? "+" : ""}{Math.abs(delta).toFixed(1)}%
        </Text>
      </View>
    );
  };

  const getProgressColor = (rate) => {
    if (rate >= 90) return "#10b981";
    if (rate >= 75) return "#facc15";
    return "#ef4444";
  };

  const ProgressArc = ({ value, size = 56, strokeWidth = 4, color }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.min(Math.max(value, 0), 100);
    const strokeDashoffset = circumference - (clamped / 100) * circumference;
    return (
      <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={strokeWidth} />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={StyleSheet.absoluteFill}>
          <View style={{ justifyContent: "center", alignItems: "center", width: size, height: size }}>
            <Text style={styles.arcPercentageText}>{Math.round(value)}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const mappedInsights = useMemo(() => {
    if (insights.length === 0) return [];
    return insights.map((item, idx) => ({
      id: item.id || String(idx),
      title: item.title,
      body: item.body,
      tag: item.type === "warning" ? "Alert" : item.type === "success" ? "Stable" : item.type === "danger" ? "Action" : "Info",
    }));
  }, [insights]);

  // Handle open modal configuration with existing values
  const handleOpenCustomPicker = () => {
    const currentStart = startDate || new Date();
    const currentEnd = endDate || new Date();
    setTempStartDate(currentStart);
    setTempEndDate(currentEnd);
    setTempDate(dateMode === "start" ? currentStart : currentEnd);
    setShowDateModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Reports</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.periodSelectorRow}>
          {["daily", "weekly", "monthly", "custom"].map((p) => {
            const isSelected = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.periodChip, isSelected && styles.activePeriodChip]}
                activeOpacity={0.8}
                onPress={() => {
                  if (p === "custom") {
                    handleOpenCustomPicker();
                  } else {
                    setPeriod(p);
                    setStartDate(null);
                    setEndDate(null);
                  }
                }}
              >
                <Text style={[styles.periodChipText, isSelected && styles.activePeriodChipText]}>
                  {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : p === "monthly" ? "Monthly" : "Custom"}
                </Text>
              </TouchableOpacity>
            );
          })}
          {period === "custom" && startDate && endDate && (
            <View style={styles.selectedDatePill}>
              <Text style={styles.selectedDateText}>
                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
              </Text>
              <TouchableOpacity onPress={() => { setStartDate(null); setEndDate(null); setPeriod("monthly"); }}>
                <Text style={styles.clearDateText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#facc15" />
          </View>
        ) : !hasActivity ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No report data available for this period.</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsScrollRow}>
              <View style={styles.metricCard}>
                <View style={styles.cardHeaderInline}>
                  <Target size={14} color="#94a3b8" />
                  <Text style={styles.cardLabelText}>Completion Rate</Text>
                </View>
                <View style={styles.progressRow}>
                  <ProgressArc value={metrics.completionRate} color={getProgressColor(metrics.completionRate)} />
                </View>
                <View style={styles.footerStack}>
                  {renderDelta(metrics.completionDelta)}
                  <Text style={styles.disclaimerText}>Orders delivered successfully</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.cardHeaderInline}>
                  <Wallet size={14} color="#94a3b8" />
                  <Text style={styles.cardLabelText}>Total Earnings</Text>
                </View>
                <Text style={styles.valuePrimaryText}>GH₵ {metrics.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                <View style={styles.footerStack}>
                  {renderDelta(metrics.earningsDelta)}
                  <Text style={styles.disclaimerText}>Gross rider payout</Text>
                </View>
              </View>

              <View style={styles.metricCard}>
                <View style={styles.cardHeaderInline}>
                  <PieChart size={14} color="#94a3b8" />
                  <Text style={styles.cardLabelText}>Total Completions</Text>
                </View>
                <Text style={styles.valuePrimaryText}>{metrics.totalCompletions.toLocaleString()}</Text>
                <View style={styles.footerStack}>
                  {renderDelta(metrics.completionsDelta)}
                  <Text style={styles.disclaimerText}>Deliveries closed</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleText}>Budget Allocation</Text>
              <View style={[styles.badgePill, { backgroundColor: "#115e5920" }]}>
                <Text style={[styles.badgeText, { color: "#115e59" }]}>50/30/20</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.budgetRollRow}>
              {earnings > 0 ? [
                {
                  id: "needs",
                  title: "Needs",
                  allocated: needsAllocated,
                  used: outflowByCategory.needs,
                  color: "#a855f7",
                },
                {
                  id: "wants",
                  title: "Wants",
                  allocated: wantsAllocated,
                  used: outflowByCategory.wants,
                  color: "#6366f1",
                },
                {
                  id: "savings",
                  title: "Savings",
                  allocated: savingsAllocated,
                  used: outflowByCategory.savings,
                  color: "#10b981",
                },
              ].map((bucket) => {
                const usedPercent = bucket.allocated > 0 ? Math.min(Math.round((bucket.used / bucket.allocated) * 100), 100) : 0;
                return (
                  <View key={bucket.id} style={styles.budgetBucketCard}>
                    <Text style={styles.bucketLabel}>{bucket.title}</Text>
                    <Text style={styles.bucketValue}>GH₵ {bucket.allocated.toFixed(2)}</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${usedPercent}%`, backgroundColor: bucket.color }]} />
                    </View>
                    <Text style={styles.bucketShare}>
                      {bucket.id === "savings" ? "Saved" : "Spent"} · {usedPercent}%
                    </Text>
                  </View>
                );
              }) : (
                <View style={[styles.budgetBucketCard, { width: CARD_WIDTH * 3 + 24 }]}>
                  <Text style={[styles.bucketLabel, { textAlign: "center", width: "100%" }]}>No earnings this period</Text>
                </View>
              )}
            </ScrollView>

            {forecast && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleText}>AI Forecast</Text>
                  <View style={[styles.badgePill, { backgroundColor: "#6366f120" }]}>
                    <Sparkles size={12} color="#6366f1" />
                    <Text style={[styles.badgeText, { color: "#6366f1", marginLeft: 4 }]}>AI-Powered</Text>
                  </View>
                </View>

                <View style={styles.forecastCard}>
                  <View style={styles.forecastHeaderRow}>
                    <Brain size={18} color="#6366f1" />
                    <Text style={styles.forecastTitle}>Next Week Prediction</Text>
                  </View>
                  <Text style={styles.forecastValue}>GH₵ {forecast.predictedEarnings?.toLocaleString() || 0}</Text>
                  <View style={styles.forecastMetaRow}>
                    <Text style={styles.forecastMeta}>Confidence: {forecast.confidence}%</Text>
                    <Text style={styles.forecastMeta}>Trend: {forecast.trend}</Text>
                  </View>
                  {forecast.recommendations?.length > 0 && (
                    <View style={styles.recommendationsList}>
                      {forecast.recommendations.slice(0, 2).map((rec, idx) => (
                        <Text key={idx} style={styles.recommendationText}>• {rec}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {actionPlans.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleText}>Action Plans</Text>
                </View>

                <View style={styles.actionPlansStack}>
                  {actionPlans.map((plan) => (
                    <View key={plan.id} style={styles.actionPlanCard}>
                      <View style={styles.actionPlanHeader}>
                        <Text style={styles.actionPlanTitle}>{plan.title}</Text>
                        <View style={[
                          styles.priorityBadge,
                          { backgroundColor: plan.priority === "high" ? "#ef444420" : plan.priority === "medium" ? "#facc1520" : "#10b98120" }
                        ]}>
                          <Text style={[
                            styles.priorityText,
                            { color: plan.priority === "high" ? "#ef4444" : plan.priority === "medium" ? "#facc15" : "#10b981" }
                          ]}>
                            {plan.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.actionPlanDescription}>{plan.description}</Text>
                      <Text style={styles.actionPlanSuggestion}>{plan.suggestedAction}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {mappedInsights.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleText}>Insights</Text>
                </View>

                <View style={styles.insightsStack}>
                  {mappedInsights.map((item) => {
                    const isOpen = expandedInsight === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.insightCard}
                        activeOpacity={0.8}
                        onPress={() => setExpandedInsight(isOpen ? null : item.id)}
                      >
                        <View style={styles.insightHeaderRow}>
                          <View style={styles.insightTitleGroup}>
                            <Text style={styles.insightTitle}>{item.title}</Text>
                            <View style={[styles.statusTag, { borderColor: "#94a3b840" }]}>
                              <Text style={styles.statusTagText}>{item.tag}</Text>
                            </View>
                          </View>
                          {isOpen ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                        </View>
                        {isOpen && <Text style={styles.insightBody}>{item.body}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {showDateModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <View style={styles.presetRow}>
              {[
                { label: "Today", days: 0 },
                { label: "Last 7 Days", days: 7 },
                { label: "Last 30 Days", days: 30 },
                { label: "This Month", days: "month" },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.presetChip}
                  activeOpacity={0.8}
                  onPress={() => {
                    const now = new Date();
                    let start = new Date(now);
                    if (preset.days === 0) {
                      start.setHours(0, 0, 0, 0);
                    } else if (preset.days === "month") {
                      start = new Date(now.getFullYear(), now.getMonth(), 1);
                    } else {
                      start.setDate(now.getDate() - preset.days);
                      start.setHours(0, 0, 0, 0);
                    }
                    setTempStartDate(start);
                    setTempEndDate(now);
                    setTempDate(dateMode === "start" ? start : now);
                  }}
                >
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateInputRow}>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Start</Text>
                <TouchableOpacity 
                  style={[styles.dateInput, dateMode === "start" && { borderColor: "#10b981" }]} 
                  activeOpacity={0.8} 
                  onPress={() => { setDateMode("start"); setTempDate(tempStartDate); }}
                >
                  <Text style={styles.dateInputText}>{tempStartDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>End</Text>
                <TouchableOpacity 
                  style={[styles.dateInput, dateMode === "end" && { borderColor: "#10b981" }]} 
                  activeOpacity={0.8} 
                  onPress={() => { setDateMode("end"); setTempDate(tempEndDate); }}
                >
                  <Text style={styles.dateInputText}>{tempEndDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.datePickerRow}>
              <Text style={styles.pickerLabel}>
                {tempDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity 
                  style={styles.stepperButton} 
                  activeOpacity={0.8} 
                  onPress={() => { 
                    const d = new Date(tempDate); 
                    d.setDate(d.getDate() - 1); 
                    setTempDate(d);
                    if (dateMode === "start") setTempStartDate(d); else setTempEndDate(d);
                  }}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.stepperButton} 
                  activeOpacity={0.8} 
                  onPress={() => { 
                    const d = new Date(tempDate); 
                    d.setDate(d.getDate() + 1); 
                    setTempDate(d);
                    if (dateMode === "start") setTempStartDate(d); else setTempEndDate(d);
                  }}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity 
                style={styles.applyRangeButton} 
                activeOpacity={0.8} 
                onPress={() => { 
                  if (tempStartDate <= tempEndDate) {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setPeriod("custom");
                    setShowDateModal(false);
                  } else {
                    alert("Start date must be before or equal to end date.");
                  }
                }}
              >
                <Text style={styles.applyRangeButtonText}>Apply Range</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={() => setShowDateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d0f", paddingTop: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16191e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  headerTitleText: { fontSize: 20, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  emptyState: { paddingTop: 40, alignItems: "center" },
  emptyText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
  periodSelectorRow: { flexDirection: "row", gap: 8, marginBottom: 18, marginTop: 4, flexWrap: "wrap" },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#16191e",
    borderWidth: 1,
    borderColor: "#ffffff0a",
  },
  activePeriodChip: { backgroundColor: "#1e222b", borderColor: "#ffffff10" },
  periodChipText: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "capitalize" },
  activePeriodChipText: { color: "#ffffff" },
  metricsScrollRow: { gap: 12, marginBottom: 22 },
  metricCard: {
    backgroundColor: "#16191e",
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 10,
  },
  cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardLabelText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  progressRow: { justifyContent: "center", alignItems: "center", paddingVertical: 6 },
  arcPercentageText: { fontSize: 16, fontWeight: "800", color: "#ffffff", letterSpacing: -0.4 },
  valuePrimaryText: { fontSize: 26, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  footerStack: { gap: 6 },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  deltaText: { fontSize: 12, fontWeight: "700" },
  disclaimerText: { fontSize: 11, fontWeight: "500", color: "#64748b", marginTop: 2, lineHeight: 14 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitleText: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  badgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  budgetRollRow: { gap: 12, paddingRight: 20, marginBottom: 24 },
  budgetBucketCard: {
    backgroundColor: "#16191e",
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 8,
  },
  bucketLabel: { fontSize: 13, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.4 },
  bucketValue: { fontSize: 22, fontWeight: "800", color: "#ffffff", letterSpacing: -0.4 },
  bucketShare: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  progressTrack: { height: 3, backgroundColor: "#1e293b", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  insightsStack: { gap: 12, paddingBottom: 20 },
  insightCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 10,
  },
  insightHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  insightTitleGroup: { flex: 1, gap: 6 },
  insightTitle: { fontSize: 14, fontWeight: "800", color: "#ffffff", letterSpacing: -0.2 },
  statusTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#0b0d0f",
  },
  statusTagText: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  insightBody: { fontSize: 13, fontWeight: "500", color: "#94a3b8", lineHeight: 18, paddingRight: 20 },
  selectedDatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#16191e",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  selectedDateText: { fontSize: 12, fontWeight: "600", color: "#ffffff" },
  clearDateText: { fontSize: 12, fontWeight: "700", color: "#ef4444" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000aa",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#0f1115",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ffffff08",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#ffffff", marginBottom: 14, letterSpacing: -0.2 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#16191e",
    borderWidth: 1,
    borderColor: "#ffffff0a",
  },
  presetChipText: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  dateInputRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  inputBlock: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", marginBottom: 6, textTransform: "uppercase" },
  dateInput: {
    backgroundColor: "#16191e",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ffffff10",
    alignItems: "center",
  },
  dateInputText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16191e",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ffffff0a",
    marginBottom: 14,
  },
  pickerLabel: { color: "#ffffff", fontWeight: "700", fontSize: 13, flex: 1 },
  stepperRow: { flexDirection: "row", gap: 8, marginRight: 10 },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0b0d0f",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  stepperButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 16 },
  modalFooterRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  applyRangeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#10b981",
    alignItems: "center",
  },
  applyRangeButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#16191e",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  cancelButtonText: { color: "#94a3b8", fontWeight: "800", fontSize: 14 },
  forecastCard: {
    backgroundColor: "#16191e",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 10,
    marginBottom: 24,
  },
  forecastHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  forecastTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  forecastValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#6366f1",
    letterSpacing: -0.5,
  },
  forecastMetaRow: {
    flexDirection: "row",
    gap: 16,
  },
  forecastMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  recommendationsList: {
    marginTop: 4,
    gap: 4,
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94a3b8",
    lineHeight: 16,
  },
  actionPlansStack: {
    gap: 12,
    paddingBottom: 20,
  },
  actionPlanCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 8,
  },
  actionPlanHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionPlanTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    flex: 1,
    letterSpacing: -0.2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  actionPlanDescription: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94a3b8",
    lineHeight: 18,
  },
  actionPlanSuggestion: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366f1",
    marginTop: 4,
  },
});