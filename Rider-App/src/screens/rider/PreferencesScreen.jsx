import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Globe, Volume2, Palette, MapPin, Zap, Truck, ChevronRight } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";

const STORAGE_KEY = "rider_preferences";

const defaultPreferences = {
  theme: "dark",
  language: "English",
  volume: 80,
  defaultVehicle: "Motorcycle",
  maxDistance: 15,
  autoAccept: false,
};

export default function PreferencesScreen({ navigation }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
      }
    } catch (err) {
      console.warn("Failed to load local preferences:", err.message);
    }

    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("rider_preferences")
        .select("*")
        .eq("rider_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          theme: data.theme ?? defaultPreferences.theme,
          language: data.language ?? defaultPreferences.language,
          volume: data.volume ?? defaultPreferences.volume,
          defaultVehicle: data.default_vehicle ?? defaultPreferences.defaultVehicle,
          maxDistance: data.max_distance ?? defaultPreferences.maxDistance,
          autoAccept: data.auto_accept ?? defaultPreferences.autoAccept,
        });
      }
    } catch (err) {
      console.warn("Failed to load preferences from server:", err.message);
    }
  };

  const savePreferences = async (newPrefs) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("rider_preferences")
        .upsert(
          {
            rider_id: user.id,
            theme: newPrefs.theme,
            language: newPrefs.language,
            volume: newPrefs.volume,
            default_vehicle: newPrefs.defaultVehicle,
            max_distance: newPrefs.maxDistance,
            auto_accept: newPrefs.autoAccept,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "rider_id" }
        );

      if (error) throw error;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (err) {
      console.warn("Failed to save preferences:", err.message);
      Alert.alert("Error", "Failed to save preferences");
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    }
  };

  const openEditor = (field, currentValue) => {
    setEditingField(field);
    setTempValue(JSON.stringify(currentValue));
  };

  const applyEdit = async () => {
    const key = editingField;
    let value = tempValue;

    if (key === "volume" || key === "maxDistance") {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        Alert.alert("Error", "Please enter a valid number");
        return;
      }
      value = num;
    } else if (key === "autoAccept") {
      value = tempValue === "true";
    }

    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    setEditingField(null);
    setTempValue("");
    await savePreferences(newPrefs);
  };

  const dropDownOptions = (field) => {
    switch (field) {
      case "theme":
        return { label: "Theme", options: ["dark", "light", "system"] };
      case "language":
        return { label: "Language", options: ["English", "Twi", "Ewe", "Ga", "Hausa"] };
      case "defaultVehicle":
        return { label: "Default Vehicle", options: ["Motorcycle", "Bicycle", "Car", "Van"] };
      case "autoAccept":
        return { label: "Auto-Accept", options: [true, false] };
      default:
        return { label: field, options: [] };
    }
  };

  const getDisplayValue = (field, value) => {
    if (field === "volume" && typeof value === "number") return `${value}%`;
    if (field === "maxDistance" && typeof value === "number") return `${value} km`;
    if (field === "defaultVehicle") return value;
    if (field === "theme") return value.charAt(0).toUpperCase() + value.slice(1);
    if (field === "language") return value;
    if (field === "autoAccept") return value ? "On" : "Off";
    return JSON.stringify(value);
  };

  const preferenceGroups = [
    {
      group: "Appearance",
      items: [
        { id: "theme", icon: Palette, color: "#a855f7", label: "Theme", desc: "App appearance" },
        { id: "language", icon: Globe, color: "#115e59", label: "Language", desc: "Display language" },
      ],
    },
    {
      group: "Audio & Feedback",
      items: [
        { id: "volume", icon: Volume2, color: "#6366f1", label: "Volume", desc: "App sound level" },
      ],
    },
    {
      group: "Delivery",
      items: [
        { id: "defaultVehicle", icon: Truck, color: "#facc15", label: "Default Vehicle", desc: "Your primary delivery mode" },
        { id: "maxDistance", icon: MapPin, color: "#10b981", label: "Max Distance", desc: "Willing travel distance" },
        { id: "autoAccept", icon: Zap, color: "#ef4444", label: "Auto-Accept", desc: "Automatically accept jobs" },
      ],
    },
  ];

  const renderEditorModal = () => {
    if (!editingField) return null;
    const { label, options } = dropDownOptions(editingField);
    const current = preferences[editingField];

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setEditingField(null)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{label}</Text>

                {options.length > 0 ? (
                  options.map((opt) => {
                    const selected = JSON.stringify(current) === JSON.stringify(opt);
                    return (
                      <TouchableOpacity
                        key={JSON.stringify(opt)}
                        style={styles.optionRow}
                        onPress={() => setTempValue(JSON.stringify(opt))}
                      >
                        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                          {selected && <View style={styles.radioInner} />}
                        </View>
                        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                          {typeof opt === "boolean" ? (opt ? "On" : "Off") : opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <TextInput
                    value={tempValue}
                    onChangeText={setTempValue}
                    autoFocus
                    keyboardType={editingField === "volume" || editingField === "maxDistance" ? "numeric" : "default"}
                    style={styles.modalInput}
                  />
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingField(null)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={applyEdit}>
                    <Text style={styles.modalSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Preferences</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.descText}>
          Customize your app experience and delivery defaults.
        </Text>

        {preferenceGroups.map((group) => (
          <View key={group.group} style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>{group.group}</Text>
            <View style={styles.sectionCard}>
              {group.items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={styles.rowDivider} />}
                  <TouchableOpacity
                    style={styles.preferenceRow}
                    activeOpacity={0.7}
                    onPress={() => openEditor(item.id, preferences[item.id])}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBadge, { backgroundColor: `${item.color}20` }]}>
                        <item.icon size={16} color={item.color} />
                      </View>
                      <View style={styles.rowTexts}>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        <Text style={styles.rowDesc}>{item.desc}</Text>
                      </View>
                    </View>
                    <View style={styles.rowValueWrap}>
                      <Text style={styles.rowValue}>{getDisplayValue(item.id, preferences[item.id])}</Text>
                      <ChevronRight size={14} color="#64748b" />
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderEditorModal()}
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
    backgroundColor: "#0b0d0f",
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitleText: { fontSize: 18, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  headerRightSpacer: { width: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  descText: { fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 8, marginBottom: 20 },
  sectionBlock: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#64748b", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" },
  sectionCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffffff04",
    overflow: "hidden",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  rowTexts: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  rowDesc: { fontSize: 11, fontWeight: "500", color: "#64748b" },
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowValue: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  rowDivider: { height: 1, backgroundColor: "#ffffff08", marginLeft: 56 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#ffffff08",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#0b0d0f",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: "#ffffff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ffffff10",
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: "#115e59",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#115e59",
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  optionLabelSelected: {
    color: "#115e59",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#0b0d0f",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#94a3b8",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#115e59",
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});
