import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.44;

const DEFAULT_METRICS = {
  daily: {
    completionRate: 92,
    totalEarnings: 245.5,
    totalCompletions: 18,
    prevCompletionRate: 88,
    prevTotalEarnings: 210.0,
    prevTotalCompletions: 15,
  },
  weekly: {
    completionRate: 90,
    totalEarnings: 1420.75,
    totalCompletions: 112,
    prevCompletionRate: 86,
    prevTotalEarnings: 1180.0,
    prevTotalCompletions: 98,
  },
  monthly: {
    completionRate: 88,
    totalEarnings: 6100.0,
    totalCompletions: 480,
    prevCompletionRate: 85,
    prevTotalEarnings: 5800.0,
    prevTotalCompletions: 445,
  },
};

export default function ReportsScreen({ route, navigation }) {
  const params = route?.params || {};
  const initialPeriod = params?.period || "monthly";
  const [period, setPeriod] = useState(initialPeriod);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateMode, setDateMode] = useState("start");
  const [tempDate, setTempDate] = useState(new Date());

  const computeCustomMetrics = () => {
    if (!startDate || !endDate) return null;
    const days = Math.max(Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)), 1);
    const baseEarnings = 245.5;
    const baseCompletions = 18;
    const multiplier = days / 1;
    const totalEarnings = Math.round(baseEarnings * multiplier * 100) / 100;
    const totalCompletions = Math.round(baseCompletions * multiplier);
    const completionRate = 88 + Math.floor(Math.random() * 8);
    const prevTotalEarnings = Math.round(totalEarnings * 0.85 * 100) / 100;
    const prevTotalCompletions = Math.round(totalCompletions * 0.85);
    const prevCompletionRate = 82 + Math.floor(Math.random() * 6);
    return { completionRate, totalEarnings, totalCompletions, prevCompletionRate, prevTotalEarnings, prevTotalCompletions };
  };

  const customMetrics = computeCustomMetrics();
  const metrics = period === "custom" ? customMetrics : DEFAULT_METRICS[period] || DEFAULT_METRICS.monthly;
  if (!metrics) return null;

  const earnings = metrics.totalEarnings || 0;
  const needs = earnings * 0.5;
  const wants = earnings * 0.3;
  const savings = earnings * 0.2;

  const renderDelta = (current, previous) => {
    if (previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    const isUp = delta >= 0;
    return (
      <View style={styles.deltaRow}>
        {isUp ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#ef4444" />}
        <Text style={[styles.deltaText, { color: isUp ? "#10b981" : "#ef4444" }]}>
          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
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

  const insights = {
    daily: [
      {
        id: "d1",
        title: "Peak Window",
        body: "Highest completion rate between 12:30-14:00 hrs. Stack high-priority drops during this block.",
        tag: "Optimize",
      },
      {
        id: "d2",
        title: "Route Density",
        body: "Osu corridor yielded 28% more accepts today. Recalibrate standby points accordingly.",
        tag: "Action",
      },
    ],
    weekly: [
      {
        id: "w1",
        title: "Weekend Surge",
        body: "Friday-Saturday earnings outperformed weekday average by 34%. Pre-position for evening demand peaks.",
        tag: "Trend",
      },
      {
        id: "w2",
        title: "Fuel Drift",
        body: "Operating cost per km climbed 6% this week. Switch to lower-cost refill partners on Thursday onward.",
        tag: "Alert",
      },
    ],
    monthly: [
      {
        id: "m1",
        title: "Runway Health",
        body: "Savings vault covers 4.5 months of essential needs. Maintain the current allocation ratio to sustain runway target.",
        tag: "Stable",
      },
      {
        id: "m2",
        title: "Subscription Audit",
        body: "3 recurring developer costs auto-renewed. Evaluate tier downgrades to protect Wants bucket liquidity.",
        tag: "Review",
      },
    ],
  };

  const activeInsights = insights[period] || insights.monthly;

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
                  setShowDateModal(true);
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
            <TouchableOpacity onPress={() => { setStartDate(null); setEndDate(null); }}>
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
              {renderDelta(metrics.completionRate, metrics.prevCompletionRate)}
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
              {renderDelta(metrics.totalEarnings, metrics.prevTotalEarnings)}
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
              {renderDelta(metrics.totalCompletions, metrics.prevTotalCompletions)}
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
          <View style={styles.budgetBucketCard}>
            <Text style={styles.bucketLabel}>Needs</Text>
            <Text style={styles.bucketValue}>GH₵ {needs.toFixed(2)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: "50%", backgroundColor: "#a855f7" }]} />
            </View>
            <Text style={styles.bucketShare}>50%</Text>
          </View>

          <View style={styles.budgetBucketCard}>
            <Text style={styles.bucketLabel}>Wants</Text>
            <Text style={styles.bucketValue}>GH₵ {wants.toFixed(2)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: "30%", backgroundColor: "#6366f1" }]} />
            </View>
            <Text style={styles.bucketShare}>30%</Text>
          </View>

          <View style={styles.budgetBucketCard}>
            <Text style={styles.bucketLabel}>Savings</Text>
            <Text style={styles.bucketValue}>GH₵ {savings.toFixed(2)}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: "20%", backgroundColor: "#10b981" }]} />
            </View>
            <Text style={styles.bucketShare}>20%</Text>
          </View>
        </ScrollView>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleText}>Insights</Text>
        </View>

        <View style={styles.insightsStack}>
          {activeInsights.map((item) => {
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
                <Text style={styles.insightBody}>{item.body}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
                    setStartDate(start);
                    setEndDate(now);
                    setPeriod("custom");
                    setShowDateModal(false);
                  }}
                >
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.dateInputRow}>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Start</Text>
                <TouchableOpacity style={styles.dateInput} activeOpacity={0.8} onPress={() => { setDateMode("start"); setTempDate(startDate || new Date()); }}>
                  <Text style={styles.dateInputText}>{(startDate || new Date()).toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>End</Text>
                <TouchableOpacity style={styles.dateInput} activeOpacity={0.8} onPress={() => { setDateMode("end"); setTempDate(endDate || new Date()); }}>
                  <Text style={styles.dateInputText}>{(endDate || new Date()).toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.datePickerRow}>
              <Text style={styles.pickerLabel}>{tempDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperButton} activeOpacity={0.8} onPress={() => { const d = new Date(tempDate); d.setDate(d.getDate() - 1); setTempDate(d); }}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stepperButton} activeOpacity={0.8} onPress={() => { const d = new Date(tempDate); d.setDate(d.getDate() + 1); setTempDate(d); }}>
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.applyButton} activeOpacity={0.8} onPress={() => { if (dateMode === "start") setStartDate(new Date(tempDate)); else setEndDate(new Date(tempDate)); }}>
                <Text style={styles.applyButtonText}>Set {dateMode === "start" ? "Start" : "End"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.applyRangeButton} activeOpacity={0.8} onPress={() => { if (startDate && endDate) { setShowDateModal(false); } }}>
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
  periodSelectorRow: { flexDirection: "row", gap: 8, marginBottom: 18, marginTop: 4 },
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
  applyButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#115e59",
  },
  applyButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 12 },
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
});
