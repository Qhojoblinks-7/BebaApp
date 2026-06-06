import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  DateTimePickerAndroid,
  Alert,
} from "react-native";
import { ArrowLeft, Wallet } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { insertManualEntry } from "../../services/manualEntries";

export default function QuickAddEntryScreen({ route, navigation }) {
  const { user } = useAuth();
  const onAdded = route?.params?.onAdded;

  const [type, setType] = useState("outflow");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const pickDate = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      is24Hour: true,
      onChange: (_, selected) => {
        if (selected) setDate(selected);
      },
    });
  };

  const handleSave = async () => {
    const parsedAmount = Number.parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    try {
      setSaving(true);
      await insertManualEntry({
        userId: user.id,
        type,
        amount: parsedAmount,
        note,
        occurredAt: date.toISOString(),
      });
      Alert.alert("Saved", "Cash flow entry saved.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
      onAdded?.();
    } catch (e) {
      Alert.alert("Save failed", e.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Add Cash Flow</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.typeRow}>
          {[
            { key: "inflow", label: "Inflow", color: "#10b981" },
            { key: "outflow", label: "Outflow", color: "#ef4444" },
          ].map((item) => {
            const isActive = type === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.typeChip, isActive && { backgroundColor: item.color + "18", borderColor: item.color }]}
                activeOpacity={0.8}
                onPress={() => setType(item.key)}
              >
                <Text style={[styles.typeChipText, isActive && { color: item.color }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.labelText}>Amount (GH₵)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.labelText}>Note</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Fuel, food, investment, etc."
            placeholderTextColor="#475569"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.labelText}>Date</Text>
          <TouchableOpacity style={styles.input} activeOpacity={0.8} onPress={pickDate}>
            <Text style={styles.dateText}>{date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={saving}
        >
          <Wallet size={18} color="#ffffff" />
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Entry"}</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#16191e",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff05",
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  typeRow: { flexDirection: "row", gap: 10, marginTop: 18, marginBottom: 18 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ffffff0a",
    backgroundColor: "#16191e",
    alignItems: "center",
  },
  typeChipText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  fieldGroup: { marginBottom: 18 },
  labelText: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  input: {
    backgroundColor: "#16191e",
    borderRadius: 16,
    padding: 14,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#ffffff0a",
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  dateText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#115e59",
    marginTop: 6,
  },
  saveButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
});
