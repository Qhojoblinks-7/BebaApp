import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Zap, MessageSquare } from "lucide-react-native";

function MetricRow({ value, unit, target, targetValue, isLast }) {
  return (
    <View style={[styles.metricItemRow, isLast && styles.lastMetricItemRow]}>
      <View>
        <Text style={styles.metricMainValue}>{value}</Text>
        <Text style={styles.metricSubLabelText}>{unit}</Text>
      </View>
      <View style={styles.targetBlock}>
        <Text style={styles.targetIndicatorText}>{target}</Text>
        <Text style={styles.targetValueText}>{targetValue}</Text>
      </View>
    </View>
  );
}

export default function DailySummaryCard({
  distanceKm = "0.0",
  earnings = 0,
  completedDrops = 0,
  onViewHistory,
}) {
  const metrics = [
    {
      value: typeof distanceKm === "number" ? distanceKm.toFixed(1) : distanceKm,
      unit: "Kilometers Tracked",
      target: "| Distance",
      targetValue: "60.0 km Target",
    },
    {
      value: `GH₵ ${Number(earnings).toFixed(2)}`,
      unit: "Collected Funds",
      target: "| Earnings",
      targetValue: "GH₵ 500 Target",
    },
    {
      value: String(completedDrops),
      unit: "Completed Drops",
      target: "| Manifests",
      targetValue: "12 Runs Target",
    },
  ];

  return (
    <View style={styles.summaryCard}>
      {/* Header section with brand accent colored icon */}
      <View style={styles.cardHeader}>
        <Zap size={16} color="#115e59" />
        <Text style={styles.cardHeaderTitle}>Daily Summary</Text>
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
        />
      ))}

      {/* Primary Navigation Trigger Component */}
      <TouchableOpacity 
        style={styles.primaryActionButton} 
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
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#475569",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#115e59",
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
    marginBottom: 16, // Reduced margin block to balance whitespace right before the button line
  },
  metricMainValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  metricSubLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: -1,
  },
  targetBlock: { alignItems: "flex-end" },
  targetIndicatorText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#f59e0b",
    textTransform: "uppercase",
  },
  targetValueText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },
  primaryActionButton: {
    backgroundColor: "#115e59",
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