import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft, ClipboardList, Clock, MapPin, DollarSign, ChevronRight, TrendingUp } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";

export default function DeliveryHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadDeliveries();
  }, [user?.id]);

  const loadDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from("revenue")
        .select("*")
        .eq("rider_id", user.id)
        .order("order_completed_at", { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (e) {
      console.warn("[DeliveryHistory] load failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusColor = (amount) => {
    const n = Number(amount || 0);
    if (n <= 0) return "#64748b";
    if (n < 30) return "#facc15";
    return "#10b981";
  };

  const renderDelivery = (item, index) => {
    const amount = Number(item.amount || 0);
    const isPositive = amount > 0;

    return (
      <View key={item.id || index} style={styles.deliveryCard}>
        <View style={styles.leftBlock}>
            <View style={[styles.iconPill, { backgroundColor: (isPositive ? "#10b981" : "#64748b") + "18" }]}>
              <ClipboardList size={16} color={isPositive ? "#10b981" : "#64748b"} />
            </View>
          <View style={styles.metaBlock}>
            <Text style={styles.orderIdText}>Order #{item.order_id || item.id}</Text>
            <View style={styles.metaRow}>
              <Clock size={12} color="#64748b" />
              <Text style={styles.metaText}>{formatDate(item.order_completed_at)} · {formatTime(item.order_completed_at)}</Text>
            </View>
            {item.pickup_address && (
              <View style={styles.metaRow}>
                <MapPin size={12} color="#64748b" />
                <Text style={styles.metaText} numberOfLines={1}>{item.pickup_address}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightBlock}>
          <Text style={[styles.amountText, { color: getStatusColor(amount) }]}>
            {isPositive ? "+" : ""}GH₵ {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <ChevronRight size={14} color="#475569" />
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
        <Text style={styles.headerTitleText}>Delivery History</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <DollarSign size={14} color="#facc15" />
            <Text style={styles.summaryLabel}>Total Deliveries</Text>
            <Text style={styles.summaryValue}>{deliveries.length}</Text>
          </View>
          <View style={styles.summaryChip}>
            <TrendingUp size={14} color="#10b981" />
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>
              GH₵ {deliveries.reduce((sum, d) => sum + Number(d.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#facc15" />
            <Text style={styles.loadingText}>Loading deliveries...</Text>
          </View>
        ) : deliveries.length === 0 ? (
          <View style={styles.emptyWrap}>
              <ClipboardList size={32} color="#334155" />
              <Text style={styles.emptyText}>No deliveries recorded yet.</Text>
            </View>
        ) : (
          <View style={styles.list}>{deliveries.map(renderDelivery)}</View>
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
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 18,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: "#16191e",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 6,
  },
  summaryLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryValue: { fontSize: 16, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  loadingWrap: { paddingTop: 40, alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  emptyWrap: { paddingTop: 60, alignItems: "center", gap: 12 },
  emptyText: { color: "#64748b", fontSize: 14, fontWeight: "600" },
  list: { gap: 10, paddingBottom: 20 },
  deliveryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ffffff05",
    gap: 12,
  },
  leftBlock: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  metaBlock: { flex: 1, gap: 4 },
  orderIdText: { fontSize: 14, fontWeight: "800", color: "#ffffff", letterSpacing: -0.2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  rightBlock: { alignItems: "flex-end", gap: 8 },
  amountText: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
});
