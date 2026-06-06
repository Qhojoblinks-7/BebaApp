import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { ArrowLeft, MessageSquare, Phone, Mail, FileQuestion, ChevronRight } from "lucide-react-native";

export default function HelpSupportScreen({ navigation }) {
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
        <Text style={styles.headerTitleText}>Help & Support</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <MessageSquare size={20} color="#115e59" />
          <Text style={styles.infoText}>
            Need help? Browse our FAQs or get in touch with our support team.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Us</Text>

          <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={() => openLink("tel:+233500000000")}>
            <View style={[styles.contactIcon, { backgroundColor: "#10b98120" }]}>
              <Phone size={18} color="#10b981" />
            </View>
            <View style={styles.contactTexts}>
              <Text style={styles.contactLabel}>Call Support</Text>
              <Text style={styles.contactValue}>+233 50 000 0000</Text>
            </View>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.contactRow} activeOpacity={0.7} onPress={() => openLink("mailto:support@beba.express")}>
            <View style={[styles.contactIcon, { backgroundColor: "#115e5920" }]}>
              <Mail size={18} color="#115e59" />
            </View>
            <View style={styles.contactTexts}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@beba.express</Text>
            </View>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <View style={styles.rowDivider} />}
              <View style={styles.faqItem}>
                <View style={styles.faqHeader}>
                  <FileQuestion size={14} color="#115e59" />
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                </View>
                <Text style={styles.faqAnswer}>{item.a}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

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
  contactTexts: { flex: 1, gap: 2 },
  contactLabel: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  contactValue: { fontSize: 12, fontWeight: "500", color: "#94a3b8" },
  rowDivider: { height: 1, backgroundColor: "#ffffff08", marginLeft: 36 },
  faqItem: {
    paddingVertical: 10,
    gap: 6,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  faqQuestion: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  faqAnswer: { fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 16, paddingLeft: 22 },
});
