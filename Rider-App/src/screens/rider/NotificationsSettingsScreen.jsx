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
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { ArrowLeft, Bell, BellOff } from "lucide-react-native";

const SETTINGS_KEY = "notification_settings";

const defaultSettings = {
  pushEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  newJobs: true,
  jobUpdates: true,
  earningsAlerts: true,
  promotions: false,
  weeklyReport: true,
  deliveryComplete: true,
};

export default function NotificationsSettingsScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDarkMode } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user?.uid]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (err) {
      console.warn("Failed to load local notification settings:", err.message);
    }

    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const snap = await getDoc(doc(db, "notification_settings", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          pushEnabled: data.push_enabled ?? defaultSettings.pushEnabled,
          soundEnabled: data.sound_enabled ?? defaultSettings.soundEnabled,
          vibrationEnabled: data.vibration_enabled ?? defaultSettings.vibrationEnabled,
          newJobs: data.new_jobs ?? defaultSettings.newJobs,
          jobUpdates: data.job_updates ?? defaultSettings.jobUpdates,
          earningsAlerts: data.earnings_alerts ?? defaultSettings.earningsAlerts,
          promotions: data.promotions ?? defaultSettings.promotions,
          weeklyReport: data.weekly_report ?? defaultSettings.weeklyReport,
          deliveryComplete: data.delivery_complete ?? defaultSettings.deliveryComplete,
        });
      }
    } catch (err) {
      console.warn("Failed to load notification settings from server:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const payload = {
        rider_id: user.uid,
        push_enabled: newSettings.pushEnabled,
        sound_enabled: newSettings.soundEnabled,
        vibration_enabled: newSettings.vibrationEnabled,
        new_jobs: newSettings.newJobs,
        job_updates: newSettings.jobUpdates,
        earnings_alerts: newSettings.earningsAlerts,
        promotions: newSettings.promotions,
        weekly_report: newSettings.weeklyReport,
        delivery_complete: newSettings.deliveryComplete,
        updated_at: serverTimestamp(),
      };

      await setDoc(doc(db, "notification_settings", user.uid), payload, { merge: true });
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (err) {
      console.warn("Failed to save notification settings:", err.message);
      Alert.alert("Error", "Failed to save notification settings");
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (key) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: !prev[key] };
      saveSettings(newSettings);
      return newSettings;
    });
  };

  if (loading) {
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
          <Text style={styles.headerTitleText}>Notifications</Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#115e59" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitleText}>Notifications</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Bell size={20} color="#115e59" />
          <Text style={styles.infoText}>
            Choose what notifications you receive. Push notifications are sent to your device.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>General</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#115e5920" }]}>
                {settings.pushEnabled ? (
                  <Bell size={16} color="#115e59" />
                ) : (
                  <BellOff size={16} color="#64748b" />
                )}
              </View>
              <View style={styles.settingTexts}>
                <Text style={settings.pushEnabled ? styles.settingLabel : styles.disabledLabel}>
                  Push Notifications
                </Text>
                <Text style={styles.settingDesc}>
                  Receive notifications on your device
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={() => toggle("pushEnabled")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.pushEnabled ? "#115e59" : "#64748b"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#facc1520" }]}>
                <Bell size={16} color="#facc15" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={settings.soundEnabled ? styles.settingLabel : styles.disabledLabel}>
                  Sound
                </Text>
                <Text style={styles.settingDesc}>
                  Play sound for incoming notifications
                </Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => toggle("soundEnabled")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.soundEnabled ? "#115e59" : "#64748b"}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "#a855f720" }]}>
                <Bell size={16} color="#a855f7" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={settings.vibrationEnabled ? styles.settingLabel : styles.disabledLabel}>
                  Vibration
                </Text>
                <Text style={styles.settingDesc}>
                  Vibrate for incoming notifications
                </Text>
              </View>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={() => toggle("vibrationEnabled")}
              trackColor={{ false: "#334155", true: "#115e5980" }}
              thumbColor={settings.vibrationEnabled ? "#115e59" : "#64748b"}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Categories</Text>

          {[
            { key: "newJobs", label: "New Job Opportunities", desc: "New delivery requests in your area" },
            { key: "jobUpdates", label: "Job Updates", desc: "Status changes on assigned jobs" },
            { key: "earningsAlerts", label: "Earnings Alerts", desc: "Payment confirmations and summaries" },
            { key: "promotions", label: "Promotions & Offers", desc: "Special incentives and bonuses" },
            { key: "weeklyReport", label: "Weekly Summary", desc: "Your weekly performance breakdown" },
            { key: "deliveryComplete", label: "Delivery Complete", desc: "Confirmation when a delivery is done" },
          ].map((item, idx) => (
            <React.Fragment key={item.key}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: "#115e5920" }]}>
                    <Bell size={16} color="#115e59" />
                  </View>
                  <View style={styles.settingTexts}>
                    <Text style={settings[item.key] ? styles.settingLabel : styles.disabledLabel}>
                      {item.label}
                    </Text>
                    <Text style={styles.settingDesc}>{item.desc}</Text>
                  </View>
                </View>
                <Switch
                  value={settings[item.key]}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: "#334155", true: "#115e5980" }}
                  thumbColor={settings[item.key] ? "#115e59" : "#64748b"}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color="#115e59" />
            <Text style={styles.savingText}>Saving changes...</Text>
          </View>
        )}

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
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
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
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  savingText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
});