import React, { useState, useEffect } from "react";
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
import { ArrowLeft, Home, ShoppingBag, PiggyBank, ArrowUpRight } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { getLiveBudgetFromRevenue } from "../../services/budgetService";

const ICON_MAP = {
  Home,
  ShoppingBag,
  PiggyBank,
};

export default function BudgetBreakdownScreen({ route, navigation }) {
  const { user } = useAuth();
  const params = route.params || {};
  const serverBudgetData = params.budgetData;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serverBudgetData) {
      const categoriesWithIcons = serverBudgetData.map((cat) => ({
        ...cat,
        icon: cat.icon || "Wallet",
      }));
      setCategories(categoriesWithIcons);
      setLoading(false);
    } else if (user?.id) {
      loadBudget();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, serverBudgetData]);

  const loadBudget = async () => {
    try {
      const data = await getLiveBudgetFromRevenue(user.id);
      if (data && data.length > 0) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (e) {
      console.warn("[BudgetBreakdown] load failed:", e.message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitleText}>Budget Breakdown</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>Loading budget...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No budget data yet. Start delivering to see your budget breakdown.</Text>
          </View>
        ) : (
          categories.map((category) => {
            const percentage = category.allocated > 0 ? Math.round((category.spent / category.allocated) * 100) : 0;
            const remaining = category.allocated - category.spent;
            const IconComponent = ICON_MAP[category.icon];

            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (percentage / 100) * circumference;

            return (
              <TouchableOpacity key={category.id} style={styles.budgetBucketCard} activeOpacity={0.8} onPress={() => navigation.navigate("BudgetInsightDetail", { categoryId: category.id, budgetData: categories })}>
                
                <View style={styles.cardMainHeader}>
                  <View style={styles.leftMetaStack}>
                    <View style={styles.cardHeaderInline}>
                      <View style={[styles.iconCircle, { backgroundColor: category.color + "15" }]}>
                        {IconComponent && <IconComponent size={14} color={category.color} />}
                      </View>
                      <Text style={styles.cardLabelText}>{category.title}</Text>
                    </View>
                    <Text style={styles.descriptionText}>{category.description}</Text>
                  </View>

                  <View style={styles.arcVisualContainer}>
                    <Svg height="48" width="48" viewBox="0 0 40 40">
                      <Circle cx="20" cy="20" r={radius} fill="none" stroke="#1e293b" strokeWidth="3" />
                      <Circle
                        cx="20"
                        cy="20"
                        r={radius}
                        fill="none"
                        stroke={category.color}
                        strokeWidth="3.5"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform="rotate(-90 20 20)"
                      />
                    </Svg>
                    <View style={styles.arcAbsoluteLabelCenter}>
                      <Text style={styles.arcPercentageText}>{percentage}%</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metricRowGroup}>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabelStatic}>Allocated Base</Text>
                    <Text style={styles.metricValueText}>GH₵ {Number(category.allocated).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabelStatic}>Spent Outflow</Text>
                    <Text style={[styles.metricValueText, { color: "#ffffff" }]}>GH₵ {Number(category.spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                  </View>
                  <View style={[styles.metricBlock, { alignItems: "flex-end" }]}>
                    <Text style={styles.metricLabelStatic}>Remaining Free</Text>
                    <Text style={[styles.metricValueText, { color: remaining < 0 ? "#ef4444" : "#94a3b8" }]}>
                      GH₵ {Number(remaining).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>

                <View style={styles.subItemsSection}>
                  <Text style={styles.subSectionTitle}>Atomic Cost Ledger</Text>
                  
                  {(category.subItems || []).map((subItem, idx) => (
                    <View key={idx} style={styles.subItemRow}>
                      <View style={styles.subItemLeftNode}>
                        <View style={[styles.dot, { backgroundColor: category.color }]} />
                        <Text style={styles.subItemName} numberOfLines={1}>
                          {subItem.name}
                        </Text>
                      </View>
                      <View style={styles.subItemRightNode}>
                        <Text style={styles.subItemAmount}>GH₵ {Number(subItem.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        <TouchableOpacity style={styles.microArrowAction} activeOpacity={0.7}>
                          <ArrowUpRight size={12} color="#475569" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
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
    letterSpacing: -0.3 
  },
  headerRightSpacer: { width: 38 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  loadingWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  emptyWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  emptyText: { color: "#64748b", fontSize: 14, fontWeight: "600", textAlign: "center" },
  budgetBucketCard: {
    backgroundColor: "#16191e",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  cardMainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftMetaStack: { flex: 1, paddingRight: 12 },
  cardHeaderInline: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    marginBottom: 6 
  },
  iconCircle: { 
    width: 26, 
    height: 26, 
    borderRadius: 8, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  cardLabelText: { 
    fontSize: 15, 
    fontWeight: "700", 
    color: "#ffffff",
    letterSpacing: -0.2
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748b",
    lineHeight: 16,
  },
  arcVisualContainer: { 
    height: 48, 
    width: 48, 
    justifyContent: "center", 
    alignItems: "center", 
    position: "relative" 
  },
  arcAbsoluteLabelCenter: { 
    position: "absolute", 
    justifyContent: "center", 
    alignItems: "center", 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  arcPercentageText: { 
    fontSize: 11, 
    fontWeight: "800", 
    color: "#ffffff" 
  },
  metricRowGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0b0d0f50",
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ffffff02",
  },
  metricBlock: { flex: 1 },
  metricLabelStatic: { 
    fontSize: 10, 
    fontWeight: "600", 
    color: "#475569", 
    textTransform: "uppercase",
    letterSpacing: 0.2
  },
  metricValueText: { 
    fontSize: 13, 
    fontWeight: "800", 
    color: "#94a3b8", 
    marginTop: 4 
  },
  subItemsSection: { 
    marginTop: 20, 
    borderTopWidth: 1, 
    borderColor: "#1e293b60", 
    paddingTop: 14 
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  subItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#1e293b30",
  },
  subItemLeftNode: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1, 
    paddingRight: 12 
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    marginRight: 10 
  },
  subItemName: { 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#94a3b8" 
  },
  subItemRightNode: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  subItemAmount: { 
    fontSize: 13, 
    fontWeight: "700", 
    color: "#ffffff" 
  },
  microArrowAction: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#0b0d0f20",
    justifyContent: "center",
    alignItems: "center",
  },
});
