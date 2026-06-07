import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MessageSquare, Phone, Mail, FileQuestion, ChevronRight } from "lucide-react-native";
import { useThemeStore } from "../../store/themeStore";

export default function HelpSupportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useThemeStore();

  const faqs = [
    { q: "How do I become an online rider?", a: "Toggle your availability from the dashboard using the Online/Offline button." },
    { q: "When do I get paid?", a: "Earnings are settled weekly to your registered mobile money account." },
    { q: "How are deliveries assigned?", a: "Jobs are assigned based on proximity, vehicle type, and your rating score." },
    { q: "What if a delivery is cancelled?", a: "Cancellation fees may apply. Repeated cancellations can affect your rating." },
    { q: "How do I update my bank details?", a: "Go to Profile > Edit Profile to update your payout information." },
  ];

  const openLink = (url) => {
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link"));
  };

  // --- Dynamic Style Matrix mapped directly to global layout store token constants ---
  const ui = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 18,
      paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14,
      paddingBottom: 14,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    headerTitleText: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerRightSpacer: {
      width: 40,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: 18,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.backgroundCard || colors.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.borderLight || "rgba(255,255,255,0.04)",
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary || colors.textMuted,
      lineHeight: 18,
    },
    sectionCard: {
      backgroundColor: colors.backgroundCard || colors.backgroundSecondary,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.borderLight || "rgba(255,255,255,0.04)",
      gap: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.2,
      marginBottom: 12,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    contactIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    contactTexts: {
      flex: 1,
      gap: 2,
    },
    contactLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    contactValue: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary || colors.textMuted,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.borderLight || "rgba(255,255,255,0.08)",
      marginLeft: 36,
    },
    faqItem: {
      paddingVertical: 10,
      gap: 6,
    },
    faqHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    faqQuestion: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    faqAnswer: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textMuted,
      lineHeight: 16,
      paddingLeft: 22,
    },
  };

  return (
    <View style={ui.container}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor="transparent" 
        translucent 
      />
      
      <View style={ui.headerRow}>
        <TouchableOpacity
          style={ui.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={ui.headerTitleText}>Help & Support</Text>
        <View style={ui.headerRightSpacer} />
      </View>

      <ScrollView
        style={ui.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.infoCard}>
          <MessageSquare size={20} color={colors.primary} />
          <Text style={ui.infoText}>
            Need help? Browse our FAQs or get in touch with our support team.
          </Text>
        </View>

        <View style={ui.sectionCard}>
          <Text style={ui.sectionTitle}>Contact Us</Text>

          <TouchableOpacity style={ui.contactRow} activeOpacity={0.7} onPress={() => openLink("tel:+233500000000")}>
            <View style={[ui.contactIcon, { backgroundColor: colors.successAlpha || "#10b98120" }]}>
              <Phone size={18} color={colors.success || "#10b981"} />
            </View>
            <View style={ui.contactTexts}>
              <Text style={ui.contactLabel}>Call Support</Text>
              <Text style={ui.contactValue}>+233 50 000 0000</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted || "#64748b"} />
          </TouchableOpacity>

          <View style={ui.rowDivider} />

          <TouchableOpacity style={ui.contactRow} activeOpacity={0.7} onPress={() => openLink("mailto:support@beba.express")}>
            <View style={[ui.contactIcon, { backgroundColor: colors.primaryAlpha || "#115e5920" }]}>
              <Mail size={18} color={colors.primary} />
            </View>
            <View style={ui.contactTexts}>
              <Text style={ui.contactLabel}>Email Support</Text>
              <Text style={ui.contactValue}>support@beba.express</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted || "#64748b"} />
          </TouchableOpacity>
        </View>

        <View style={ui.sectionCard}>
          <Text style={ui.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <View style={ui.rowDivider} />}
              <View style={ui.faqItem}>
                <View style={ui.faqHeader}>
                  <FileQuestion size={14} color={colors.primary} />
                  <Text style={ui.faqQuestion}>{item.q}</Text>
                </View>
                <Text style={ui.faqAnswer}>{item.a}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Dynamic platform bottom safe zone spacer */}
        <View style={{ height: Platform.OS === "ios" ? insets.bottom + 20 : 40 }} />
      </ScrollView>
    </View>
  );
}