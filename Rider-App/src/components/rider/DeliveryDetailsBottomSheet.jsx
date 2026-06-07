import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import {
  X,
  Phone,
  CircleCheck,
  MessageSquare,
  Package,
  MapPin,
  Calendar,
  Layers,
  FileText,
} from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";
import RiderOrderCard from "./RiderOrderCard";

const STAGES = [
  { key: "pending", label: "Request" },
  { key: "assigned", label: "Confirmed" },
  { key: "picked_up", label: "Picked Up" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function DeliveryDetailsBottomSheet({
  order,
  visible,
  onClose,
  onAction,
}) {
  const [contactMode, setContactMode] = useState("pickup");
  const { colors, isDarkMode } = useThemeStore();

  if (!order) return null;

  const currentIdx = STAGES.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === "cancelled";
  const isDone = order.status === "delivered" || isCancelled;

  const fmt = (d) => {
    if (!d) return "---";
    const date = new Date(d);
    if (isNaN(date)) return "---";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const pickupPhone = order.sender_phone || "";
  const deliveryPhone = order.customer_phone || order.sender_phone || "";
  const activePhone = contactMode === "pickup" ? pickupPhone : deliveryPhone;
  const activeName = contactMode === "pickup" ? order.sender_name : order.customer_name;

  const handleCall = () => {
    if (activePhone) Linking.openURL(`tel:${activePhone}`);
  };

  const handleSMS = () => {
    if (activePhone) Linking.openURL(`sms:${activePhone}`);
  };

  const sheetDepthShadow = {
    shadowColor: colors.shadow || "#000",
    shadowOffset: { width: 0, height: -14 },
    shadowOpacity: isDarkMode ? 0.4 : 0.06,
    shadowRadius: 24,
    elevation: 24,
  };

  const ui = {
    overlay: { 
      flex: 1, 
      justifyContent: "flex-end", 
      backgroundColor: isDarkMode ? "rgba(0,0,0,0.75)" : "rgba(15,23,42,0.6)" 
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
      backgroundColor: colors.backgroundSecondary,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      maxHeight: SCREEN_HEIGHT * 0.9,
      paddingBottom: Platform.OS === "ios" ? 36 : 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 10,
      backgroundColor: colors.textDisabled,
      opacity: 0.5,
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    title: { 
      fontSize: 20, 
      fontWeight: "800", 
      color: colors.text,
      letterSpacing: -0.5,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 20,
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    
    // Minimalist Stepper Track
    timelineWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 24,
      marginBottom: 24,
      paddingVertical: 12,
    },
    stageNode: {
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
      width: 54,
    },
    circleEmpty: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.textDisabled,
      backgroundColor: colors.backgroundSecondary,
    },
    circleCancelled: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.danger,
    },
    stageLabel: {
      fontSize: 10,
      fontWeight: "600",
      marginTop: 8,
      textAlign: "center",
      color: colors.textMuted,
    },
    stageLabelActive: { 
      color: colors.primary,
      fontWeight: "800",
    },
    stageLine: {
      flex: 1,
      height: 2,
      marginHorizontal: -18,
      transform: [{ translateY: -9 }],
      zIndex: 1,
      backgroundColor: colors.borderLight,
    },
    stageLineActive: { 
      backgroundColor: colors.primary 
    },

    // Hero Fare Callout Container
    heroSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 24,
      padding: 20,
      borderRadius: 20,
      backgroundColor: isDarkMode ? colors.backgroundCard : "#f8fafc",
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 20,
    },
    heroLabelWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
    heroLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    heroValue: { fontSize: 24, fontWeight: "900", color: colors.warning },

    // Dynamic Address Section
    addressBlock: {
      marginHorizontal: 24,
      paddingVertical: 4,
      marginBottom: 20,
    },
    addressRow: {
      flexDirection: "row",
      gap: 14,
    },
    timelineIndicator: {
      alignItems: "center",
      width: 16,
    },
    dotOuter: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    dotInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    connectorLine: {
      width: 2,
      flex: 1,
      marginVertical: 4,
    },
    addressContent: {
      flex: 1,
      paddingBottom: 20,
    },
    addressTag: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    addressText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 20,
    },
    addressTime: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 4,
    },

    // Meta Specs Grid List
    specsSection: {
      marginHorizontal: 24,
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: 16,
      gap: 12,
    },
    specRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    specLabelGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    specLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    specValue: {
      fontSize: 13,
      color: colors.text,
      fontWeight: "600",
      textAlign: "right",
      flex: 1,
      marginLeft: 24,
    },

    // Refactored Contact Switcher
    contactWrapper: {
      marginHorizontal: 24,
      marginTop: 4,
      marginBottom: 24,
      borderRadius: 24,
      padding: 16,
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    contactToggle: {
      flexDirection: "row",
      borderRadius: 12,
      padding: 4,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 16,
    },
    contactTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    contactTabActive: { 
      backgroundColor: colors.primary 
    },
    contactTabText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    contactTabTextActive: { 
      color: colors.textOnPrimary 
    },
    profileIdentity: {
      alignItems: "center",
      marginBottom: 16,
    },
    contactName: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    contactPhoneSub: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    contactActions: {
      flexDirection: "row",
      gap: 12,
    },
    contactBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    contactBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textOnPrimary,
    },

    // Action Triggers
    primaryBtn: {
      marginHorizontal: 24,
      height: 54,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      backgroundColor: colors.primary,
    },
    primaryBtnText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.textOnPrimary,
    },
    doneChip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      marginHorizontal: 24,
      borderRadius: 16,
      backgroundColor: "rgba(16, 185, 129, 0.1)",
    },
    doneText: { 
      color: "#10b981",
      fontSize: 14,
      fontWeight: "700",
    },
    doneChipCancelled: {
      paddingVertical: 14,
      marginHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: "rgba(239, 68, 68, 0.1)",
    },
    doneTextCancelled: { 
      color: colors.danger,
      fontSize: 14,
      fontWeight: "700",
    },
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ui.overlay}>
        <TouchableOpacity style={ui.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[ui.sheet, sheetDepthShadow]}>
          <View style={ui.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={ui.topBar}>
              <Text style={ui.title}>Order Details</Text>
              <TouchableOpacity onPress={onClose} style={ui.closeBtn}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <RiderOrderCard order={order} />

            {/* Redesigned Stepper */}
            <View style={ui.timelineWrap}>
              {STAGES.map((stage, i) => {
                const isCancelledStage = order.status === "cancelled" && i === STAGES.length - 1;
                const completedBeforeCancel = order.status === "cancelled" && i < STAGES.length - 1;
                const done = (!isCancelled && i <= currentIdx) || completedBeforeCancel;
                const last = i === STAGES.length - 1;

                return (
                  <React.Fragment key={stage.key}>
                    <View style={ui.stageNode}>
                      {done ? (
                        <CircleCheck size={16} color={colors.primary} fill={`${colors.primary}20`} />
                      ) : isCancelledStage ? (
                        <View style={ui.circleCancelled} />
                      ) : (
                        <View style={ui.circleEmpty} />
                      )}
                      <Text
                        numberOfLines={1}
                        style={[ui.stageLabel, done || isCancelledStage ? ui.stageLabelActive : null]}
                      >
                        {stage.label}
                      </Text>
                    </View>
                    {!last && <View style={[ui.stageLine, done ? ui.stageLineActive : null]} />}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Hero Earnings Callout */}
            <View style={ui.heroSection}>
              <View style={ui.heroLabelWrap}>
                <Layers size={18} color={colors.textSecondary} />
                <Text style={ui.heroLabel}>Delivery Fee payout</Text>
              </View>
              <Text style={ui.heroValue}>GH₵ {(order.delivery_fee || 0).toFixed(2)}</Text>
            </View>

            {/* Native Hub-Spoke Route Timeline */}
            <View style={ui.addressBlock}>
              {/* Pickup Node */}
              <View style={ui.addressRow}>
                <View style={ui.timelineIndicator}>
                  <View style={[ui.dotOuter, { backgroundColor: `${colors.primary}20` }]}>
                    <View style={[ui.dotInner, { backgroundColor: colors.primary }]} />
                  </View>
                  <View style={[ui.connectorLine, { backgroundColor: colors.borderLight }]} />
                </View>
                <View style={ui.addressContent}>
                  <Text style={[ui.addressTag, { color: colors.primary }]}>Pickup Point</Text>
                  <Text style={ui.addressText}>{order.pickup_address || "---"}</Text>
                  <Text style={ui.addressTime}>{fmt(order.created_at)}</Text>
                </View>
              </View>

              {/* Drop-off Node */}
              <View style={ui.addressRow}>
                <View style={ui.timelineIndicator}>
                  <View style={[ui.dotOuter, { backgroundColor: "rgba(16, 185, 129, 0.2)" }]}>
                    <View style={[ui.dotInner, { backgroundColor: "#10b981" }]} />
                  </View>
                </View>
                <View style={ui.addressContent}>
                  <Text style={[ui.addressTag, { color: "#10b981" }]}>Drop-off Destination</Text>
                  <Text style={ui.addressText}>{order.delivery_address || "---"}</Text>
                  <Text style={ui.addressTime}>{fmt(order.received_at || order.updated_at)}</Text>
                </View>
              </View>
            </View>

            {/* Spec Data Grid Sheets */}
            <View style={ui.specsSection}>
              <View style={ui.specRow}>
                <View style={ui.specLabelGroup}>
                  <Package size={16} color={colors.textSecondary} />
                  <Text style={ui.specLabel}>Item Details</Text>
                </View>
                <Text style={ui.specValue} numberOfLines={1}>{order.item_description || "---"}</Text>
              </View>

              <View style={ui.specRow}>
                <View style={ui.specLabelGroup}>
                  <FileText size={16} color={colors.textSecondary} />
                  <Text style={ui.specLabel}>Recipient Type</Text>
                </View>
                <Text style={ui.specValue}>{order.customer_name || "---"}</Text>
              </View>

              {order.received_by && (
                <View style={ui.specRow}>
                  <View style={ui.specLabelGroup}>
                    <CircleCheck size={16} color={colors.success} />
                    <Text style={ui.specLabel}>Handed To</Text>
                  </View>
                  <Text style={ui.specValue}>{order.received_by}</Text>
                </View>
              )}

              {order.delivery_instructions && (
                <View style={[ui.specRow, { alignItems: "flex-start" }]}>
                  <View style={ui.specLabelGroup}>
                    <FileText size={16} color={colors.textSecondary} />
                    <Text style={ui.specLabel}>Instructions</Text>
                  </View>
                  <Text style={[ui.specValue, { textAlign: "right" }]}>{order.delivery_instructions}</Text>
                </View>
              )}
            </View>

            {/* Unified Communication Card */}
            <View style={ui.contactWrapper}>
              <View style={ui.contactToggle}>
                <TouchableOpacity
                  style={[ui.contactTab, contactMode === "pickup" && ui.contactTabActive]}
                  onPress={() => setContactMode("pickup")}
                >
                  <Text style={[ui.contactTabText, contactMode === "pickup" && ui.contactTabTextActive]}>
                    Sender
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[ui.contactTab, contactMode === "delivery" && ui.contactTabActive]}
                  onPress={() => setContactMode("delivery")}
                >
                  <Text style={[ui.contactTabText, contactMode === "delivery" && ui.contactTabTextActive]}>
                    Recipient
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={ui.profileIdentity}>
                <Text style={ui.contactName}>{activeName || "Unknown Profile"}</Text>
                {activePhone ? <Text style={ui.contactPhoneSub}>{activePhone}</Text> : null}
              </View>

              <View style={ui.contactActions}>
                <TouchableOpacity style={ui.contactBtn} onPress={handleCall}>
                  <Phone size={16} color={colors.textOnPrimary} />
                  <Text style={ui.contactBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={ui.contactBtn} onPress={handleSMS}>
                  <MessageSquare size={16} color={colors.textOnPrimary} />
                  <Text style={ui.contactBtnText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions Context Control */}
            {!isDone ? (
              <TouchableOpacity
                style={ui.primaryBtn}
                onPress={() => onAction?.(order, order.status)}
                activeOpacity={0.8}
              >
                <Text style={ui.primaryBtnText}>
                  {order.status === "pending"
                    ? "Accept Job"
                    : order.status === "assigned"
                    ? "Confirm Pickup"
                    : order.status === "picked_up"
                    ? "Start Delivery"
                    : order.status === "in_transit"
                    ? "Confirm Drop-off"
                    : "Proceed"}
                </Text>
              </TouchableOpacity>
            ) : isCancelled ? (
              <View style={ui.doneChipCancelled}>
                <Text style={ui.doneTextCancelled}>Order Cancelled</Text>
              </View>
            ) : (
              <View style={ui.doneChip}>
                <Package size={16} color="#10b981" />
                <Text style={ui.doneText}>Delivery Complete</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Simple internal helper wrapper sheet safely mapped inside component contexts
const StyleSheet = {
  absoluteFillObject: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }
};