import React from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Eye, EyeOff, Loader2, Save, X } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FoodVendorFormSheet({
  visible,
  saving,
  editingId,
  form,
  onClose,
  onSave,
  onFieldChange,
  canSave,
}) {
  const theme = useThemeStore();
  const colors = theme.colors || {};
  const isDarkMode = theme.isDarkMode;
  const insets = useSafeAreaInsets();

  const ui = {
    background: colors.background || "#f8fafc",
    backgroundSecondary: colors.backgroundSecondary || "#f1f5f9",
    backgroundCard: colors.backgroundCard || "#ffffff",
    backgroundInput: colors.backgroundInput || "#ffffff",
    text: colors.text || "#0f172a",
    textSecondary: colors.textSecondary || "#475569",
    textMuted: colors.textMuted || "#64748b",
    textDisabled: colors.textDisabled || "#94a3b8",
    textOnPrimary: colors.textOnPrimary || "#ffffff",
    border: colors.border || "#e2e8f0",
    borderLight: colors.borderLight || "#f1f5f9",
    primary: colors.primary || "#115e59",
    primaryAlpha: colors.primaryAlpha || "#115e5980",
    secondary: colors.secondary || "#6366f1",
    success: colors.success || "#10b981",
    danger: colors.danger || "#ef4444",
    overlay: colors.overlay || (isDarkMode ? "rgba(2,6,23,0.78)" : "rgba(15,23,42,0.58)"),
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: ui.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.sheet || ui.backgroundCard,
              borderColor: ui.border,
              paddingBottom: Math.max(insets.bottom, Platform.OS === "ios" ? 28 : 18),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: ui.textDisabled }]} />

          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: ui.text }]}>{editingId ? "Edit Vendor" : "Add Vendor"}</Text>
              <Text style={[styles.subtitle, { color: ui.textMuted }]}>Update the food list customers will see.</Text>
            </View>
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]} onPress={onClose}>
              <X size={20} color={ui.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <FormSection title="Vendor details" ui={ui}>
              <FormField label="Vendor name" value={form.name} onChangeText={(value) => onFieldChange("name", value)} placeholder="Auntie Ama Kitchen" ui={ui} />
              <FormField label="Category" value={form.category} onChangeText={(value) => onFieldChange("category", value)} placeholder="Local Meals" ui={ui} />
              <FormField label="Phone" value={form.phone} onChangeText={(value) => onFieldChange("phone", value)} placeholder="+233 24 456 7890" keyboardType="phone-pad" ui={ui} />
              <FormField label="Location" value={form.location} onChangeText={(value) => onFieldChange("location", value)} placeholder="Osu, Accra" ui={ui} />
            </FormSection>

            <FormSection title="Pickup and delivery" ui={ui}>
              <FormField label="Pickup address" value={form.pickupAddress} onChangeText={(value) => onFieldChange("pickupAddress", value)} placeholder="Same as location" ui={ui} />
              <View style={styles.twoColumn}>
                <FormField label="Pickup lat" value={form.pickupLat} onChangeText={(value) => onFieldChange("pickupLat", value)} placeholder="5.555" keyboardType="decimal-pad" ui={ui} />
                <FormField label="Pickup lng" value={form.pickupLng} onChangeText={(value) => onFieldChange("pickupLng", value)} placeholder="-0.196" keyboardType="decimal-pad" ui={ui} />
              </View>
              <View style={styles.twoColumn}>
                <FormField label="Distance km" value={form.distance} onChangeText={(value) => onFieldChange("distance", value)} placeholder="2.5" keyboardType="decimal-pad" ui={ui} />
                <FormField label="Delivery fee" value={form.deliveryFee} onChangeText={(value) => onFieldChange("deliveryFee", value)} placeholder="10" keyboardType="decimal-pad" ui={ui} />
              </View>
              <View style={styles.twoColumn}>
                <FormField label="Estimated time" value={form.estimatedTime} onChangeText={(value) => onFieldChange("estimatedTime", value)} placeholder="25-35 min" ui={ui} />
                <FormField label="Opening hours" value={form.openingHours} onChangeText={(value) => onFieldChange("openingHours", value)} placeholder="8AM - 9PM" ui={ui} />
              </View>
              <FormField label="Image URL" value={form.image} onChangeText={(value) => onFieldChange("image", value)} placeholder="https://example.com/logo.png" ui={ui} />
              <FormField label="Popular dishes" value={form.popularDishes} onChangeText={(value) => onFieldChange("popularDishes", value)} placeholder="Jollof rice, Waakye, Grilled tilapia" ui={ui} />
              <FormField label="Description" value={form.description} onChangeText={(value) => onFieldChange("description", value)} placeholder="Trusted local food vendor." multiline ui={ui} />
            </FormSection>

            <FormSection title="Availability" ui={ui}>
              <ToggleRow label="Open now" active={form.isOpen} onPress={() => onFieldChange("isOpen", !form.isOpen)} activeIcon={form.isOpen ? <Eye size={16} /> : <EyeOff size={16} />} ui={ui} />
              <ToggleRow label="Delivery available" active={form.deliveryAvailable} onPress={() => onFieldChange("deliveryAvailable", !form.deliveryAvailable)} activeIcon={<CheckCircle2 size={16} />} ui={ui} />
              <ToggleRow label="Verified badge" active={form.verificationBadge} onPress={() => onFieldChange("verificationBadge", !form.verificationBadge)} activeIcon={<CheckCircle2 size={16} />} ui={ui} />
            </FormSection>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: ui.border }]}>
            <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]} onPress={onClose}>
              <Text style={[styles.secondaryButtonText, { color: ui.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: saving || !canSave ? ui.textDisabled : ui.primary }]} onPress={onSave} disabled={saving || !canSave}>
              {saving ? <Loader2 size={18} color={ui.textOnPrimary} /> : <Save size={18} color={ui.textOnPrimary} />}
              <Text style={[styles.primaryButtonText, { color: ui.textOnPrimary }]}>{saving ? "Saving..." : "Save Vendor"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FormSection({ title, children, ui }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: ui.textMuted }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, ui }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: ui.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, { backgroundColor: ui.backgroundInput, borderColor: ui.border, color: ui.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={ui.textDisabled}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical="top"
      />
    </View>
  );
}

function ToggleRow({ label, active, onPress, activeIcon, ui }) {
  return (
    <TouchableOpacity style={[styles.toggleRow, { backgroundColor: active ? ui.primary : ui.backgroundCard, borderColor: active ? ui.primary : ui.border }]} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.toggleDot, { backgroundColor: active ? ui.textOnPrimary : ui.textMuted }]}>{activeIcon}</View>
      <Text style={[styles.toggleText, { color: active ? ui.textOnPrimary : ui.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderWidth: 1,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "950",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "950",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  sectionBody: {
    gap: 12,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "850",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "750",
  },
  textArea: {
    minHeight: 86,
  },
  twoColumn: {
    flexDirection: "row",
    gap: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  toggleDot: {
    width: 30,
    height: 30,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "900",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 0.8,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    flex: 1.2,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "950",
  },
});
