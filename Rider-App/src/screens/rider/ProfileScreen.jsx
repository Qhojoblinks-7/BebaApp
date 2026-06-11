import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../store/themeStore";
import { getDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../services/firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import {
  ArrowLeft,
  User,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Camera,
  Phone,
  Mail,
  Bike,
} from "lucide-react-native";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { isDarkMode, colors } = useThemeStore();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: "",
    email: "",
    rider_id: "",
    avatar_url: "",
  });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [user?.uid]);

  const fetchProfile = async () => {
    if (!user?.uid) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfileData({
          full_name: data.full_name || "",
          phone: data.phone || user.phone || "",
          email: data.email || user.email || "",
          rider_id: user.uid?.slice(0, 8).toUpperCase() || "",
          avatar_url: data.avatar_url || "",
        });
        setEditName(data.full_name || "");
        setEditPhone(data.phone || user.phone || "");
      }
    } catch (err) {
      console.warn("[Profile] fetch failed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        full_name: editName.trim(),
        phone: editPhone.trim(),
      });

      setProfileData((prev) => ({
        ...prev,
        full_name: editName.trim(),
        phone: editPhone.trim(),
      }));
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const imageUri = result.assets[0].uri;
    await uploadAvatar(imageUri);
  };

  const uploadAvatar = async (uri) => {
    if (!user?.uid) return;
    setUploadingAvatar(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop();
      const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `avatars/${fileName}`);

      await uploadBytes(storageRef, blob, { contentType: "image/*" });
      const publicUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), {
        avatar_url: publicUrl,
      });

      setProfileData((prev) => ({ ...prev, avatar_url: publicUrl }));
      Alert.alert("Success", "Profile picture updated");
    } catch (err) {
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[
        styles.headerRow, 
        { paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 16) : StatusBar.currentHeight + 14 }
      ]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitleText, { color: colors.text }]}>Profile & Settings</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "ios" ? insets.bottom + 30 : 40 }}
      >
        {/* Profile Details Unit */}
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <View style={styles.avatarContainer}>
            {profileData.avatar_url ? (
              <Image source={{ uri: profileData.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <User size={32} color="#ffffff" />
              </View>
            )}
            <TouchableOpacity 
              style={[styles.cameraButton, { backgroundColor: colors.primary, borderColor: colors.backgroundCard }]} 
              onPress={handleChangeAvatar} 
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Camera size={14} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundInput || colors.background, color: colors.text, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundInput || colors.background, color: colors.text, borderColor: colors.border }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  onPress={() => {
                    setEditing(false);
                    setEditName(profileData.full_name);
                    setEditPhone(profileData.phone);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>{profileData.full_name || "Rider"}</Text>
              <Text style={[styles.profileRole, { color: colors.textSecondary }]}>Rider</Text>
              <TouchableOpacity
                style={[styles.editBadge, { backgroundColor: colors.primaryAlpha, borderColor: colors.primaryAlpha }]}
                onPress={() => setEditing(true)}
              >
                <Text style={[styles.editBadgeText, { color: colors.primary }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Info Segment */}
        <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <View style={styles.sectionHeader}>
            <User size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.backgroundInput || colors.background }]}>
              <Mail size={16} color={colors.textMuted} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profileData.email || "Not set"}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.backgroundInput || colors.background }]}>
              <Phone size={16} color={colors.textMuted} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Phone</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {profileData.phone || "Not set"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.infoRow}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.backgroundInput || colors.background }]}>
              <Bike size={16} color={colors.textMuted} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Rider ID</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{profileData.rider_id}</Text>
            </View>
          </View>
        </View>

        {/* Application Core Links */}
        <View style={[styles.settingsList, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: colors.borderLight }]} 
            onPress={() => navigation.navigate("NotificationsSettings")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryAlpha }]}>
                <Bell size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: colors.borderLight }]} 
            onPress={() => navigation.navigate("PrivacySecurity")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryAlpha }]}>
                <Shield size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy & Security</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: "transparent" }]} 
            onPress={() => navigation.navigate("Preferences")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryAlpha }]}>
                <Settings size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Preferences</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Utilities Section Title */}
        <View style={styles.sectionHeader}>
          <HelpCircle size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
        </View>

        {/* Support Context List */}
        <View style={[styles.settingsList, { backgroundColor: colors.backgroundCard, borderColor: colors.borderLight }]}>
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: colors.borderLight }]} 
            onPress={() => navigation.navigate("HelpSupport")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryAlpha }]}>
                <HelpCircle size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: "transparent" }]} 
            onPress={() => navigation.navigate("TermsPrivacyPolicy")}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryAlpha }]}>
                <FileText size={18} color={colors.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Terms & Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Auth Distant Destructive Action */}
        <TouchableOpacity 
          style={[styles.signOutButton, { backgroundColor: colors.backgroundCard, borderColor: "rgba(239,68,68,0.2)" }]} 
          onPress={handleSignOut}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.versionInfo}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Beba Rider v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontWeight: "600" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
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
    letterSpacing: -0.3,
  },
  headerRightSpacer: { width: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  profileInfo: {
    alignItems: "center",
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profileRole: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  editBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  editForm: {
    width: "100%",
    gap: 12,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginLeft: 44,
  },
  settingsList: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ef4444",
  },
  versionInfo: {
    alignItems: "center",
    marginTop: 24,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});