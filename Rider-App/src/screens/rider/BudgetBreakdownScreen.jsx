import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  ArrowLeft,
  Home,
  ShoppingBag,
  PiggyBank,
  ArrowUpRight,
  Wallet
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { getLiveBudgetWithExpenses, buildDefaultBudget } from "../../services/budgetService";
import { useThemeStore } from "../../store/themeStore";

// Added Wallet as a fallback structure element to prevent empty spaces
const ICON_MAP = {
  Home,
  ShoppingBag,
  PiggyBank,
  Wallet,
};

export default function BudgetBreakdownScreen({ route, navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const params = route.params || {};
  const serverBudgetData = params.budgetData;
  const [categories, setCategories] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [manualInflows, setManualInflows] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serverBudgetData) {
      const categoriesWithIcons = serverBudgetData.categories
        ? serverBudgetData.categories
        : Array.isArray(serverBudgetData)
          ? serverBudgetData
          : [];
      setCategories(categoriesWithIcons.map((cat) => ({ ...cat, icon: cat.icon && ICON_MAP[cat.icon] ? cat.icon : "Wallet" })));
      setTotalEarnings(serverBudgetData.totalEarnings || 0);
      setManualInflows(serverBudgetData.manualInflows || 0);
      setLoading(false);
    } else if (user?.id) {
      loadBudget();
    } else {
      setLoading(false);
    }
  }, [user?.id, serverBudgetData]);

  const loadBudget = async () => {
    try {
      const result = await getLiveBudgetWithExpenses(user.id);
      const cats = result.categories || result;
      setCategories(cats.map((cat) => ({ ...cat, icon: cat.icon && ICON_MAP[cat.icon] ? cat.icon : "Wallet" })));
      setTotalEarnings(result.totalEarnings || 0);
      setManualInflows(result.manualInflows || 0);
    } catch (e) {
      console.warn("[BudgetBreakdown] load failed:", e.message);
      setCategories(buildDefaultBudget(0).map((cat) => ({ ...cat, icon: cat.icon && ICON_MAP[cat.icon] ? cat.icon : "Wallet" })));
      setTotalEarnings(0);
      setManualInflows(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 12 }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={[styles.headerRow, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Budget Breakdown</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading budget...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No budget data yet. Start delivering to see your budget breakdown.
            </Text>
          </View>
        ) : (
          <View>
            {totalEarnings > 0 && (
              <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Earnings</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    GH₵ {Number(totalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                {manualInflows > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Manual Inflows</Text>
                    <Text style={[styles.summaryValue, { color: colors.success || "#10b981" }]}>
                      + GH₵ {Number(manualInflows).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {categories.map((category) => {
              const percentage = category.allocated > 0 ? Math.round((category.spent / category.allocated) * 100) : 0;
              const remaining = category.allocated - category.spent;
              const IconComponent = ICON_MAP[category.icon] || Wallet;

              const radius = 16;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.budgetBucketCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("BudgetInsightDetail", { categoryId: category.id, budgetData: categories })}
                >
                  <View style={styles.cardMainHeader}>
                    <View style={styles.leftMetaStack}>
                      <View style={styles.cardHeaderInline}>
                        <View style={[styles.iconCircle, { backgroundColor: category.color + "15" }]}>
                          <IconComponent size={14} color={category.color} />
                        </View>
                        <Text style={[styles.cardLabelText, { color: colors.text }]}>{category.title}</Text>
                      </View>
                      <Text style={[styles.descriptionText, { color: colors.textMuted }]}>{category.description}</Text>
                    </View>

                    <View style={styles.arcVisualContainer}>
                      <Svg height="48" width="48" viewBox="0 0 40 40">
                        <Circle cx="20" cy="20" r={radius} fill="none" stroke={colors.border} strokeWidth="3" />
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
                        <Text style={[styles.arcPercentageText, { color: colors.text }]}>{percentage}%</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.metricRowGroup, { backgroundColor: colors.backgroundInput, borderColor: colors.borderLight }]}>
                    <View style={styles.metricBlock}>
                      <Text style={[styles.metricLabelStatic, { color: colors.textMuted }]}>Allocated Base</Text>
                      <Text style={[styles.metricValueText, { color: colors.textSecondary }]}>
                        GH₵ {Number(category.allocated).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.metricBlock}>
                      <Text style={[styles.metricLabelStatic, { color: colors.textMuted }]}>Spent Outflow</Text>
                      <Text style={[styles.metricValueText, { color: colors.text }]}>
                        GH₵ {Number(category.spent).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={[styles.metricBlock, { alignItems: "flex-end" }]}>
                      <Text style={[styles.metricLabelStatic, { color: colors.textMuted }]}>Remaining Free</Text>
                      <Text style={[styles.metricValueText, { color: remaining < 0 ? colors.danger : colors.textSecondary }]}>
                        GH₵ {Number(remaining).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  {category.subItems && category.subItems.length > 0 && (
                    <View style={[styles.subItemsSection, { borderTopColor: colors.borderLight }]}>
                      <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>Atomic Cost Ledger</Text>

                      {category.subItems.map((subItem, idx) => (
                        <View key={idx} style={[styles.subItemRow, { borderBottomColor: colors.borderLight }]}>
                          <View style={styles.subItemLeftNode}>
                            <View style={[styles.dot, { backgroundColor: category.color }]} />
                            <Text style={[styles.subItemName, { color: colors.textSecondary }]} numberOfLines={1}>
                              {subItem.name}
                            </Text>
                          </View>
                          <View style={styles.subItemRightNode}>
                            <Text style={[styles.subItemAmount, { color: colors.text }]}>
                              GH₵ {Number(subItem.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                            <TouchableOpacity style={[styles.microArrowAction, { backgroundColor: colors.backgroundSecondary }]} activeOpacity={0.7}>
                              <ArrowUpRight size={12} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    letterSpacing: -0.3
  },
  headerRightSpacer: { width: 38 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  loadingWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  emptyWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  budgetBucketCard: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
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
    letterSpacing: -0.2
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: "500",
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
    fontWeight: "800"
  },
  metricRowGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
  },
  metricBlock: { flex: 1 },
  metricLabelStatic: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.2
  },
  metricValueText: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  subItemsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 14
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
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
    fontWeight: "600"
  },
  subItemRightNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  subItemAmount: {
    fontSize: 13,
    fontWeight: "700"
  },
  microArrowAction: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});