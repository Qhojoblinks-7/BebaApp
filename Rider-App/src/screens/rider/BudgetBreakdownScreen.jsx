import React from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { ArrowLeft, Home, ShoppingBag, PiggyBank } from "lucide-react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.44;
const SPACING = 12;

const ICON_MAP = {
  Home,
  ShoppingBag,
  PiggyBank,
};

export default function BudgetBreakdownScreen({ route, navigation }) {
  const { budgetData } = route.params || {};

  const categories = budgetData || [
    {
      id: "needs",
      title: "50% Needs",
      allocated: 0,
      spent: 0,
      color: "#a855f7",
      description: "Rent, utilities, fuel, food",
      icon: "Home",
      subItems: [
        { name: "Rent", amount: 0 },
        { name: "Utilities", amount: 0 },
        { name: "Fuel", amount: 0 },
        { name: "Groceries", amount: 0 },
      ],
    },
    {
      id: "wants",
      title: "30% Wants",
      allocated: 0,
      spent: 0,
      color: "#6366f1",
      description: "Dining out, hobbies, shopping",
      icon: "ShoppingBag",
      subItems: [
        { name: "Dining Out", amount: 0 },
        { name: "Hobbies", amount: 0 },
        { name: "Shopping", amount: 0 },
      ],
    },
    {
      id: "savings",
      title: "20% Savings",
      allocated: 0,
      spent: 0,
      color: "#10b981",
      description: "Emergency fund, investments",
      icon: "PiggyBank",
      subItems: [
        { name: "Emergency Fund", amount: 0 },
        { name: "Investments", amount: 0 },
      ],
    },
  ];

  const renderCategoryCard = ({ item: category }) => {
    const percentage = category.allocated > 0 ? Math.round((category.spent / category.allocated) * 100) : 0;
    const remaining = category.allocated - category.spent;
    const IconComponent = ICON_MAP[category.icon];

    return (
      <View style={styles.budgetBucketCard}>
        <View style={styles.cardHeaderInline}>
          <View style={[styles.iconCircle, { backgroundColor: category.color + "20" }]}>
            {IconComponent && <IconComponent size={16} color={category.color} />}
          </View>
          <Text style={styles.cardLabelText}>{category.title}</Text>
        </View>

        <Text style={styles.cardMainValueText}>{percentage}%</Text>

        <View style={styles.budgetMiniArcContainer}>
          <View style={styles.miniArcTrack}>
            <View style={[styles.miniArcFill, { width: percentage + "%", backgroundColor: category.color }]} />
          </View>
        </View>

        <Text style={styles.cardFooterDisclaimer}>
          GH₵ {remaining.toFixed(0)} remaining
        </Text>

        <View style={styles.subItemsSection}>
          {category.subItems.map((subItem, idx) => (
            <View key={idx} style={styles.subItemRow}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text style={styles.subItemName}>{subItem.name}</Text>
              <Text style={styles.subItemAmount}>GH₵ {subItem.amount.toFixed(0)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Budget Breakdown</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategoryCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
        ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d0f" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 16 : 12,
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
  flatListContent: { paddingHorizontal: 18, paddingVertical: 12 },
  budgetBucketCard: {
    backgroundColor: "#16191e",
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 16,
    minHeight: 160,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  cardHeaderInline: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardLabelText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  cardMainValueText: { fontSize: 28, fontWeight: "800", color: "#ffffff", letterSpacing: -0.5 },
  cardFooterDisclaimer: { fontSize: 11, fontWeight: "500", color: "#64748b", marginTop: 4, lineHeight: 14 },
  budgetMiniArcContainer: { height: 20, justifyContent: "center", alignItems: "center", marginVertical: 8 },
  miniArcTrack: { height: 3, width: "100%", backgroundColor: "#1e293b", borderRadius: 2, overflow: "hidden" },
  miniArcFill: { height: "100%", borderRadius: 2 },
  subItemsSection: { marginTop: 12, gap: 8 },
  subItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  subItemName: { flex: 1, fontSize: 12, fontWeight: "600", color: "#94a3b8" },
  subItemAmount: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
});
