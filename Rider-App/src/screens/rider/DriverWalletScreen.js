import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Wallet, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { fetchWalletSummary, requestPayout, approvePayout, rejectPayout, fetchPayoutHistory } from "../../services/walletService";
import { useFocusEffect } from "@react-navigation/native";

const MAX_WITHDRAW = 999999;
const MIN_WITHDRAW = 10;

export default function DriverWalletScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useUseSafeAreaInsets();

  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (user?.uid) setUserId(user.uid);
  }, [user?.uid]);

  const loadData = useCallback(async (isRefreshing = false) => {
    if (!userId) return;
    if (!isRefreshing) setLoading(true);
    try {
      const [walletSummary, payoutHistory] = await Promise.all([
        fetchWalletSummary(userId),
        fetchPayoutHistory(userId, 30),
      ]);
      setSummary(walletSummary);
      setHistory(payoutHistory);
    } catch (err) {
      console.warn("[DriverWallet] load failed:", err.message);
      Alert.alert("Error", "Could not load wallet data. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(() => loadData(false), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [userId, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadData(false);
    }, [userId, loadData])
  );

  const handleWithdraw = async () => {
    if (!userId) return;
    const amount = Number(withdrawAmount);
    if (!amount || amount < MIN_WITHDRAW) {
      Alert.alert("Invalid amount", `Minimum withdrawal is GH₵ ${MIN_WITHDRAW.toFixed(2)}`);
      return;
    }
    if (amount > (summary?.availableBalance ?? 0)) {
      Alert.alert("Insufficient funds", "Amount exceeds available balance.");
      return;
    }
    try {
      setSubmitting(true);
      await requestPayout(userId, amount);
      setWithdrawAmount("");
      Alert.alert("Request submitted", "Your payout is queued for ops approval.");
      await loadData(false);
    } catch (err) {
      Alert.alert("Failed", err.message || "Could not request payout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (payoutId, action) => {
    if (!userId) return;
    const fn = action === "approve" ? approvePayout : rejectPayout;
    try {
      await fn(payoutId);
      Alert.alert("Updated", `Payout ${action}d.`);
      await loadData(false);
    } catch (err) {
      Alert.alert("Failed", err.message || `Could not ${action} payout.`);
    }
  };

  const formatCurrency = (value) =>
    `GH₵ ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const renderHistoryItem = ({ item }) => {
    const statusStyles = {
      pending: { color: colors.warning || "#f59e0b", Icon: Clock },
      completed: { color: colors.success || "#10b981", Icon: CheckCircle2 },
      rejected: { color: colors.danger || "#ef4444", Icon: XCircle },
    };
    const style = statusStyles[item.status] || statusStyles.pending;
    const StatusIcon = style.Icon;

    const requestedAt = item.requested_at
      ? new Date(item.requested_at.seconds ? item.requested_at.seconds * 1000 : item.requested_at)
      : null;
    const dateLabel = requestedAt
      ? requestedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "";

    return (
      <View
        style={[
          styles.historyCard,
          { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.historyLeft}>
          <StatusIcon size={18} color={style.color} />
          <View style={styles.historyBody}>
            <Text style={[styles.historyAmount, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
            <Text style={[styles.historyMeta, { color: colors.textMuted }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)} · {dateLabel}
            </Text>
            {item.note ? (
              <Text style={[styles.historyNote, { color: colors.textMuted }]}>{item.note}</Text>
            ) : null}
          </View>
        </View>

        {item.status === "pending" ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success || "#10b981" }]}
              onPress={() => handleAction(item.id, "approve")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger || "#ef4444" }]}
              onPress={() => handleAction(item.id, "reject")}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.primary}
        translucent
      />

      <View
        style={[
          styles.headerBg,
          {
            backgroundColor: colors.primary,
            paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textOnPrimary }]}>Driver Wallet</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Platform.OS === "ios" ? insets.bottom + 40 : 60 },
        ]}
        refreshing={refreshing}
        onRefresh={() => loadData(true)}
        ListHeaderComponent={
          <View style={styles.stack}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight },
              ]}
            >
              <View style={styles.summaryHeader}>
                <View style={[styles.iconPill, { backgroundColor: colors.primaryAlpha || "rgba(17,94,89,0.12)" }]}>
                  <Wallet size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Available Balance</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatCurrency(summary?.availableBalance)}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryStat}>
                  <TrendingUp size={16} color={colors.success || "#10b981"} />
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Earned</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatCurrency(summary?.totalRevenue)}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.summaryStat}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Paid Out</Text>
                  <Text style={[styles.statValue, { color: colors.danger || "#ef4444" }]}>
                    {formatCurrency(summary?.totalPaidOut)}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.withdrawCard,
                { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Payout</Text>
              <TextInput
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder={`Min GH₵ ${MIN_WITHDRAW.toFixed(2)}`}
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.borderLight },
                ]}
              />
              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={submitting}
                activeOpacity={0.8}
                style={[
                  styles.withdrawBtn,
                  { backgroundColor: submitting ? colors.textMuted : colors.primary },
                ]}
              >
                <Text style={[styles.withdrawBtnText, { color: colors.textOnPrimary }]}>
                  {submitting ? "Submitting..." : "Request Withdrawal"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.historySection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payout History</Text>
              {history.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No payouts yet. Request your first withdrawal above.
                </Text>
              ) : null}
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = {
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBg: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  scroll: { paddingHorizontal: 16 },
  stack: { paddingTop: 16 },
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  summaryValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.6 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  summaryStat: { flex: 1, gap: 4 },
  statLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  statValue: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  statDivider: { width: 1, height: 36 },
  withdrawCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "600",
  },
  withdrawBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  withdrawBtnText: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  historySection: { gap: 10 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  historyBody: { flex: 1 },
  historyAmount: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  historyMeta: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  historyNote: { fontSize: 11, fontWeight: "500", marginTop: 2, fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  emptyText: { fontSize: 13, fontWeight: "500", textAlign: "center", marginTop: 20 },
};
