import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Alert,
} from "react-native";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2 } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { fetchManualEntries, removeManualEntry } from "../../services/manualEntries";

export default function ManualCashFlowScreen({ navigation }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadEntries();
  }, [user?.id]);

  const loadEntries = async () => {
    try {
      const data = await fetchManualEntries(user.id);
      setEntries(data);
    } catch (e) {
      console.warn("[ManualCashFlow] load failed:", e.message);
    } finally {
      setLoading(false);
    }
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
          }
        },
      },
    ]);
  };

  const formatCurrency = (value) =>
    `GH₵ ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const renderEntry = (item) => {
    const isInflow = item.type === "inflow";
    const dateLabel = new Date(item.occurred_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <View key={item.id} style={styles.entryCard}>
        <View style={styles.entryLeft}>
          <View style={[styles.iconPill, { backgroundColor: isInflow ? "#10b98120" : "#ef444420" }]}>
            {isInflow ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="#ef4444" />}
          </View>
          <View style={styles.entryTextBlock}>
            <Text style={styles.entryTitle}>{item.note || (isInflow ? "Inflow" : "Outflow")}</Text>
            <Text style={styles.entryMeta}>{dateLabel}</Text>
          </View>
        </View>

        <View style={styles.entryRight}>
          <Text style={[styles.amountText, { color: isInflow ? "#10b981" : "#ef4444" }]}>
            {isInflow ? "+" : "-"} {formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity style={styles.deleteAction} activeOpacity={0.7} onPress={() => handleDelete(item)}>
            <Trash2 size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Manual Cash Flow</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("QuickAddEntry", {
                onAdded: () => loadEntries(),
              })
            }
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Add Entry</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.statusText}>Loading entries...</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.statusText}>No manual entries yet.</Text>
        ) : (
          entries.map(renderEntry)
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingTop: 24,
    paddingBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
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
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#115e59",
  },
  addButtonText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  statusText: { color: "#64748b", fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 24 },
  entryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ffffff05",
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
  entryTitle: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  entryMeta: { fontSize: 12, fontWeight: "600", color: "#64748b", marginTop: 3 },
  entryRight: { alignItems: "flex-end", gap: 8 },
  amountText: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  deleteAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0b0d0f",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff0a",
  },
});
