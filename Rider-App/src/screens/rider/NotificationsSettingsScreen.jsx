import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2 } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { fetchManualEntries, removeManualEntry } from "../../services/manualEntries";
import { useFocusEffect } from "@react-navigation/native";

export default function ManualCashFlowScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true);
    try {
      const data = await fetchManualEntries(user.uid);
      setEntries(data || []);
    } catch (e) {
      console.warn("[ManualCashFlow] load failed:", e.message);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) loadEntries(false);
    }, [user?.uid, loadEntries])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadEntries(false);
  };

  const handleDelete = async (entry) => {
    Alert.alert("Delete entry", "Remove this manual cash flow entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeManualEntry(entry.id);
            setEntries((prev) => prev.filter((item) => item.id !== entry.id));
          } catch (e) {
            console.warn("[ManualCashFlow] delete failed:", e.message);
            Alert.alert("Error", "Could not delete this transaction. Please retry.");
          }
        },
      },
    ]);
  };

  const formatCurrency = (value) => {
    const formatted = Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `GH₵ ${formatted}`;
  };

  const renderEntryCard = ({ item }) => {
    const isInflow = item.type === "inflow";
    const dateLabel = new Date(item.occurred_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <View style={[styles.entryCard, { backgroundColor: colors.backgroundCard || colors.backgroundSecondary, borderColor: colors.borderLight || "rgba(255,255,255,0.05)" }]}>
        <View style={styles.entryLeft}>
          <View style={[styles.iconPill, { backgroundColor: isInflow ? (colors.successAlpha || "#10b98120") : (colors.errorAlpha || "#ef444420") }]}>
            {isInflow ? (
              <TrendingUp size={16} color={colors.success || "#10b981"} />
            ) : (
              <TrendingDown size={16} color={colors.error || "#ef4444"} />
            )}
          </View>
          <View style={styles.entryTextBlock}>
            <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
              {item.note || (isInflow ? "Inflow" : "Outflow")}
            </Text>
            <Text style={[styles.entryMeta, { color: colors.textMuted || "#64748b" }]}>{dateLabel}</Text>
          </View>
        </View>

        <View style={styles.entryRight}>
          <Text style={[styles.amountText, { color: isInflow ? (colors.success || "#10b981") : (colors.error || "#ef4444") }]}>
            {isInflow ? "+" : "-"} {formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity 
            style={[styles.deleteAction, { backgroundColor: colors.background, borderColor: colors.borderLight || "rgba(255,255,255,0.08)" }]} 
            activeOpacity={0.7} 
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={13} color={colors.textMuted || "#64748b"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor="transparent" 
        translucent 
      />
      
      {/* Dynamic Native-Safe Structural Header */}
      <View style={[
        styles.headerRow, 
        { 
          paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
          backgroundColor: colors.background 
        }
      ]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.backgroundCard || colors.backgroundSecondary, borderColor: colors.borderLight || "rgba(255,255,255,0.05)" }]} 
          onPress={() => navigation?.goBack()} 
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Manual Cash Flow</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEntryCard}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "ios" ? insets.bottom + 40 : 60 }]}
        ListHeaderComponent={
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Entries</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary || "#115e59" }]}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("QuickAddEntry")
              }
            >
              <Plus size={16} color={colors.textOnPrimary || "#ffffff"} />
              <Text style={[styles.addButtonText, { color: colors.textOnPrimary || "#ffffff" }]}>Add Entry</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={[styles.statusText, { color: colors.textMuted || "#64748b" }]}>
              No manual entries yet.
            </Text>
          )
        }
      />
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
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  scrollContent: { paddingHorizontal: 18 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addButtonText: { fontWeight: "800", fontSize: 13 },
  statusText: { fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 40 },
  entryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  entryLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  entryTextBlock: { flex: 1 },
  entryTitle: { fontSize: 14, fontWeight: "700" },
  entryMeta: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  entryRight: { alignItems: "flex-end", gap: 8 },
  amountText: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  deleteAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});