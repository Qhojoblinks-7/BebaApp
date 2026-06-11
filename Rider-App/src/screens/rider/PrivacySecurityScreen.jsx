import React, { useState, useEffect, useCallback } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Trash2, ChevronRight, Moon, Sun } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db } from "../../services/firebaseConfig";
import { auth } from "../../services/firebaseConfig";

const STORAGE_KEY = "security_settings";

const defaultSettings = {
  shareLocation: true,
  profileVisible: false,
  twoFactorEnabled: false,
  biometricEnabled: true,
};

export default function PrivacySecurityScreen({ navigation }) {
  const { user } = useAuth();
  const { isDarkMode, setTheme, colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  const [settings, setSettings] = useState(defaultSettings);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    AsyncStorage.setItem("app_theme", isDarkMode ? "dark" : "light").catch(() => {});
  }, [isDarkMode]);

  const loadSettings = useCallback(async () => {
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
      console.warn("[PrivacySecurity] Failed to unpack local metadata payload:", err.message);
    }

    if (!user?.uid) return;

    try {
      const snap = await getDoc(doc(db, "privacy_security_settings", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          shareLocation: data.share_location ?? defaultSettings.shareLocation,
          profileVisible: data.profile_visible ?? defaultSettings.profileVisible,
          twoFactorEnabled: data.two_factor_enabled ?? defaultSettings.twoFactorEnabled,
          biometricEnabled: data.biometric_enabled ?? defaultSettings.biometricEnabled,
        });
      }
    } catch (err) {
      console.warn("[PrivacySecurity] Remote database synchronization exception:", err.message);
    }
  }, [user?.uid, setTheme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (newSettings) => {
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, "privacy_security_settings", user.uid), {
        rider_id: user.uid,
        share_location: newSettings.shareLocation,
        profile_visible: newSettings.profileVisible,
        two_factor_enabled: newSettings.twoFactorEnabled,
        biometric_enabled: newSettings.biometricEnabled,
        updated_at: serverTimestamp(),
      }, { merge: true });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.warn("[PrivacySecurity] Remote commit failed:", err.message);
      Alert.alert("Sync Notice", "Preferences stored locally, cloud profiles are temporarily offline.");
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    }
  };

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
      Alert.alert("Invalid Format", "Security credentials must consist of 6 or more characters.");
      return;
    }
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        Alert.alert("Error", "No authenticated user found.");
        return;
      }
      await updatePassword(firebaseUser, newPassword);
      Alert.alert("Success", "Account password updated successfully.");
    } catch (err) {
      Alert.alert("Security Update Failed", err.message);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <View style={[
        styles.headerRow, 
        { paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14 }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Privacy & Security</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 30 : 40 }}
      >
        {/* Top Feature Notice Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <Shield size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Manage how your data is used and keep your account secure. Enable extra protections to prevent unauthorized access.
          </Text>
        </View>

        {/* Privacy Segment */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryAlpha }]}>
                <Eye size={16} color={colors.primary} />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: settings.shareLocation ? colors.text : colors.textMuted }]}>
                  Share Live Location
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Allow dispatch to see your real-time position
                </Text>
              </View>
            </View>
            <Switch
              value={settings.shareLocation}
              onValueChange={() => toggle("shareLocation")}
              trackColor={{ false: colors.borderDark, true: colors.primaryAlpha }}
              thumbColor={settings.shareLocation ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryAlpha }]}>
                {settings.profileVisible ? (
                  <Eye size={16} color={colors.primary} />
                ) : (
                  <EyeOff size={16} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: settings.profileVisible ? colors.text : colors.textMuted }]}>
                  Public Profile
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Let customers and dispatch view your profile
                </Text>
              </View>
            </View>
            <Switch
              value={settings.profileVisible}
              onValueChange={() => toggle("profileVisible")}
              trackColor={{ false: colors.borderDark, true: colors.primaryAlpha }}
              thumbColor={settings.profileVisible ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Appearance Segment */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryAlpha }]}>
                {isDarkMode ? <Moon size={16} color={colors.primary} /> : <Sun size={16} color={colors.primary} />}
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  {isDarkMode ? "Dark theme is enabled" : "Light theme is enabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={() => setTheme(!isDarkMode)}
              trackColor={{ false: colors.borderDark, true: colors.primaryAlpha }}
              thumbColor={isDarkMode ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Security Segment */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryAlpha }]}>
                <Lock size={16} color={colors.primary} />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: settings.twoFactorEnabled ? colors.text : colors.textMuted }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Add an extra layer of security to your account
                </Text>
              </View>
            </View>
            <Switch
              value={settings.twoFactorEnabled}
              onValueChange={() => toggle("twoFactorEnabled")}
              trackColor={{ false: colors.borderDark, true: colors.primaryAlpha }}
              thumbColor={settings.twoFactorEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryAlpha }]}>
                <Shield size={16} color={colors.primary} />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: settings.biometricEnabled ? colors.text : colors.textMuted }]}>
                  Biometric Login
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Use fingerprint or face recognition to sign in
                </Text>
              </View>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={() => toggle("biometricEnabled")}
              trackColor={{ false: colors.borderDark, true: colors.primaryAlpha }}
              thumbColor={settings.biometricEnabled ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.settingRow} onPress={handleChangePassword} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryAlpha }]}>
                <Lock size={16} color={colors.primary} />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Update your account password
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Delete Account Button */}
        <TouchableOpacity 
          style={[styles.dangerButton, { backgroundColor: colors.backgroundCard, borderColor: "rgba(239,68,68,0.2)" }]} 
          onPress={handleDeleteAccount} 
          activeOpacity={0.7}
        >
          <Trash2 size={18} color="#ef4444" />
          <Text style={styles.dangerText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Management Overlay */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%", alignItems: "center" }}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
                  
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    autoFocus
                    style={[styles.modalInput, { backgroundColor: colors.backgroundInput || colors.background, color: colors.text, borderColor: colors.border }]}
                  />
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalCancelBtn, { backgroundColor: colors.backgroundInput || colors.background, borderColor: colors.border }]}
                      onPress={() => setPasswordModalVisible(false)}
                    >
                      <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
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
  settingLabel: { fontSize: 14, fontWeight: "600" },
  settingDesc: { fontSize: 12, fontWeight: "500" },
  divider: { height: 1, marginLeft: 44 },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
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
  },
});