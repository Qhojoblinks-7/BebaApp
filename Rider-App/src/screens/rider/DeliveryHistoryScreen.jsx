import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ClipboardList, Clock, MapPin, ChevronRight, TrendingUp } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { useThemeStore } from "../../store/themeStore";

export default function DeliveryHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDeliveries = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("revenue")
        .select("id, amount, order_completed_at, order_id, orders!inner(order_id, pickup_address, delivery_address)")
        .eq("rider_id", user?.id)
        .order("order_completed_at", { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (e) {
      console.warn("[DeliveryHistory] Execution run halted:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadDeliveries();
  }, [user?.id]);

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // --- Dynamic Style Matrix mapped direct to application theme context ---
  const ui = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerWrapper: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 20) : StatusBar.currentHeight + 12,
      paddingBottom: 16,
      backgroundColor: colors.backgroundCard,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    headerTitleText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.4,
    },
    listLayout: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 40 : 48,
    },
    summaryRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
    },
    summaryChip: {
      flex: 1,
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
      gap: 4,
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    loadingWrap: {
      paddingVertical: 60,
      alignItems: "center",
      gap: 12,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    emptyWrap: {
      paddingVertical: 80,
      alignItems: "center",
      gap: 12,
    },
    emptyText: {
      color: colors.textDisabled,
      fontSize: 14,
      fontWeight: "600",
    },
    deliveryCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 10,
      gap: 12,
    },
    leftBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    iconPill: {
      width: 40,
      height: 40,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    metaBlock: {
      flex: 1,
      gap: 2,
    },
    orderIdText: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
    rightBlock: {
      alignItems: "flex-end",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    amountText: {
      fontSize: 15,
      fontWeight: "900",
      color: colors.primary,
      letterSpacing: -0.3,
    },
  };

  const totalEarnings = deliveries.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const renderDashboardWidgets = () => (
    <View style={ui.summaryRow}>
      <View style={ui.summaryChip}>
        <Text style={ui.summaryLabel}>Total Drops</Text>
        <Text style={ui.summaryValue}>{deliveries.length}</Text>
      </View>
      <View style={ui.summaryChip}>
        <Text style={ui.summaryLabel}>Total Earned</Text>
        <Text style={ui.summaryValue}>
          GH¢{totalEarnings.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );

  const renderDeliveryItem = ({ item, index }) => {
    const amount = Number(item.amount || 0);
    const orderRecord = Array.isArray(item.orders) ? item.orders[0] : item.orders;
    const waybill = orderRecord?.order_id || item.order_id || item.id;
    const pickup = orderRecord?.pickup_address || "";

    return (
      <View style={ui.deliveryCard}>
        <View style={ui.leftBlock}>
          <View style={ui.iconPill}>
            <ClipboardList size={16} color={colors.primary} />
          </View>
          <View style={ui.metaBlock}>
            <Text style={ui.orderIdText}>Order #{waybill}</Text>
            <View style={ui.metaRow}>
              <Clock size={12} color={colors.textDisabled} />
              <Text style={ui.metaText}>
                {formatDate(item.order_completed_at)} · {formatTime(item.order_completed_at)}
              </Text>
            </View>
            {pickup && (
              <View style={ui.metaRow}>
                <MapPin size={12} color={colors.textDisabled} />
                <Text style={ui.metaText} numberOfLines={1}>{pickup}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={ui.rightBlock}>
          <Text style={ui.amountText}>
            GH¢{amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <ChevronRight size={14} color={colors.textDisabled} />
        </View>
      </View>
    );
  };

  return (
    <View style={ui.container}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Persistence Dynamic Header Navigation Frame */}
      <View style={ui.headerWrapper}>
        <TouchableOpacity style={ui.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={ui.headerTitleText}>Delivery History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Optimized Unified Data Render Framework */}
      {loading && !refreshing ? (
        <View style={ui.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={ui.loadingText}>Loading manifest logs...</Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item, index) => item.id || String(index)}
          onRefresh={() => loadDeliveries(true)}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={ui.listLayout}
          ListHeaderComponent={renderDashboardWidgets}
          renderItem={renderDeliveryItem}
          ListEmptyComponent={
            <View style={ui.emptyWrap}>
              <ClipboardList size={32} color={colors.textDisabled} />
              <Text style={ui.emptyText}>No drops archived yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}