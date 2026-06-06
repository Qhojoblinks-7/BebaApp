import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import {
  X,
  Phone,
  CircleCheck,
  MessageSquare,
  Package,
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

export default function DeliveryDetailsBottomSheet({
  order,
  visible,
  onClose,
  onAction,
}) {
  const [contactMode, setContactMode] = useState("pickup");
  const { colors } = useThemeStore();

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

  const staticStyles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end" },
    backdrop: { flex: 1 },
    sheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: "88%",
      paddingBottom: Platform.OS === "ios" ? 36 : 24,
    },
    handle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    title: { fontSize: 18, fontWeight: "800" },
    timelineWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 20,
      marginBottom: 20,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 14,
    },
    stageNode: {
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2,
      width: 52,
    },
    circleEmpty: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
    },
    circleCancelled: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    stageLabel: {
      fontSize: 9,
      fontWeight: "800",
      marginTop: 6,
      textAlign: "center",
    },
    stageLine: {
      flex: 1,
      height: 2,
      marginHorizontal: -16,
      transform: [{ translateY: -6 }],
      zIndex: 1,
    },
    infoSection: {
      borderRadius: 20,
      marginHorizontal: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 14,
      gap: 12,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "capitalize",
      width: 80,
      paddingTop: 1,
    },
    rightInfoBlock: { flex: 1, alignItems: "flex-end" },
    infoValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
    },
    infoValueAccent: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      textAlign: "right",
    },
    infoSub: {
      fontSize: 11,
      fontWeight: "500",
      textAlign: "right",
      marginTop: 2,
    },
    phoneText: {
      fontSize: 13,
      fontWeight: "700",
      textAlign: "right",
    },
    contactSwitcher: {
      borderRadius: 14,
      padding: 12,
      marginTop: 6,
      gap: 10,
    },
    contactToggle: {
      flexDirection: "row",
      borderRadius: 10,
      padding: 3,
      gap: 3,
    },
    contactTab: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    contactTabText: {
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    contactName: {
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
    contactActions: {
      flexDirection: "row",
      gap: 10,
    },
    contactBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
    },
    contactBtnText: {
      fontSize: 14,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    primaryBtn: {
      marginHorizontal: 20,
      height: 50,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    doneChip: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      marginHorizontal: 20,
    },
    doneChipCancelled: {
      paddingVertical: 12,
      marginHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },
  });

  const themedStyles = {
    overlay: { backgroundColor: "#000000aa" },
    sheet: { backgroundColor: colors.backgroundSecondary },
    handle: { backgroundColor: colors.textMuted },
    title: { color: colors.text },
    timelineWrap: { backgroundColor: colors.backgroundSecondary },
    circleEmpty: {
      borderColor: colors.textMuted,
      backgroundColor: colors.backgroundSecondary,
    },
    stageLabel: { color: colors.textMuted },
    stageLabelActive: { color: colors.text },
    stageLine: { backgroundColor: colors.border },
    stageLineActive: { backgroundColor: colors.primary },
    infoSection: {
      backgroundColor: colors.backgroundCard,
      borderColor: colors.borderLight,
    },
    infoLabel: { color: colors.textSecondary },
    infoValue: { color: colors.text },
    infoValueAccent: { color: "#f59e0b" },
    infoSub: { color: colors.textSecondary },
    phoneText: { color: "#38bdf8" },
    contactSwitcher: { backgroundColor: colors.backgroundCard },
    contactToggle: { backgroundColor: colors.backgroundSecondary },
    contactTabActive: { backgroundColor: colors.primary },
    contactTabText: { color: colors.textMuted },
    contactTabTextActive: { color: colors.textOnPrimary },
    contactName: { color: colors.text },
    contactBtn: { backgroundColor: colors.primary },
    contactBtnText: { color: colors.textOnPrimary },
    primaryBtn: { backgroundColor: colors.primary },
    primaryBtnText: { color: colors.textOnPrimary },
    doneText: { color: "#10b981" },
    doneTextCancelled: { color: colors.danger },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={staticStyles.overlay}>
        <TouchableOpacity
          style={staticStyles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={staticStyles.sheet}>
          <View style={staticStyles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={staticStyles.topBar}>
              <Text style={[staticStyles.title, themedStyles.title]}>Order Details</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <RiderOrderCard order={order} />

            {/* Realigned Stepper Timeline Track */}
            <View style={[staticStyles.timelineWrap, themedStyles.timelineWrap]}>
              {STAGES.map((stage, i) => {
                const isCancelledStage = order.status === "cancelled" && i === STAGES.length - 1;
                const completedBeforeCancel = order.status === "cancelled" && i < STAGES.length - 1;
                const done = (!isCancelled && i <= currentIdx) || completedBeforeCancel;
                const last = i === STAGES.length - 1;

                return (
                  <React.Fragment key={stage.key}>
                    <View style={staticStyles.stageNode}>
                      {done ? (
                        <CircleCheck size={18} color="#ffffff" fill={colors.primary} />
                      ) : isCancelledStage ? (
                        <View style={staticStyles.circleCancelled} />
                      ) : (
                        <View style={[staticStyles.circleEmpty, themedStyles.circleEmpty]} />
                      )}
                      <Text
                        numberOfLines={1}
                        style={[
                          staticStyles.stageLabel,
                          themedStyles.stageLabel,
                          done || isCancelledStage ? themedStyles.stageLabelActive : null,
                        ]}
                      >
                        {stage.label}
                      </Text>
                    </View>
                    {!last && (
                      <View
                        style={[
                          staticStyles.stageLine,
                          themedStyles.stageLine,
                          done ? themedStyles.stageLineActive : null,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Information Key Value Sheets */}
            <View style={[staticStyles.infoSection, themedStyles.infoSection]}>
              <View style={staticStyles.infoRow}>
                <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Item</Text>
                <Text style={[staticStyles.infoValue, themedStyles.infoValue]}>
                  {order.item_description || "---"}
                </Text>
              </View>
              <View style={staticStyles.infoRow}>
                <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Fee</Text>
                <Text style={[staticStyles.infoValueAccent, themedStyles.infoValueAccent]}>
                  GH₵ {(order.delivery_fee || 0).toFixed(2)}
                </Text>
              </View>
              <View style={staticStyles.infoRow}>
                <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Customer</Text>
                <Text style={[staticStyles.infoValue, themedStyles.infoValue]}>
                  {order.customer_name || "---"}
                </Text>
              </View>
              <View style={staticStyles.infoRow}>
                <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Pickup</Text>
                <View style={staticStyles.rightInfoBlock}>
                  <Text style={[staticStyles.infoValue, themedStyles.infoValue]}>
                    {order.pickup_address || "---"}
                  </Text>
                  <Text style={[staticStyles.infoSub, themedStyles.infoSub]}>{fmt(order.created_at)}</Text>
                </View>
              </View>
              <View style={staticStyles.infoRow}>
                <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Drop-off</Text>
                <View style={staticStyles.rightInfoBlock}>
                  <Text style={[staticStyles.infoValue, themedStyles.infoValue]}>
                    {order.delivery_address || "---"}
                  </Text>
                  <Text style={[staticStyles.infoSub, themedStyles.infoSub]}>
                    {fmt(order.received_at || order.updated_at)}
                  </Text>
                </View>
              </View>

              {order.received_by && (
                <View style={staticStyles.infoRow}>
                  <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Received By</Text>
                  <Text style={[staticStyles.infoValue, themedStyles.infoValue]}>{order.received_by}</Text>
                </View>
              )}
              {order.delivery_instructions && (
                <View style={staticStyles.infoRow}>
                  <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Instructions</Text>
                  <Text style={[staticStyles.infoValue, themedStyles.infoValue]}>
                    {order.delivery_instructions}
                  </Text>
                </View>
              )}
              {activePhone ? (
                <View style={staticStyles.infoRow}>
                  <Text style={[staticStyles.infoLabel, themedStyles.infoLabel]}>Phone</Text>
                  <TouchableOpacity onPress={handleCall}>
                    <Text style={[staticStyles.phoneText, themedStyles.phoneText]}>{activePhone}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Dynamic Communication Unit Switcher */}
              <View style={[staticStyles.contactSwitcher, themedStyles.contactSwitcher]}>
                <View style={[staticStyles.contactToggle, themedStyles.contactToggle]}>
                  <TouchableOpacity
                    style={[
                      staticStyles.contactTab,
                      contactMode === "pickup" && staticStyles.contactTab,
                      contactMode === "pickup" && themedStyles.contactTabActive,
                    ]}
                    onPress={() => setContactMode("pickup")}
                  >
                    <Text
                      style={[
                        staticStyles.contactTabText,
                        themedStyles.contactTabText,
                        contactMode === "pickup" && themedStyles.contactTabTextActive,
                      ]}
                    >
                      Pickup
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      staticStyles.contactTab,
                      contactMode === "delivery" && staticStyles.contactTab,
                      contactMode === "delivery" && themedStyles.contactTabActive,
                    ]}
                    onPress={() => setContactMode("delivery")}
                  >
                    <Text
                      style={[
                        staticStyles.contactTabText,
                        themedStyles.contactTabText,
                        contactMode === "delivery" && themedStyles.contactTabTextActive,
                      ]}
                    >
                      Delivery
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[staticStyles.contactName, themedStyles.contactName]}>
                  {activeName || "Unknown Contact"}
                </Text>
                <View style={staticStyles.contactActions}>
                  <TouchableOpacity style={[staticStyles.contactBtn, themedStyles.contactBtn]} onPress={handleCall}>
                    <Phone size={18} color="#ffffff" />
                    <Text style={[staticStyles.contactBtnText, themedStyles.contactBtnText]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[staticStyles.contactBtn, themedStyles.contactBtn]} onPress={handleSMS}>
                    <MessageSquare size={18} color="#ffffff" />
                    <Text style={[staticStyles.contactBtnText, themedStyles.contactBtnText]}>SMS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Workflow Confirmation Trigger Area */}
            {!isDone ? (
              <TouchableOpacity
                style={[staticStyles.primaryBtn, themedStyles.primaryBtn]}
                onPress={() => onAction?.(order, order.status)}
                activeOpacity={0.8}
              >
                <Text style={[staticStyles.primaryBtnText, themedStyles.primaryBtnText]}>
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
              <View style={staticStyles.doneChipCancelled}>
                <Text style={[staticStyles.doneTextCancelled, themedStyles.doneTextCancelled]}>Order cancelled</Text>
              </View>
            ) : (
              <View style={staticStyles.doneChip}>
                <Package size={16} color="#10b981" />
                <Text style={[staticStyles.doneText, themedStyles.doneText]}>Workflow complete</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}