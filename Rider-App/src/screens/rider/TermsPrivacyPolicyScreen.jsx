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
import { ArrowLeft, FileText, ExternalLink } from "lucide-react-native";

export default function TermsPrivacyPolicyScreen({ navigation }) {
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
        <Text style={styles.headerTitleText}>Terms & Privacy Policy</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <FileText size={20} color="#2dd4bf" />
          <Text style={styles.introText}>
            Please review our terms of service and privacy policy. By using Beba Express, you agree to these terms.
          </Text>
        </View>

        {/* Terms of Service */}
        <View style={styles.sectionCard}>
          <Text style={styles.docTitle}>Terms of Service</Text>
          <Text style={styles.docMeta}>Last updated: June 2026</Text>
          
          <View style={styles.docBody}>
            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>1. Eligibility</Text>
              <Text style={styles.docParagraph}>
                You must be at least 18 years old and possess a valid license and any required permits to operate as a delivery rider on the Beba Express platform.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>2. Conduct</Text>
              <Text style={styles.docParagraph}>
                Riders are expected to follow all traffic laws, handle customer packages with care, and maintain professional communication at all times.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>3. Payments</Text>
              <Text style={styles.docParagraph}>
                Earnings are calculated per completed delivery. Payouts are processed weekly to your registered mobile money or bank account. Beba Express reserves the right to withhold payments in cases of fraud or policy violations.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>4. Cancellations</Text>
              <Text style={styles.docParagraph}>
                Excessive or unjustified order cancellations may result in account suspension. A minimum cancellation rate must be maintained as specified in your rider agreement.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>5. Account Termination</Text>
              <Text style={styles.docParagraph}>
                Either party may terminate the agreement at any time. Upon termination, all outstanding payments will be settled within the standard payout cycle.
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Policy */}
        <View style={styles.sectionCard}>
          <Text style={styles.docTitle}>Privacy Policy</Text>
          <Text style={styles.docMeta}>Last updated: June 2026</Text>
          
          <View style={styles.docBody}>
            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>1. Data Collected</Text>
              <Text style={styles.docParagraph}>
                We collect your name, phone number, location data during active deliveries, earnings history, and device information necessary to operate the platform.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>2. Location Data</Text>
              <Text style={styles.docParagraph}>
                Your real-time location is only shared with dispatch while you are online and accepting jobs. Location tracking stops when you go offline.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>3. Data Usage</Text>
              <Text style={styles.docParagraph}>
                Your data is used to match you with delivery jobs, process payments, improve platform safety, and communicate important updates. We do not sell your personal data to third parties.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>4. Data Security</Text>
              <Text style={styles.docParagraph}>
                We use industry-standard encryption and access controls to protect your data. You can request data deletion by contacting support.
              </Text>
            </View>

            <View style={styles.paragraphGroup}>
              <Text style={styles.paragraphHeader}>5. Your Rights</Text>
              <Text style={styles.docParagraph}>
                You may request access to, correction of, or deletion of your personal data at any time by contacting our support team.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Link Row */}
        <TouchableOpacity 
          style={styles.contactSupportBtn} 
          activeOpacity={0.8} 
          onPress={() => openLink("mailto:support@beba.express")}
        >
          <Text style={styles.contactSupportText}>Contact Support for Full Policy Documents</Text>
          <ExternalLink size={16} color="#2dd4bf" />
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
  introCard: {
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
  introText: { flex: 1, fontSize: 13, fontWeight: "500", color: "#94a3b8", lineHeight: 18 },
  sectionCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffffff04",
    gap: 8,
  },
  docTitle: { fontSize: 18, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  docMeta: { fontSize: 11, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 },
  docBody: { gap: 16, marginTop: 8 },
  paragraphGroup: { gap: 4 },
  paragraphHeader: { fontSize: 13, fontWeight: "700", color: "#ffffff", lineHeight: 18 },
  docParagraph: { fontSize: 13, fontWeight: "500", color: "#94a3b8", lineHeight: 19 },
  contactSupportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16191e",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#115e5960",
  },
  contactSupportText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2dd4bf", // Fixed contrast layout variable for high-visibility dark themes
  },
});