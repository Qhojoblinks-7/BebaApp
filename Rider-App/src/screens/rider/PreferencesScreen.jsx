import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { ArrowLeft, Globe, Volume2, Palette, MapPin, Zap, Truck, ChevronRight } from "lucide-react-native";

export default function PreferencesScreen({ navigation }) {
  const preferences = [
    {
      group: "Appearance",
      items: [
        { id: "theme", icon: Palette, color: "#a855f7", label: "Theme", value: "Dark", desc: "App appearance" },
        { id: "language", icon: Globe, color: "#115e59", label: "Language", value: "English", desc: "Display language" },
      ],
    },
    {
      group: "Audio & Feedback",
      items: [
        { id: "volume", icon: Volume2, color: "#6366f1", label: "Volume", value: "80%", desc: "App sound level" },
      ],
    },
    {
      group: "Delivery",
      items: [
        { id: "defaultVehicle", icon: Truck, color: "#facc15", label: "Default Vehicle", value: "Motorcycle", desc: "Your primary delivery mode" },
        { id: "maxDistance", icon: MapPin, color: "#10b981", label: "Max Distance", value: "15 km", desc: "Willing travel distance" },
        { id: "acceptance", icon: Zap, color: "#ef4444", label: "Auto-Accept", value: "Off", desc: "Automatically accept jobs" },
      ],
    },
  ];

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

        {preferences.map((group) => (
          <View key={group.group} style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>{group.group}</Text>
            <View style={styles.sectionCard}>
              {group.items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={styles.rowDivider} />}
                  <TouchableOpacity style={styles.preferenceRow} activeOpacity={0.7}>
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
                      <Text style={styles.rowValue}>{item.value}</Text>
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
});


