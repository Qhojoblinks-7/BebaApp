import React, { useState, useEffect, useCallback } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Globe, Volume2, Palette, MapPin, Zap, Truck, ChevronRight } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

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
  const { colors, setTheme, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [preferences, setPreferences] = useState(defaultPreferences);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");

  const loadPreferences = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...parsed });
        if (parsed.theme) setTheme(parsed.theme);
      }
    } catch (err) {
      console.warn("[Preferences] Failed to extract persistent storage matrix:", err.message);
    }

    if (!user?.uid) return;

    try {
      const snap = await getDoc(doc(db, "rider_preferences", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        const loadedPrefs = {
          theme: data.theme ?? defaultPreferences.theme,
          language: data.language ?? defaultPreferences.language,
          volume: data.volume ?? defaultPreferences.volume,
          defaultVehicle: data.default_vehicle ?? defaultPreferences.defaultVehicle,
          maxDistance: data.max_distance ?? defaultPreferences.maxDistance,
          autoAccept: data.auto_accept ?? defaultPreferences.autoAccept,
        };
        setPreferences(loadedPrefs);
        setTheme(loadedPrefs.theme);
      }
    } catch (err) {
      console.warn("[Preferences] Failed to fetch remote context maps:", err.message);
    }
  }, [user?.uid, setTheme]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const savePreferences = async (newPrefs) => {
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, "rider_preferences", user.uid), {
        rider_id: user.uid,
        theme: newPrefs.theme,
        language: newPrefs.language,
        volume: newPrefs.volume,
        default_vehicle: newPrefs.defaultVehicle,
        max_distance: newPrefs.maxDistance,
        auto_accept: newPrefs.autoAccept,
        updated_at: serverTimestamp(),
      }, { merge: true });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch (err) {
      console.warn("[Preferences] Sync pipeline exception encountered:", err.message);
      Alert.alert("Connection Alert", "Settings cached locally, but cloud profiles could not update.");
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    }
  };

  const openEditor = (field, currentValue) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const applyEdit = async () => {
    const key = editingField;
    let value = tempValue;

    if (key === "volume" || key === "maxDistance") {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        Alert.alert("Invalid Input", "Please supply a standard numeric argument.");
        return;
      }
      value = num;
    } else if (key === "autoAccept") {
      value = tempValue === "true" || tempValue === true;
    }

    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    setEditingField(null);
    setTempValue("");
    
    await savePreferences(newPrefs);

    if (key === "theme") {
      setTheme(value);
    }
  };

  const dropDownOptions = (field) => {
    switch (field) {
      case "theme":
        return { label: "Theme Selection", options: ["dark", "light", "system"] };
      case "language":
        return { label: "Regional Language", options: ["English", "Twi", "Ewe", "Ga", "Hausa"] };
      case "defaultVehicle":
        return { label: "Default Operational Mode", options: ["Motorcycle", "Bicycle", "Car", "Van"] };
      case "autoAccept":
        return { label: "Auto-Accept Pipeline", options: [true, false] };
      default:
        return { label: field, options: [] };
    }
  };

  const getDisplayValue = (field, value) => {
    if (field === "volume" && typeof value === "number") return `${value}%`;
    if (field === "maxDistance" && typeof value === "number") return `${value} km`;
    if (field === "theme" && typeof value === "string") return value.charAt(0).toUpperCase() + value.slice(1);
    if (field === "autoAccept") return value ? "On" : "Off";
    return value?.toString() || "";
  };

  const preferenceGroups = [
    {
      group: "Appearance",
      items: [
        { id: "theme", icon: Palette, color: "#a855f7", label: "Theme", desc: "Global layout interface shell" },
        { id: "language", icon: Globe, color: "#115e59", label: "Language", desc: "Active localization translation" },
      ],
    },
    {
      group: "Audio & Feedback",
      items: [
        { id: "volume", icon: Volume2, color: "#6366f1", label: "Volume", desc: "Notification audio system metrics" },
      ],
    },
    {
      group: "Delivery Options",
      items: [
        { id: "defaultVehicle", icon: Truck, color: "#facc15", label: "Default Vehicle", desc: "Primary fleet transit resource" },
        { id: "maxDistance", icon: MapPin, color: "#10b981", label: "Max Distance", desc: "Operational boundary limitations" },
        { id: "autoAccept", icon: Zap, color: "#ef4444", label: "Auto-Accept", desc: "Instant deployment workflows" },
      ],
    },
  ];

  const renderEditorModal = () => {
    if (!editingField) return null;
    const { label, options } = dropDownOptions(editingField);
    const current = tempValue !== "" ? tempValue : preferences[editingField];

    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => setEditingField(null)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === "ios" ? "padding" : "height"} 
              style={{ width: "100%", alignItems: "center" }}
            >
              <TouchableWithoutFeedback>
                <View style={[styles.modalCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border || "rgba(255,255,255,0.08)" }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>

                  {options.length > 0 ? (
                    <View style={{ marginBottom: 20 }}>
                      {options.map((opt) => {
                        const selected = current === opt;
                        return (
                          <TouchableOpacity
                            key={opt.toString()}
                            style={styles.optionRow}
                            onPress={() => setTempValue(opt)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.radioOuter, { borderColor: colors.textMuted || "#475569" }, selected && { borderColor: colors.primary || "#115e59" }]}>
                              {selected && <View style={[styles.radioInner, { backgroundColor: colors.primary || "#115e59" }]} />}
                            </View>
                            <Text style={[styles.optionLabel, { color: colors.textSecondary }, selected && { color: colors.primary || "#115e59", fontWeight: "700" }]}>
                              {typeof opt === "boolean" ? (opt ? "On" : "Off") : opt.toString().charAt(0).toUpperCase() + opt.toString().slice(1)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <TextInput
                      value={tempValue.toString()}
                      onChangeText={setTempValue}
                      autoFocus
                      keyboardType={editingField === "volume" || editingField === "maxDistance" ? "numeric" : "default"}
                      style={[styles.modalInput, { backgroundColor: colors.backgroundInput || "rgba(0,0,0,0.2)", color: colors.text, borderColor: colors.border }]}
                      placeholderTextColor={colors.textMuted || "#64748b"}
                    />
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalCancelBtn, { backgroundColor: colors.backgroundInput || "rgba(0,0,0,0.15)", borderColor: colors.border }]} 
                      onPress={() => setEditingField(null)}
                    >
                      <Text style={[styles.modalCancelText, { color: colors.textSecondary || "#94a3b8" }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalSaveBtn, { backgroundColor: colors.primary || "#115e59" }]} 
                      onPress={applyEdit}
                    >
                      <Text style={styles.modalSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <View style={[
        styles.headerRow, 
        { paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14 }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Preferences</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 30 : 40 }}
      >
        <Text style={[styles.descText, { color: colors.textMuted || "#64748b" }]}>
          Customize your app experience and delivery defaults.
        </Text>

        {preferenceGroups.map((group) => (
          <View key={group.group} style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted || "#64748b" }]}>{group.group}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight || "rgba(255,255,255,0.04)" }]}>
              {group.items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.borderLight || "rgba(255,255,255,0.06)" }]} />}
                  <TouchableOpacity
                    style={styles.preferenceRow}
                    activeOpacity={0.7}
                    onPress={() => openEditor(item.id, preferences[item.id])}
                  >
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconBadge, { backgroundColor: `${item.color}15` }]}>
                        <item.icon size={15} color={item.color} />
                      </View>
                      <View style={styles.rowTexts}>
                        <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                        <Text style={[styles.rowDesc, { color: colors.textMuted || "#64748b" }]}>{item.desc}</Text>
                      </View>
                    </View>
                    <View style={styles.rowValueWrap}>
                      <Text style={[styles.rowValue, { color: colors.textSecondary || "#94a3b8" }]}>
                        {getDisplayValue(item.id, preferences[item.id])}
                      </Text>
                      <ChevronRight size={14} color={colors.textMuted || "#64748b"} />
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {renderEditorModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" },
  headerTitleText: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  headerRightSpacer: { width: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  descText: { fontSize: 13, fontWeight: "500", marginTop: 8, marginBottom: 20 },
  sectionBlock: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, marginBottom: 8, textTransform: "uppercase" },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowDesc: { fontSize: 11, fontWeight: "500" },
  rowValueWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowValue: { fontSize: 13, fontWeight: "700" },
  rowDivider: { height: 1, marginLeft: 56 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  modalInput: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
});