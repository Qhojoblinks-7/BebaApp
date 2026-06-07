import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { supabase } from "../../services/supabaseClient";
import { ArrowLeft, Bell, BellOff } from "lucide-react-native";

const STORAGE_KEY = "notification_settings";

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

  // Use a mutable reference block to prevent parallel pipeline execution on rapid selection mutations
  const activeSettingsRef = useRef(settings);
  useEffect(() => {
    activeSettingsRef.current = settings;
  }, [settings]);

  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (err) {
      console.warn("[NotificationSettings] Failed to parse local store runtime tags:", err.message);
    }

    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("rider_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
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
      console.warn("[NotificationSettings] Database configuration fallback execution handled:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettingsToServer = async (targetSettings) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        rider_id: user.id,
        push_enabled: targetSettings.pushEnabled,
        sound_enabled: targetSettings.soundEnabled,
        vibration_enabled: targetSettings.vibrationEnabled,
        new_jobs: targetSettings.newJobs,
        job_updates: targetSettings.jobUpdates,
        earnings_alerts: targetSettings.earningsAlerts,
        promotions: targetSettings.promotions,
        weekly_report: targetSettings.weeklyReport,
        delivery_complete: targetSettings.deliveryComplete,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("notification_settings")
        .upsert(payload, { onConflict: "rider_id" });

      if (error) throw error;

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(targetSettings));
    } catch (err) {
      console.warn("[NotificationSettings] Core infrastructure synch failure:", err.message);
      Alert.alert("Connection Error", "Changes saved locally but failed to sync to remote profile.");
      // Soft recover to historical persistent layer configuration states
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(targetSettings));
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    const updated = {
      ...activeSettingsRef.current,
      [key]: !activeSettingsRef.current[key],
    };
    setSettings(updated);
    saveSettingsToServer(updated);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        <View style={[styles.headerRow, { paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14, backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitleText, { color: colors.text }]}>Notifications</Text>
          <View style={styles.headerRightSpacer} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary || "#115e59"} />
          <Text style={[styles.loadingText, { color: colors.textMuted || "#64748b" }]}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <View style={[
        styles.headerRow, 
        { 
          paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
          backgroundColor: colors.background 
        }
      ]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 30 : 50 }}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard || colors.backgroundSecondary, borderColor: colors.borderLight || "rgba(255,255,255,0.04)" }]}>
          <Bell size={18} color={colors.primary || "#115e59"} />
          <Text style={[styles.infoText, { color: colors.textSecondary || "#94a3b8" }]}>
            Choose what notifications you receive. Push notifications are sent directly to your active service devices.
          </Text>
        </View>

        {/* Section: General Subsystems */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard || colors.backgroundSecondary, borderColor: colors.borderLight || "rgba(255,255,255,0.04)" }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>General</Text>

          {/* Toggle Block: Push Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: settings.pushEnabled ? (colors.primaryAlpha || "rgba(17,94,89,0.15)") : "rgba(100,116,139,0.15)" }]}>
                {settings.pushEnabled ? (
                  <Bell size={15} color={colors.primary || "#115e59"} />
                ) : (
                  <BellOff size={15} color={colors.textMuted || "#64748b"} />
                )}
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted || "#64748b" }]}>Receive alerts on this device</Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={() => toggleSetting("pushEnabled")}
              trackColor={{ false: colors.borderDark || "#334155", true: (colors.primaryAlpha || "#115e5980") }}
              thumbColor={settings.pushEnabled ? (colors.primary || "#115e59") : (colors.textMuted || "#64748b")}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight || "rgba(255,255,255,0.08)" }]} />

          {/* Toggle Block: Sound Subsystem */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "rgba(250,204,21,0.12)" }]}>
                <Bell size={15} color="#facc15" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Sound</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted || "#64748b" }]}>Play standard audio alerts</Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => toggleSetting("soundEnabled")}
              trackColor={{ false: colors.borderDark || "#334155", true: (colors.primaryAlpha || "#115e5980") }}
              thumbColor={settings.soundEnabled ? (colors.primary || "#115e59") : (colors.textMuted || "#64748b")}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight || "rgba(255,255,255,0.08)" }]} />

          {/* Toggle Block: Vibration */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBadge, { backgroundColor: "rgba(168,85,247,0.12)" }]}>
                <Bell size={15} color="#a855f7" />
              </View>
              <View style={styles.settingTexts}>
                <Text style={[styles.settingLabel, { color: colors.text }, !settings.vibrationEnabled && { color: colors.textMuted || "#475569" }]}>
                  Vibration
                </Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted || "#64748b" }]}>Haptic vibrations for requests</Text>
              </View>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={() => toggleSetting("vibrationEnabled")}
              trackColor={{ false: colors.borderDark || "#334155", true: (colors.primaryAlpha || "#115e5980") }}
              thumbColor={settings.vibrationEnabled ? (colors.primary || "#115e59") : (colors.textMuted || "#64748b")}
            />
          </View>
        </View>

        {/* Section: Operational Pipeline Categories */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard || colors.backgroundSecondary, borderColor: colors.borderLight || "rgba(255,255,255,0.04)" }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>

          {[
            { key: "newJobs", label: "New Job Opportunities", desc: "New delivery requests in your area" },
            { key: "jobUpdates", label: "Job Updates", desc: "Status changes on assigned jobs" },
            { key: "earningsAlerts", label: "Earnings Alerts", desc: "Payment confirmations and summaries" },
            { key: "promotions", label: "Promotions & Offers", desc: "Special incentives and bonus modules" },
            { key: "weeklyReport", label: "Weekly Summary", desc: "Your weekly performance analytics" },
            { key: "deliveryComplete", label: "Delivery Complete", desc: "Confirmation when a waybill cycle completes" },
          ].map((item, idx) => {
            const isRowEnabled = settings[item.key];
            return (
              <React.Fragment key={item.key}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.borderLight || "rgba(255,255,255,0.08)" }]} />}
                <View style={styles.settingRow}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconBadge, { backgroundColor: isRowEnabled ? (colors.primaryAlpha || "rgba(17,94,89,0.12)") : "rgba(100,116,139,0.12)" }]}>
                      <Bell size={15} color={isRowEnabled ? (colors.primary || "#115e59") : (colors.textMuted || "#64748b")} />
                    </View>
                    <View style={styles.settingTexts}>
                      <Text style={[styles.settingLabel, { color: colors.text }, !isRowEnabled && { color: colors.textMuted || "#475569" }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.settingDesc, { color: colors.textMuted || "#64748b" }]}>{item.desc}</Text>
                    </View>
                  </View>
                  <Switch
                    value={isRowEnabled}
                    onValueChange={() => toggleSetting(item.key)}
                    trackColor={{ false: colors.borderDark || "#334155", true: (colors.primaryAlpha || "#115e5980") }}
                    thumbColor={isRowEnabled ? (colors.primary || "#115e59") : (colors.textMuted || "#64748b")}
                  />
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={colors.primary || "#115e59"} />
            <Text style={[styles.savingText, { color: colors.textMuted || "#94a3b8" }]}>Saving changes...</Text>
          </View>
        )}
      </ScrollView>
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
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },
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
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  savingText: { fontSize: 13, fontWeight: "600" },
});