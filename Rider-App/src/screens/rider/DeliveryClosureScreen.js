import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
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
import { supabase } from "../../services/supabaseClient";
import { CheckCircle2, X } from "lucide-react-native";
import SignatureScreen from "react-native-signature-canvas";

export default function DeliveryClosureScreen({ route, navigation }) {
  const { orderId } = route.params || {};
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
    // Incrementing the key tears down the stale canvas context and spawns a fresh, responsive one
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
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          received_by: receiverName.trim(),
          received_at: new Date().toISOString(),
          signature: signature,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      Alert.alert("Success", "Handover Complete. Consignment closed out.", [
        { text: "OK", onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const signatureWebPageStyle = `
    body, html, canvas { margin: 0; padding: 0; height: 100%; width: 100%; }
    body { background-color: #f8fafc; overflow: hidden; }
    .m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--footer { display: none !important; }
  `;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#115e59"
        translucent
      />

      {/* Header Accent Block */}
      <View style={[styles.headerBackground, styles.safeHeader]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Delivery Closure</Text>
          {order?.order_id && (
            <Text style={styles.headerSubtitle}>
              Waybill: #{order.order_id}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient Input */}
        <Text style={styles.label}>Recipient Handover Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Kwesi Mensah (Security Guard)"
          placeholderTextColor="#94a3b8"
          value={receiverName}
          onChangeText={setReceiverName}
        />

        {/* PIN Input */}
        <Text style={styles.label}>Delivery Verification PIN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 4-digit verification code"
          placeholderTextColor="#94a3b8"
          value={deliveryPin}
          onChangeText={setDeliveryPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        {/* Signature Status Row */}
        <View style={styles.signatureLabelRow}>
          <Text style={styles.label}>Recipient Signature</Text>
          {signature && (
            <Text style={styles.signatureStatusBadge}>Captured</Text>
          )}
        </View>

        {/* Signature Box Section */}
        <View style={styles.signatureCanvasContainer}>
          <SignatureScreen
            key={`sig-canvas-${sigKey}`}
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            webStyle={signatureWebPageStyle}
            autoClear={false}
          />
        </View>

        {/* Inline Action Controls Bar */}
        <View style={styles.signatureActions}>
          <TouchableOpacity style={styles.clearBtn} onPress={clearSignature}>
            <X size={14} color="#64748b" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={triggerSaveSignature}
          >
            <Text style={styles.confirmText}>Confirm Signature</Text>
          </TouchableOpacity>
        </View>

        {/* Close Waybill CTA Button */}
        <TouchableOpacity
          style={[
            styles.closeBtn,
            (!signature || submitting) && styles.disabledBtn,
          ]}
          onPress={finaliseOrderManifest}
          disabled={submitting || !signature}
        >
          {submitting ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#020617" />
              <Text style={styles.closeText}>
                Finalise Drop & Close Waybill
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  headerBackground: {
    backgroundColor: "#115e59",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  safeHeader: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 48,
  },
  headerContent: { gap: 2 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ccfbf1",
    opacity: 0.95,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  formContainer: { padding: 24, paddingBottom: 40 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    color: "#0f172a",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    height: 180,
    overflow: "hidden",
  },
  signatureStatusBadge: {
    fontSize: 10,
    fontWeight: "900",
    color: "#10b981",
    textTransform: "uppercase",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  clearText: { color: "#64748b", fontSize: 13, fontWeight: "700" },

  confirmBtn: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  confirmText: { color: "#0f172a", fontSize: 13, fontWeight: "800" },

  closeBtn: {
    backgroundColor: "#34d399",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#34d399",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  disabledBtn: { backgroundColor: "#cbd5e1", shadowOpacity: 0, elevation: 0 },
  closeText: { color: "#020617", fontSize: 15, fontWeight: "900" },
});
