import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Hash,
  Phone,
  User,
  FileText,
  ShieldCheck,
  Signature,
  Navigation,
  Tag,
  Wallet
} from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

export default function DeliveryDetailScreen({ route, navigation }) {
  const { item } = route.params || {};
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.textMuted }}>No delivery data found.</Text>
      </View>
    );
  }

  const orderRecord = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  const waybill = orderRecord?.order_id || item.order_id || item.id;

  const statusColors = {
    pending: "#facc15",
    assigned: "#3b82f6",
    picked_up: "#a855f7",
    in_transit: "#6366f1",
    delivered: "#10b981",
    cancelled: "#ef4444",
  };
  const statusColor = statusColors[orderRecord?.status] || colors.textMuted;

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `GH¢ ${num.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRow = (label, value, accent) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: "700", color: accent || colors.text, textAlign: "right", flex: 2 }}>
        {value || "—"}
      </Text>
    </View>
  );

  const deliveryFee = Number(orderRecord?.delivery_fee || 0);
  const basePrice = Number(orderRecord?.base_price || 0);
  const distanceFee = Number(orderRecord?.distance_fee || 0);
  const surgeFee = Number(orderRecord?.surge_fee || 0);
  const totalFee = deliveryFee || (basePrice + distanceFee + surgeFee);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 20) : StatusBar.currentHeight + 12,
          paddingBottom: 16,
          backgroundColor: colors.backgroundCard,
          borderBottomWidth: 1,
          borderColor: colors.borderLight,
          gap: 12,
        }}
      >
        <TouchableOpacity
          style={{
            width: 40, height: 40, borderRadius: 12, backgroundColor: colors.backgroundSecondary,
            justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.borderLight,
          }}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.4 }}>
            Delivery Details
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: statusColor, textTransform: "capitalize" }}>
              {orderRecord?.status || "unknown"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 24 }}>

        {/* Waybill */}
        <View style={sectionCard(colors)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Hash size={14} color={colors.textMuted} />
            <Text style={labelStyle(colors)}>Waybill</Text>
          </View>
          <Text style={valueBold(colors)}>{waybill}</Text>
        </View>

        {/* Timeline */}
        <View style={sectionCard(colors)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={labelStyle(colors)}>Timeline</Text>
          </View>
          {renderRow("Created", formatDateTime(orderRecord?.created_at))}
          {renderRow("Completed", formatDateTime(item.order_completed_at))}
          {renderRow("Received By", orderRecord?.received_by)}
          {renderRow("Received At", formatDateTime(orderRecord?.received_at))}
        </View>

        {/* Sender / Pickup */}
        <View style={sectionCard(colors)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Navigation size={14} color="#10b981" />
            <Text style={labelStyle(colors)}>Pickup</Text>
          </View>
          {renderRow("Sender", orderRecord?.sender_name)}
          {renderRow("Phone", orderRecord?.sender_phone, "#6366f1")}
          {renderRow("Address", orderRecord?.pickup_address)}
          {renderRow("Zone", orderRecord?.pickup_zone)}
        </View>

        {/* Customer / Drop-off */}
        <View style={sectionCard(colors)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <User size={14} color="#ef4444" />
            <Text style={labelStyle(colors)}>Drop-off</Text>
          </View>
          {renderRow("Customer", orderRecord?.customer_name)}
          {renderRow("Phone", orderRecord?.customer_phone, "#6366f1")}
          {renderRow("Address", orderRecord?.delivery_address)}
          {renderRow("Zone", orderRecord?.delivery_zone)}
        </View>

        {/* Parcel */}
        {orderRecord?.item_description && (
          <View style={sectionCard(colors)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <FileText size={14} color={colors.textMuted} />
              <Text style={labelStyle(colors)}>Parcel</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, lineHeight: 20 }}>
              {orderRecord.item_description}
            </Text>
            {orderRecord?.delivery_instructions && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: 4 }}>
                  Instructions
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text, lineHeight: 18 }}>
                  {orderRecord.delivery_instructions}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Delivery Confirmation */}
        <View style={sectionCard(colors)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={14} color="#10b981" />
            <Text style={labelStyle(colors)}>Confirmation</Text>
          </View>
          {renderRow("PIN", orderRecord?.delivery_pin)}
          {renderRow("Signature", orderRecord?.signature ? "Captured" : "—")}
        </View>

        {/* Fees Breakdown */}
        <View style={sectionCard(colors)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Wallet size={14} color="#facc15" />
            <Text style={labelStyle(colors)}>Fee Breakdown</Text>
          </View>
          {deliveryFee > 0 && renderRow("Delivery Fee", formatCurrency(deliveryFee))}
          {basePrice > 0 && renderRow("Base Price", formatCurrency(basePrice))}
          {distanceFee > 0 && renderRow("Distance Fee", formatCurrency(distanceFee))}
          {surgeFee > 0 && renderRow("Surge Fee", formatCurrency(surgeFee))}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 8, paddingTop: 8 }}>
            {renderRow("Total Earned", formatCurrency(item.amount), "#10b981")}
          </View>
        </View>

        {/* Route Sequence */}
        {orderRecord?.route_sequence > 0 && (
          <View style={sectionCard(colors)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Tag size={14} color={colors.textMuted} />
              <Text style={labelStyle(colors)}>Batch</Text>
            </View>
            {renderRow("Route Sequence", `#${orderRecord.route_sequence}`)}
            <View style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "500", color: colors.textSecondary, lineHeight: 16 }}>
                This delivery was part of a batch sequence. Route order determines pickup/drop-off priority.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function sectionCard(colors) {
  return {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
    gap: 2,
  };
}

function labelStyle(colors) {
  return { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 };
}

function valueBold(colors) {
  return { fontSize: 20, fontWeight: "900", color: colors.text, letterSpacing: -0.4, marginTop: 2 };
}
