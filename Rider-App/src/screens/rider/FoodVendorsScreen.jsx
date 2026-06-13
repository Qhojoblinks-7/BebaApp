import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  MapPin,
  Phone,
  Plus,
  Store,
  Trash2,
  UtensilsCrossed,
} from "lucide-react-native";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import FoodVendorFormSheet from "../../components/rider/FoodVendorFormSheet";

const createEmptyVendor = () => ({
  name: "",
  phone: "",
  category: "",
  image: "",
  rating: "4.5",
  location: "",
  pickupAddress: "",
  pickupLat: "",
  pickupLng: "",
  description: "",
  popularDishes: "",
  distance: "",
  estimatedTime: "25-35 min",
  deliveryAvailable: true,
  deliveryFee: "",
  isOpen: true,
  openingHours: "",
  verificationBadge: true,
});

function normalizePhone(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  if (digits.startsWith("233")) return `+${digits}`;
  if (!digits.startsWith("+")) return `+${digits}`;
  return digits;
}

function parseDishes(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumber(value, fallback = null) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getInitials(name) {
  return String(name || "V")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "V";
}

function formatFee(value) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? "GH₵ 0" : `GH₵ ${parsed.toFixed(2)}`;
}

function formatDistance(value) {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? "Not set" : `${parsed.toFixed(1)} km`;
}

