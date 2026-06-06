import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Alert,
} from "react-native";
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Trash2, ChevronRight } from "lucide-react-native";

export default function PrivacySecurityScreen({ navigation }) {
  const [settings, setSettings] = useState({
    shareLocation: true,
    profileVisible: false,
    twoFactorEnabled: false,
    biometricEnabled: true,
  });

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangePassword = () => {
    Alert.alert("Change Password", "Password change flow would open here.");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is irreversible. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert("Account deletion", "This would contact support."),
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
});
