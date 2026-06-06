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
  Modal,
  Image,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabaseClient";
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
  Check,
} from "lucide-react-native";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
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
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("full_name, phone, email, id, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || "",
          phone: data.phone || user.phone || "",
          email: data.email || user.email || "",
          rider_id: user.id?.slice(0, 8).toUpperCase() || "",
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
      const { error } = await supabase
        .from("users")
        .update({ full_name: editName.trim(), phone: editPhone.trim() })
        .eq("id", user.id);

      if (error) throw error;

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
    if (!user?.id) return;
    setUploadingAvatar(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, { contentType: "image/*", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#115e59" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0d0f" />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Profile & Settings</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profileData.avatar_url ? (
              <Image source={{ uri: profileData.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <User size={32} color="#ffffff" />
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handleChangeAvatar} disabled={uploadingAvatar}>
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
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#64748b"
              />
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditing(false);
                    setEditName(profileData.full_name);
                    setEditPhone(profileData.phone);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
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
              <Text style={styles.profileName}>{profileData.full_name || "Rider"}</Text>
              <Text style={styles.profileRole}>Rider</Text>
              <TouchableOpacity
                style={styles.editBadge}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editBadgeText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Info Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User size={16} color="#115e59" />
            <Text style={styles.sectionTitle}>Account Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Mail size={16} color="#94a3b8" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profileData.email || "Not set"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Phone size={16} color="#94a3b8" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {profileData.phone || "Not set"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Bike size={16} color="#94a3b8" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Rider ID</Text>
              <Text style={styles.infoValue}>{profileData.rider_id}</Text>
            </View>
          </View>
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate("NotificationsSettings")}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#115e5920" }]}>
                <Bell size={18} color="#115e59" />
              </View>
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate("PrivacySecurity")}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#115e5920" }]}>
                <Shield size={18} color="#115e59" />
              </View>
              <Text style={styles.settingLabel}>Privacy & Security</Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate("Preferences")}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#115e5920" }]}>
                <Settings size={18} color="#115e59" />
              </View>
              <Text style={styles.settingLabel}>Preferences</Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.sectionHeader}>
          <HelpCircle size={16} color="#115e59" />
          <Text style={styles.sectionTitle}>Support</Text>
        </View>

        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate("HelpSupport")}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#115e5920" }]}>
                <HelpCircle size={18} color="#115e59" />
              </View>
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate("TermsPrivacyPolicy")}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: "#115e5920" }]}>
                <FileText size={18} color="#115e59" />
              </View>
              <Text style={styles.settingLabel}>Terms & Privacy Policy</Text>
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Beba Rider v1.0.0</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d0f" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 14,
    backgroundColor: "#0b0d0f",
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
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  headerRightSpacer: { width: 40 },
  scrollContent: { flex: 1, paddingHorizontal: 18 },
  profileCard: {
    backgroundColor: "#16191e",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ffffff04",
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
    backgroundColor: "#115e59",
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
    backgroundColor: "#115e59",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0b0d0f",
  },
  profileInfo: {
    alignItems: "center",
    gap: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  profileRole: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 8,
  },
  editBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#115e5920",
    borderWidth: 1,
    borderColor: "#115e5940",
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#115e59",
  },
  editForm: {
    width: "100%",
    gap: 12,
  },
  input: {
    backgroundColor: "#0b0d0f",
    borderRadius: 12,
    padding: 14,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#ffffff10",
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
    backgroundColor: "#16191e",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  cancelButtonText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#115e59",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffffff04",
    gap: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
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
    backgroundColor: "#0b0d0f",
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
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff08",
    marginLeft: 44,
  },
  settingsList: {
    backgroundColor: "#16191e",
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ffffff04",
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff08",
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
    color: "#ffffff",
  },
  signOutButton: {
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
    color: "#475569",
  },
});
