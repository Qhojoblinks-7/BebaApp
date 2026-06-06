import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
  Linking,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Trash2, ChevronRight, Moon, Sun } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
import { useThemeStore } from "../../store/themeStore";

const STORAGE_KEY = "security_settings";

const defaultSettings = {
  shareLocation: true,
  profileVisible: false,
  twoFactorEnabled: false,
  biometricEnabled: true,
};

export default function PrivacySecurityScreen({ navigation }) {
  const { user } = useAuth();
  const { isDarkMode, setTheme } = useThemeStore();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  useEffect(() => {
    AsyncStorage.setItem("app_theme", isDarkMode ? "dark" : "light").catch(() => {});
  }, [isDarkMode]);

  const loadSettings = async () => {
    try {
      const themeSaved = await AsyncStorage.getItem("app_theme");
      if (themeSaved === "light" || themeSaved === "dark") {
        setTheme(themeSaved === "dark");
      }
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (err) {
      console.warn("Failed to load local security settings:", err.message);
    }

    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("privacy_security_settings")
        .select("*")
        .eq("rider_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          shareLocation: data.share_location ?? defaultSettings.shareLocation,
          profileVisible: data.profile_visible ?? defaultSettings.profileVisible,
          twoFactorEnabled: data.two_factor_enabled ?? defaultSettings.twoFactorEnabled,
          biometricEnabled: data.biometric_enabled ?? defaultSettings.biometricEnabled,
        });
      }
    } catch (err) {
      console.warn("Failed to load security settings from server:", err.message);
    }
  };

  const saveSettings = async (newSettings) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from("privacy_security_settings")
        .upsert(
          {
            rider_id: user.id,
            share_location: newSettings.shareLocation,
            profile_visible: newSettings.profileVisible,
            two_factor_enabled: newSettings.twoFactorEnabled,
            biometric_enabled: newSettings.biometricEnabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "rider_id" }
        );

      if (error) throw error;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.warn("Failed to save security settings:", err.message);
      Alert.alert("Error", "Failed to save security settings");
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    }
  };

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const toggle = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleChangePassword = () => {
    setNewPassword("");
    setPasswordModalVisible(true);
  };

  const submitNewPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Success", "Password updated successfully");
    }
    setPasswordModalVisible(false);
    setNewPassword("");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is irreversible. Please contact support at support@beba.express to proceed with account deletion.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Contact Support",
          style: "destructive",
          onPress: () => Linking.openURL("mailto:support@beba.express").catch(() => {}),
        },
      ]
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
        <Text style={styles.headerTitleText}>Privacy & Security</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Shield size={20} color="#115e59" />
          <Text style={styles.infoText}>
            Manage how your data is used and keep your account secure. Enable
            extra protections to prevent unauthorized access.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#115e5920" }]}>
                <Eye size={16} color="#115e59" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={settings.shareLocation ? styles.settingLabel : styles.disabledLabel}>
                  Share Live Location
                </Text>
                <Text style={styles.settingDesc}>
                  Allow dispatch to see your real-time position
                </Text>
              </View>
            </View>
            <Switch
              value={settings.shareLocation}
              onValueChange={() => toggle("shareLocation")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.shareLocation ? "#115e59" : "#64748b"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#a855f720" }]}>
                {settings.profileVisible ? (
                  <Eye size={16} color="#a855f7" />
                ) : (
                  <EyeOff size={16} color="#64748b" />
                )}
              </View>
              <View style={styles.settingTexts}>
                <Text style={settings.profileVisible ? styles.settingLabel : styles.disabledLabel}>
                  Public Profile
                </Text>
                <Text style={styles.settingDesc}>
                  Let customers and dispatch view your profile
                </Text>
              </View>
            </View>
            <Switch
              value={settings.profileVisible}
              onValueChange={() => toggle("profileVisible")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.profileVisible ? "#115e59" : "#64748b"}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#6366f120" }]}>
                {isDarkMode ? <Moon size={16} color="#6366f1" /> : <Sun size={16} color="#facc15" />}
              </View>
              <View style={styles.settingTexts}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDesc}>
                  {isDarkMode ? "Dark theme is enabled" : "Light theme is enabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={() => setTheme(!isDarkMode)}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={isDarkMode ? "#115e59" : "#64748b"}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Security</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#facc1520" }]}>
                <Lock size={16} color="#facc15" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                <Text style={styles.settingDesc}>
                  Add an extra layer of security to your account
                </Text>
              </View>
            </View>
            <Switch
              value={settings.twoFactorEnabled}
              onValueChange={() => toggle("twoFactorEnabled")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.twoFactorEnabled ? "#115e59" : "#64748b"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#10b98120" }]}>
                <Shield size={16} color="#10b981" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={styles.settingLabel}>Biometric Login</Text>
                <Text style={styles.settingDesc}>
                  Use fingerprint or face recognition to sign in
                </Text>
              </View>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={() => toggle("biometricEnabled")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.biometricEnabled ? "#115e59" : "#64748b"}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#6366f120" }]}>
                <Lock size={16} color="#6366f1" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingDesc}>
                  Update your account password
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
          <Trash2 size={18} color="#ef4444" />
          <Text style={styles.dangerText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Change Password</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    autoFocus
                    style={styles.modalInput}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setPasswordModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalSaveBtn}
                      onPress={submitNewPassword}
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#16191e",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ffffff04",
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#94a3b8", lineHeight: 18 },
  sectionCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffffff04",
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 12,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  settingTexts: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  settingDesc: { fontSize: 12, fontWeight: "500", color: "#64748b" },
  disabledLabel: { fontSize: 14, fontWeight: "600", color: "#475569" },
  divider: { height: 1, backgroundColor: "#ffffff08", marginLeft: 44 },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#16191e",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ef444420",
  },
  dangerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ef4444",
  },
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
