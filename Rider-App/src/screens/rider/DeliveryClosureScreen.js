import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, X } from "lucide-react-native";
import SignatureScreen from "react-native-signature-canvas";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { useThemeStore } from "../../store/themeStore";

export default function DeliveryClosureScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [deliveryPin, setDeliveryPin] = useState("");
  const [signature, setSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Key state to force-reset the WebView canvas touch responders when cleared
  const [sigKey, setSigKey] = useState(0);
  const signatureRef = useRef(null);

  useEffect(() => {
    if (orderId) {
      supabase
        .from("orders")
        .select("order_id, delivery_pin")
        .eq("id", orderId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setOrder(data);
        });
    }
  }, [orderId]);

  const handleSignature = (sig) => {
    setSignature(sig);
    Alert.alert("Success", "Signature captured successfully.");
  };

  const handleEmpty = () => {
    setSignature(null);
  };

  const clearSignature = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
    setSigKey((prev) => prev + 1);
  };

  const triggerSaveSignature = () => {
    signatureRef.current?.readSignature();
  };

  const finaliseOrderManifest = async () => {
    if (!receiverName.trim()) {
      Alert.alert("Error", "Recipient name is required.");
      return;
    }

    if (!deliveryPin.trim()) {
      Alert.alert("Error", "Delivery PIN is required.");
      return;
    }

    if (
      order?.delivery_pin &&
      deliveryPin.trim() !== String(order.delivery_pin).trim()
    ) {
      Alert.alert(
        "Error",
        "Invalid PIN. Recipient must provide the correct delivery verification code.",
      );
      return;
    }

    if (!signature) {
      Alert.alert(
        "Signature Required",
        'Please have the recipient sign and press "Confirm Signature" before closing.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          received_by: receiverName.trim(),
          received_at: now,
          signature: signature,
          updated_at: now,
        })
        .eq("id", orderId);

      if (error) throw error;

      const { data: orderData, error: fetchError } = await supabase
        .from("orders")
        .select("delivery_fee")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchError) {
        console.warn("[DeliveryClosure] Fee fetch failed:", fetchError.message);
      }

      const fee = orderData?.delivery_fee;
      if (fee !== null && fee !== undefined) {
        const { error: revenueError } = await supabase.from("revenue").insert({
          rider_id: user.id,
          order_id: orderId,
          amount: Number(fee),
          order_completed_at: now,
        });
        if (revenueError) {
          console.warn("[DeliveryClosure] Revenue insert failed:", revenueError.message);
        }
      }

      Alert.alert("Success", "Handover Complete. Consignment closed out.", [
        { text: "OK", onPress: () => navigation.navigate("DashboardTab") },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Base64 context stylesheet injected explicitly inside signature web frame
  const signatureWebPageStyle = `
    body, html, canvas { margin: 0; padding: 0; height: 100%; width: 100%; }
    body { background-color: ${isDarkMode ? colors.backgroundSecondary : "#f8fafc"}; overflow: hidden; }
    .m-signature-pad { box-shadow: none; border: none; background-color: transparent; }
    .m-signature-pad--body canvas { border-radius: 12px; background-color: ${isDarkMode ? "#1e293b" : "#ffffff"}; }
    .m-signature-pad--footer { display: none !important; }
  `;

  // --- Dynamic Style Matrix mapped direct to application theme context ---
  const ui = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerWrapper: {
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 20) : StatusBar.currentHeight + 16,
      paddingHorizontal: 24,
      paddingBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        android: { elevation: 6 },
      }),
    },
    headerContent: {
      gap: 2,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: colors.textOnPrimary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textOnPrimary,
      opacity: 0.85,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    formContainer: {
      padding: 24,
      paddingBottom: Platform.OS === "ios" ? insets.bottom + 40 : 56,
    },
    label: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.backgroundCard,
      color: colors.text,
      borderRadius: 14,
      padding: 16,
      fontSize: 15,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.borderLight,
      fontWeight: "600",
    },
    signatureLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    signatureCanvasContainer: {
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 14,
      backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
      height: 180,
      overflow: "hidden",
    },
    signatureStatusBadge: {
      fontSize: 10,
      fontWeight: "900",
      color: "#10b981",
      textTransform: "uppercase",
      backgroundColor: isDarkMode ? "rgba(16, 185, 129, 0.15)" : "#ecfdf5",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    signatureActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      marginBottom: 32,
    },
    clearBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    clearText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    confirmBtn: {
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    confirmText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    closeBtn: {
      backgroundColor: "#34d399",
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: "#34d399",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: { elevation: 3 },
      }),
    },
    disabledBtn: {
      backgroundColor: colors.borderLight,
      shadowOpacity: 0,
      elevation: 0,
    },
    closeText: {
      color: "#020617",
      fontSize: 15,
      fontWeight: "900",
    },
  };

  return (
    <View style={ui.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Styled Top Header Accent Container */}
      <View style={ui.headerWrapper}>
        <View style={ui.headerContent}>
          <Text style={ui.headerTitle}>Delivery Closure</Text>
          {order?.order_id && (
            <Text style={ui.headerSubtitle}>Waybill: #{order.order_id}</Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={ui.formContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Recipient Input */}
        <Text style={ui.label}>Recipient Handover Name</Text>
        <TextInput
          style={ui.input}
          placeholder="e.g., Kwesi Mensah (Security Guard)"
          placeholderTextColor={colors.textDisabled}
          value={receiverName}
          onChangeText={setReceiverName}
          autoCorrect={false}
        />

        {/* PIN Input */}
        <Text style={ui.label}>Delivery Verification PIN</Text>
        <TextInput
          style={ui.input}
          placeholder="Enter 4-digit verification code"
          placeholderTextColor={colors.textDisabled}
          value={deliveryPin}
          onChangeText={setDeliveryPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        {/* Signature Status Info Bar */}
        <View style={ui.signatureLabelRow}>
          <Text style={ui.label}>Recipient Signature</Text>
          {signature && <Text style={ui.signatureStatusBadge}>Captured</Text>}
        </View>

        {/* Dynamic Signature Web Container */}
        <View style={ui.signatureCanvasContainer}>
          <SignatureScreen
            key={`sig-canvas-${sigKey}`}
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            webStyle={signatureWebPageStyle}
            autoClear={false}
          />
        </View>

        {/* Signature Action Controllers */}
        <View style={ui.signatureActions}>
          <TouchableOpacity style={ui.clearBtn} onPress={clearSignature}>
            <X size={14} color={colors.textMuted} />
            <Text style={ui.clearText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={ui.confirmBtn} onPress={triggerSaveSignature}>
            <Text style={ui.confirmText}>Confirm Signature</Text>
          </TouchableOpacity>
        </View>

        {/* Waybill Finalization Controller */}
        <TouchableOpacity
          style={[ui.closeBtn, (!signature || submitting) && ui.disabledBtn]}
          onPress={finaliseOrderManifest}
          disabled={submitting || !signature}
        >
          {submitting ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#020617" />
              <Text style={ui.closeText}>Finalise Drop & Close Waybill</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}