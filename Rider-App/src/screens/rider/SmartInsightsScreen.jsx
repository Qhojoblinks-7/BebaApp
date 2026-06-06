import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
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
  Layers 
} from "lucide-react-native";

export default function SmartInsightsScreen({ navigation }) {
  
  // Real-time financial vector data matching the infrastructure profiles
  const metrics = {
    operatingCostPerKm: "GHS 1.25",
    runwayMonths: "4.5 Months",
    wantsDepletionRate: "64%",
    yieldVsInflation: "+2.4%",
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />

      {/* --- PREMIUM ROW HEADER --- */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Smart Insights</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- SECTION: OPERATIONAL PERFORMANCE --- */}
        <View style={styles.sectionHeader}>
          <Layers size={16} color="#a855f7" />
          <Text style={styles.sectionTitleText}>Operational Efficiency</Text>
        </View>

        {/* Efficiency Vector Grid */}
        <View style={styles.insightGrid}>
          
          {/* Card 1: True Operating Cost per KM */}
          <View style={styles.insightCard}>
            <View style={styles.cardHeaderInline}>
              <Gauge size={14} color="#94a3b8" />
              <Text style={styles.cardLabelText}>True Operating Cost</Text>
            </View>
            <Text style={styles.cardMainValueText}>{metrics.operatingCostPerKm}</Text>
            <Text style={styles.cardUnitText}>per kilometer</Text>
            
            {/* Minimal Background Vector Wave Pattern Simulation from image_3a97a8.png */}
            <View style={styles.vectorContainer}>
              <Svg height="40" width="140" viewBox="0 0 140 40">
                <Path
                  d="M10,30 Q40,10 70,25 T130,15"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <Circle cx="130" cy="15" r="3.5" fill="#ffffff" />
              </Svg>
            </View>
            <Text style={styles.cardFooterText}>Factoring bicycle upkeep, fuel margins, and wear parameters.</Text>
          </View>

          {/* Card 2: Revenue Yield vs Local Inflation */}
          <View style={styles.insightCard}>
            <View style={styles.cardHeaderInline}>
              <TrendingUp size={14} color="#94a3b8" />
              <Text style={styles.cardLabelText}>Net Portfolio Yield</Text>
            </View>
            <Text style={[styles.cardMainValueText, { color: "#22c55e" }]}>{metrics.yieldVsInflation}</Text>
            <Text style={styles.cardUnitText}>above inflation curve</Text>

            {/* Spline Graph Wave representing yield matching image_3a97a8.png */}
            <View style={styles.vectorContainer}>
              <Svg height="40" width="140" viewBox="0 0 140 40">
                <Path
                  d="M10,35 Q35,35 50,20 T90,8 T130,25"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={styles.cardFooterText}>Aggregated growth rates across your fixed-income channels.</Text>
          </View>

        </View>

        {/* --- SECTION: CASH FLOW TRACKERS --- */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Clock size={16} color="#6366f1" />
          <Text style={styles.sectionTitleText}>Velocity & Runway Guards</Text>
        </View>

        {/* Row Container 1: Emergency Fund Runway */}
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
          
          {/* Circular arc progression loader indicator */}
          <View style={styles.microArcWrapper}>
            <Svg height="44" width="44" viewBox="0 0 36 36">
              <Circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
              <Circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3"
                strokeDasharray="65 100"
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </Svg>
          </View>
        </View>

        {/* Row Container 2: Discretionary Wants Warning */}
        <View style={styles.bannerInsightCard}>
          <View style={styles.bannerLeftFlex}>
            <View style={[styles.iconCircleContainer, { backgroundColor: "#2e1065" }]}>
              <Zap size={20} color="#a855f7" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerHeadingText}>Discretionary Depletion Rate</Text>
              <Text style={styles.bannerDescriptionText}>
                You have utilized <Text style={{ color: "#ffffff", fontWeight: "700" }}>{metrics.wantsDepletionRate}</Text> of your 30% Wants bucket. Outbound pace at local food spots and tech subscriptions is accelerating.
              </Text>
            </View>
          </View>
        </View>

        {/* --- SYSTEM SUGGESTION RECOMMENDATION ACTION BANNER --- */}
        <View style={styles.proactiveRecommendationBlock}>
          <Text style={styles.recommendationLabelText}>💡 Proactive Recommendation</Text>
          <Text style={styles.recommendationBodyText}>
            Inbound velocity tracking reveals a spending surge on Friday evenings. Consider moving a portion of your liquid funds into your asset growth vault before the upcoming weekend cycle begins.
          </Text>
        </View>

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
    backgroundColor: "#0b0d0f",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  headerRightSpacer: { width: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 14,
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  insightGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  insightCard: {
    backgroundColor: "#16191e",
    width: "48.3%",
    borderRadius: 24,
    padding: 16,
    minHeight: 185,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  cardHeaderInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  cardMainValueText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  cardUnitText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: -2,
  },
  vectorContainer: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 6,
  },
  cardFooterText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 13,
  },
  bannerInsightCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16191e",
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  bannerLeftFlex: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 14,
  },
  iconCircleContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTextContainer: {
    flex: 1,
    paddingRight: 4,
  },
  bannerHeadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  bannerDescriptionText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 4,
    lineHeight: 16,
  },
  microArcWrapper: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  proactiveRecommendationBlock: {
    backgroundColor: "#1e1b4b30",
    borderWidth: 1,
    borderColor: "#6366f120",
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  recommendationLabelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#818cf8",
    marginBottom: 6,
  },
  recommendationBodyText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    lineHeight: 17,
  },
});