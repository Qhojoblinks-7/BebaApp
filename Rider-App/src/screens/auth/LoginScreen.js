import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../services/firebaseConfig";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authLock, setAuthLock] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const formatPhoneNumber = (input) => {
    const clean = input.trim().replace(/\s+/g, "");
    if (!clean) return "";
    return clean.startsWith("+") ? clean : `+${clean}`;
  };

  const handleAuth = async () => {
    if (!password || (isRegister && (!fullName?.trim() || !email?.trim() || !phone?.trim()))) {
      setErrorBanner("Please fill in all fields correctly.");
      return;
    }

    setAuthLock(true);
    setErrorBanner("");

    const normalizedEmail = (email || "").trim().toLowerCase();
    const normalizedPhone = formatPhoneNumber(phone || "");

    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await updateProfile(cred.user, { displayName: fullName.trim() });
        await sendEmailVerification(cred.user);

        await setDoc(doc(db, "users", cred.user.uid), {
          phone: normalizedPhone,
          full_name: fullName.trim(),
          email: normalizedEmail,
          user_type: "rider",
          avatar_url: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });

        await setDoc(doc(db, "rider_status", cred.user.uid), {
          rider_status: "offline",
          updated_at: serverTimestamp(),
        });

        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const userData = snap.exists() ? snap.data() : {};
        if (userData.user_type !== "rider") {
          await signOut(auth);
          throw new Error("This account is not registered as a rider.");
        }
      }
    } catch (err) {
      console.log("[Auth Exception Handler]:", err.message);
      setErrorBanner(err.message || "An unexpected error occurred.");
      setAuthLock(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <Text style={styles.logoText}>BEBA FLEET</Text>
        <Text style={styles.subtext}>
          {isRegister ? "Register Rider" : "Rider Portal"}
        </Text>
      </View>

      {!!errorBanner && <Text style={styles.errorText}>{errorBanner}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        placeholderTextColor="#94a3b8"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isRegister ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number (e.g., +233592558160)"
            placeholderTextColor="#94a3b8"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.btn, authLock && styles.btnDisabled]}
        onPress={handleAuth}
        disabled={authLock}
      >
        {authLock ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <Text style={styles.btnText}>
            {isRegister ? "Register & Start Duty" : "Start Duty Shift"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => {
          setIsRegister(!isRegister);
          setErrorBanner("");
        }}
      >
        <Text style={styles.toggleText}>
          {isRegister ? "Already registered? Sign In" : "New rider? Register here"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    padding: 24,
  },
  brandContainer: { alignItems: "center", marginBottom: 40 },
  logoText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtext: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 4,
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#38bdf8",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#020617", fontSize: 14, fontWeight: "800" },
  errorText: {
    color: "#ef4444",
    backgroundColor: "#450a0a",
    padding: 12,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#991b1b",
  },
  toggleBtn: { marginTop: 24, alignItems: "center" },
  toggleText: { color: "#38bdf8", fontSize: 14, fontWeight: "600" },
});
