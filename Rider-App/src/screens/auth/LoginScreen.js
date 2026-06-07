import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../services/supabaseClient";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authLock, setAuthLock] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // Normalizes numbers to E.164 standard (e.g., +233592558160)
  const formatPhoneNumber = (input) => {
    const clean = input.trim().replace(/\s+/g, "");
    if (!clean) return "";
    return clean.startsWith("+") ? clean : `+${clean}`;
  };

  const handleAuth = async () => {
    const normalizedPhone = formatPhoneNumber(phone);

    if (!normalizedPhone || !password || (isRegister && !fullName.trim())) {
      setErrorBanner("Please fill in all fields correctly.");
      return;
    }

    setAuthLock(true);
    setErrorBanner("");

    const mockEmail = `${normalizedPhone}@beba.express`;

    try {
      if (isRegister) {
        console.log("[Auth] Registering rider profile via email surrogate:", mockEmail);
        
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: password,
        });

        if (signUpError) {
          if (signUpError.message?.includes("already registered")) {
            throw new Error("Phone number already registered. Try signing in.");
          }
          throw signUpError;
        }

        const registeredUser = authData?.user;

        if (registeredUser) {
          console.log("[Auth] Account created. Generating profile data fields...");

          // Public user profile record setup
          const { error: profileError } = await supabase.from("users").insert({
            id: registeredUser.id,
            phone: normalizedPhone,
            full_name: fullName.trim(),
            email: mockEmail,
            user_type: "rider",
            // REMOVED plaintext rider_password for security compliance
          });

          if (profileError) {
            console.error("[Auth] Public profile link failure:", profileError);
            throw new Error("Profile provisioning failed. Please contact tech support.");
          }

          // Initialize default rider configuration state
          await supabase.from("rider_status").insert({
            id: registeredUser.id,
             rider_status: 'offline',
          });

          console.log("[Auth] Rider onboarding registration complete.");
        } else {
          throw new Error("Server confirmation required. Please ensure Auto-Confirm is enabled in Supabase.");
        }

      } else {
        console.log("[Auth] Logging in rider via email surrogate:", mockEmail);

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: mockEmail,
          password: password,
        });

        if (loginError) {
          if (loginError.message?.includes("Invalid login credentials")) {
            throw new Error("Incorrect phone number or password.");
          }
          throw loginError;
        }

        const authenticatedUser = loginData?.user;
        console.log("[Auth] Account validated. Verifying rider privileges...");

        // Role verification
        const { data: userData, error: profileError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", authenticatedUser.id)
          .maybeSingle();

        if (profileError || !userData || userData.user_type !== "rider") {
          console.warn("[Auth] Access denied: User account is not verified as a rider.");
          await supabase.auth.signOut();
          throw new Error("This account is not registered as a rider.");
        }

        console.log("[Auth] Rider entry clearance granted.");
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

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#94a3b8"
          value={fullName}
          onChangeText={setFullName}
          autoCorrect={false}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., 233592558160)"
        placeholderTextColor="#94a3b8"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
      />

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
          {isRegister
            ? "Already registered? Sign In"
            : "New rider? Register here"}
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
  btnDisabled: {
    opacity: 0.6,
  },
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