export default function FoodVendorsScreen({ navigation }) {
  const { user } = useAuth();
  const theme = useThemeStore();
  const colors = theme.colors || {};
  const isDarkMode = theme.isDarkMode;
  const insets = useSafeAreaInsets();
  const ui = useMemo(() => ({
    background: colors.background || "#f8fafc",
    backgroundSecondary: colors.backgroundSecondary || "#f1f5f9",
    backgroundCard: colors.backgroundCard || "#ffffff",
    sheet: colors.sheet || colors.backgroundCard || "#ffffff",
    backgroundInput: colors.backgroundInput || "#ffffff",
    text: colors.text || "#0f172a",
    textSecondary: colors.textSecondary || "#475569",
    textMuted: colors.textMuted || "#64748b",
    textDisabled: colors.textDisabled || "#94a3b8",
    textOnPrimary: colors.textOnPrimary || "#ffffff",
    border: colors.border || "#e2e8f0",
    borderLight: colors.borderLight || "#f1f5f9",
    primary: colors.primary || "#115e59",
    primaryAlpha: colors.primaryAlpha || "#115e5980",
    secondary: colors.secondary || "#6366f1",
    success: colors.success || "#10b981",
    successLight: colors.successLight || "#10b98115",
    danger: colors.danger || "#ef4444",
    dangerLight: colors.dangerLight || "#ef444410",
    overlay: colors.overlay || "#020617aa",
  }), [colors]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(createEmptyVendor);
  const [editingId, setEditingId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  const loadVendors = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "vendors"));
      const rows = snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setVendors(rows);
    } catch (err) {
      console.warn("[FoodVendors] load failed:", err.message);
      Alert.alert("Load failed", "Could not load food vendors. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadVendors();
    }, [loadVendors])
  );

  const canSave = useMemo(() => {
    return form.name.trim().length > 0 && form.phone.trim().length > 0 && form.category.trim().length > 0 && form.location.trim().length > 0;
  }, [form]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(createEmptyVendor());
    setFormVisible(true);
  };

  const openEditForm = (vendor) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || "",
      phone: vendor.phone || "",
      category: vendor.category || "",
      image: vendor.image || "",
      rating: vendor.rating?.toString() || "4.5",
      location: vendor.location || "",
      pickupAddress: vendor.pickupAddress || vendor.location || "",
      pickupLat: vendor.pickupLat?.toString() || "",
      pickupLng: vendor.pickupLng?.toString() || "",
      description: vendor.description || "",
      popularDishes: Array.isArray(vendor.popularDishes) ? vendor.popularDishes.join(", ") : "",
      distance: vendor.distance?.toString() || "",
      estimatedTime: vendor.estimatedTime || "",
      deliveryAvailable: Boolean(vendor.deliveryAvailable),
      deliveryFee: vendor.deliveryFee?.toString() || "",
      isOpen: Boolean(vendor.isOpen),
      openingHours: vendor.openingHours || "",
      verificationBadge: Boolean(vendor.verificationBadge),
    });
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditingId(null);
    setForm(createEmptyVendor());
  };

  const saveVendor = async () => {
    if (!canSave) {
      Alert.alert("Missing details", "Add at least name, phone, category, and location.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      category: form.category.trim(),
      image: form.image.trim(),
      rating: toNumber(form.rating, 0),
      location: form.location.trim(),
      pickupAddress: form.pickupAddress.trim() || form.location.trim(),
      pickupLat: toNumber(form.pickupLat, null),
      pickupLng: toNumber(form.pickupLng, null),
      description: form.description.trim() || "Trusted local food vendor.",
      popularDishes: parseDishes(form.popularDishes),
      distance: toNumber(form.distance, null),
      estimatedTime: form.estimatedTime.trim() || "25-35 min",
      deliveryAvailable: Boolean(form.deliveryAvailable),
      deliveryFee: toNumber(form.deliveryFee, 0),
      isOpen: Boolean(form.isOpen),
      openingHours: form.openingHours.trim(),
      verificationBadge: Boolean(form.verificationBadge),
      updated_by: user.uid,
      updated_at: serverTimestamp(),
    };

    try {
      setSaving(true);
      if (editingId) {
        await updateDoc(doc(db, "vendors", editingId), payload);
        Alert.alert("Updated", "Food vendor updated successfully.");
      } else {
        const ref = doc(collection(db, "vendors"));
        await setDoc(ref, { ...payload, created_at: serverTimestamp(), created_by: user.uid });
        Alert.alert("Added", "Food vendor added to the customer food list.");
      }
      closeForm();
      await loadVendors();
    } catch (err) {
      console.warn("[FoodVendors] save failed:", err.message);
      Alert.alert("Save failed", err.message || "Could not save this vendor.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVendor = (vendor) => {
    Alert.alert("Delete vendor", `Remove ${vendor.name || "this vendor"} from the customer food list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "vendors", vendor.id));
            setVendors((prev) => prev.filter((item) => item.id !== vendor.id));
          } catch (err) {
            console.warn("[FoodVendors] delete failed:", err.message);
            Alert.alert("Delete failed", "Could not delete this vendor.");
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={[styles.hero, { paddingTop: Math.max(insets.top, 12), paddingBottom: 18 }]}>
      <View style={[styles.heroTop, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: ui.primary }]}>Admin Only</Text>
          <Text style={[styles.heroTitle, { color: ui.text }]}>Food Vendors</Text>
          <Text style={[styles.heroSubtitle, { color: ui.textMuted }]}>Manage what customers see in the food list.</Text>
        </View>
        <View style={[styles.heroIcon, { backgroundColor: ui.primaryAlpha }]}>
          <Store size={24} color={ui.primary} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]}>
          <Text style={[styles.statNumber, { color: ui.text }]}>{vendors.length}</Text>
          <Text style={[styles.statLabel, { color: ui.textMuted }]}>Vendors</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]}>
          <Text style={[styles.statNumber, { color: ui.text }]}>{vendors.filter((item) => item.isOpen).length}</Text>
          <Text style={[styles.statLabel, { color: ui.textMuted }]}>Open now</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]}>
          <Text style={[styles.statNumber, { color: ui.text }]}>{vendors.filter((item) => item.deliveryAvailable).length}</Text>
          <Text style={[styles.statLabel, { color: ui.textMuted }]}>Deliveries</Text>
        </View>
      </View>
    </View>
  );

  const renderVendor = ({ item }) => (
    <TouchableOpacity activeOpacity={0.72} onPress={() => openEditForm(item)} style={[styles.vendorCard, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]}>
      <View style={styles.vendorMedia}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.vendorImage} />
        ) : (
          <View style={[styles.vendorFallback, { backgroundColor: ui.primaryAlpha }]}>
            <UtensilsCrossed size={24} color={ui.primary} />
            <Text style={[styles.fallbackInitials, { color: ui.primary }]}>{getInitials(item.name)}</Text>
          </View>
        )}
        <View style={[styles.openBadge, { backgroundColor: item.isOpen ? ui.successLight : ui.backgroundSecondary }]}>
          <Text style={[styles.openBadgeText, { color: item.isOpen ? ui.success : ui.textMuted }]}>{item.isOpen ? "Open" : "Closed"}</Text>
        </View>
      </View>

      <View style={styles.vendorBody}>
        <View style={styles.vendorTitleRow}>
          <View style={styles.vendorTitleBlock}>
            <Text style={[styles.vendorName, { color: ui.text }]} numberOfLines={1}>{item.name || "Unnamed Vendor"}</Text>
            <Text style={[styles.vendorCategory, { color: ui.textMuted }]} numberOfLines={1}>{item.category || "Food"} · {item.location || "Accra"}</Text>
          </View>
          {item.verificationBadge ? <CheckCircle2 size={18} color={ui.secondary} /> : null}
        </View>

        <View style={styles.vendorMetaGrid}>
          <MetaPill icon={<Phone size={13} />} label={item.phone || "No phone"} ui={ui} />
          <MetaPill icon={<Clock size={13} />} label={item.estimatedTime || "25-35 min"} ui={ui} />
          <MetaPill icon={<DollarSign size={13} />} label={formatFee(item.deliveryFee)} ui={ui} />
          <MetaPill icon={<MapPin size={13} />} label={formatDistance(item.distance)} ui={ui} />
        </View>

        {item.popularDishes?.length ? (
          <Text style={[styles.dishesText, { color: ui.textMuted }]} numberOfLines={1}>{item.popularDishes.join(", ")}</Text>
        ) : null}

        <View style={styles.vendorActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: ui.primaryAlpha }]} onPress={() => openEditForm(item)}>
            <Edit2 size={15} color={ui.primary} />
            <Text style={[styles.actionButtonText, { color: ui.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: ui.dangerLight }]} onPress={() => deleteVendor(item)}>
            <Trash2 size={15} color={ui.danger} />
            <Text style={[styles.actionButtonTextDanger, { color: ui.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: ui.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]} onPress={() => navigation?.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={22} color={ui.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: ui.text }]}>Manage Food Vendors</Text>
          <Text style={[styles.headerSubtitle, { color: ui.textMuted }]}>Hidden from the customer app</Text>
        </View>
        <View style={styles.headerActionBlock} />
      </View>

      {renderHeader()}

      <View style={[styles.listShell, { paddingTop: 4 }]}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={ui.primary} />
            <Text style={[styles.loadingText, { color: ui.textMuted }]}>Loading vendors...</Text>
          </View>
        ) : (
          <FlatList
            data={vendors}
            keyExtractor={(item) => item.id}
            renderItem={renderVendor}
            contentContainerStyle={[styles.vendorList, { paddingBottom: insets.bottom + 96 }]}
            ListEmptyComponent={
              <View style={[styles.emptyCard, { backgroundColor: ui.backgroundCard, borderColor: ui.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: ui.primaryAlpha }]}>
                  <Store size={30} color={ui.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: ui.text }]}>No food vendors yet</Text>
                <Text style={[styles.emptyText, { color: ui.textMuted }]}>Add a vendor and it will appear in the customer food list.</Text>
              </View>
            }
          />
        )}
      </View>

      <Pressable style={[styles.fab, { backgroundColor: ui.primary, bottom: Math.max(insets.bottom + 16, 16) }]} onPress={openAddForm} activeOpacity={0.86}>
        <Plus size={24} color={ui.textOnPrimary} />
        <Text style={[styles.fabLabel, { color: ui.textOnPrimary }]}>Add Vendor</Text>
      </Pressable>

      <FoodVendorFormSheet
        visible={formVisible}
        saving={saving}
        editingId={editingId}
        form={form}
        insets={insets}
        onClose={closeForm}
        onSave={saveVendor}
        onFieldChange={updateField}
        canSave={canSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitleBlock: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, fontWeight: "600" },
  headerActionBlock: { width: 42 },
  hero: { paddingHorizontal: 18 },
  heroTop: {
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
  },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 0.9, textTransform: "uppercase" },
  heroTitle: { fontSize: 26, fontWeight: "950", letterSpacing: -0.7, marginTop: 2 },
  heroSubtitle: { fontSize: 13, fontWeight: "600", marginTop: 4, maxWidth: 220 },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statNumber: { fontSize: 20, fontWeight: "950", letterSpacing: -0.4 },
  statLabel: { fontSize: 11, fontWeight: "800", marginTop: 3 },
  listShell: { flex: 1, minHeight: 0 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, fontWeight: "700" },
  vendorList: { paddingHorizontal: 18, gap: 14 },
  vendorCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  vendorMedia: {
    height: 118,
    position: "relative",
    backgroundColor: "#f1f5f9",
  },
  vendorImage: {
    width: "100%",
    height: "100%",
  },
  vendorFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  fallbackInitials: {
    fontSize: 28,
    fontWeight: "950",
    letterSpacing: -0.8,
  },
  openBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  openBadgeText: { fontSize: 11, fontWeight: "900" },
  vendorBody: { padding: 16, gap: 12 },
  vendorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  vendorTitleBlock: { flex: 1, gap: 3 },
  vendorName: { fontSize: 17, fontWeight: "950", letterSpacing: -0.3 },
  vendorCategory: { fontSize: 12, fontWeight: "700" },
  vendorMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
  },
  metaText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    maxWidth: 110,
  },
  dishesText: {
    fontSize: 12,
    fontWeight: "700",
  },
  vendorActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    paddingVertical: 11,
  },
  actionButtonText: { fontSize: 13, fontWeight: "900" },
  actionButtonTextDanger: { fontSize: 13, fontWeight: "900", color: "#ef4444" },
  emptyCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "950" },
  emptyText: { fontSize: 13, fontWeight: "600", textAlign: "center", maxWidth: 260 },
  fab: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  fabLabel: { color: "#ffffff", fontSize: 13, fontWeight: "950" },
});
