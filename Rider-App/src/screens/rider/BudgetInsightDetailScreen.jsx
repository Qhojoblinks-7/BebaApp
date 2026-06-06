import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  ArrowLeft,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingDown,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

const INSIGHT_DATA_MAP = {
  needs: {
    title: "50% Needs deep dive",
    accentColor: "#a855f7",
    subtitle: "Essential living & core operational overhead",
    burnRateText: "Optimal",
    chartPath:
      "M 0 35 Q 30 15 60 28 T 120 8 T 180 32 T 240 12 T 300 5",
    leaks: [
      {
        id: 1,
        type: "warning",
        message:
          "Fuel inflation tracking 6% higher along your usual transit corridors.",
      },
      {
        id: 2,
        type: "info",
        message:
          "Fixed utility overhead stabilized following low-power server migration.",
      },
    ],
    optimizations: [
      {
        title: "Consolidate Logistics Hubs",
        desc: "Batch your delivery runs closer to high-density commercial pick-up points to drop true operating cost per km.",
      },
      {
        title: "Bulk Fuel Purchases",
        desc: "Utilize commercial partner discounts or high-volume stations to protect cash flow limits.",
      },
    ],
  },
  wants: {
    title: "30% Wants deep dive",
    accentColor: "#6366f1",
    subtitle: "Lifestyle choices & discretionary outlays",
    burnRateText: "Accelerated",
    chartPath:
      "M 0 35 Q 40 38 80 20 T 160 5 T 240 2 T 300 1",
    leaks: [
      {
        id: 1,
        type: "danger",
        message:
          "Mid-day restaurant dining in Osu represents 42% of this bucket's total usage.",
      },
      {
        id: 2,
        type: "warning",
        message:
          "Unused digital layout tool subscription renewed silently this cycle.",
      },
    ],
    optimizations: [
      {
        title: "Implement a 48-Hour Cool-Down",
        desc: "Delay discretionary tech acquisitions or personal lifestyle upgrades by 2 days to verify utility necessity.",
      },
      {
        title: "Cap Food Delivery Applications",
        desc: "Set an atomic monthly threshold strictly for lifestyle convenience dining.",
      },
    ],
  },
  savings: {
    title: "20% Savings deep dive",
    accentColor: "#10b981",
    subtitle: "Wealth reserves & emergency runway assets",
    burnRateText: "Target Achieved",
    chartPath:
      "M 0 38 Q 50 35 100 25 T 200 15 T 300 8",
    leaks: [
      {
        id: 1,
        type: "success",
        message:
          "Automated allocations hit investment targets 3 days ahead of cycle schedule.",
      },
    ],
    optimizations: [
      {
        title: "Optimize Inflation Spreads",
        desc: "Reallocate low-yield idle cash balances into fixed-income or inflation-shielded investment instruments.",
      },
      {
        title: "Scale Runway Targets",
        desc: "Gradually increase liquid reserves from 4.5 months to 6 months to offset macroeconomic shifts.",
      },
    ],
  },
};

export default function BudgetInsightDetailScreen({ route, navigation }) {
  const { categoryId } = route.params || { categoryId: "needs" };
  const currentInsight =
    INSIGHT_DATA_MAP[categoryId] || INSIGHT_DATA_MAP.needs;

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
                {currentInsight.burnRateText}
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
                Active Scan
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <TrendingUp size={15} color="#94a3b8" />
          <Text style={styles.sectionTitleText}>
            Velocity Trajectory (30 Days)
          </Text>
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

        <View style={styles.sectionHeader}>
          <AlertTriangle size={15} color="#facc15" />
          <Text style={styles.sectionTitleText}>
            Detected Outflow Flaws
          </Text>
        </View>

        {currentInsight.leaks.map((leak) => (
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

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Sparkles size={15} color="#a855f7" />
          <Text style={styles.sectionTitleText}>
            Strategic Action Blueprints
          </Text>
        </View>

        {currentInsight.optimizations.map((opt, index) => (
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

        <View style={{ height: 60 }} />
      </ScrollView>
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
  scrollContent: { paddingHorizontal: 18, paddingVertical: 16 },
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
});
