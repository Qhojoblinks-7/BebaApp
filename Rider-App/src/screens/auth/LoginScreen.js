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
  const [email, setEmail] = useState("");
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
    if (!password || (isRegister && (!fullName.trim() || !email.trim() || !phone.trim()))) {
      setErrorBanner("Please fill in all fields correctly.");
      return;
    }

    setAuthLock(true);
    setErrorBanner("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = formatPhoneNumber(phone);

    try {
      if (isRegister) {
        console.log("[Auth] Registering rider via email:", normalizedEmail);
        
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password,
        });

        if (signUpError) {
          if (signUpError.message?.includes("already registered") || signUpError.message?.includes("already exists")) {
            throw new Error("Email already registered. Try signing in.");
          }
          throw signUpError;
        }

        const registeredUser = authData?.user;

        if (!registeredUser) {
          throw new Error("Server confirmation required. Please ensure Auto-Confirm is enabled in Supabase.");
        }

        console.log("[Auth] Account created. Establishing session...");

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (signInError) {
          console.error("[Auth] Session bootstrap failure:", signInError);
          throw new Error("Account created but login failed. Please sign in manually.");
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.error("[Auth] Session not established after sign-in");
          throw new Error("Session setup failed. Please try again.");
        }

        console.log("[Auth] Session established. Initializing profile records...");

        const { error: profileError } = await supabase.from("users").upsert({
          id: registeredUser.id,
          phone: normalizedPhone,
          full_name: fullName.trim(),
          email: normalizedEmail,
          user_type: "rider",
        });

        if (profileError) {
          console.error("[Auth] Profile upsert failure:", profileError);
          throw new Error("Profile provisioning failed. Please contact tech support.");
        }

        const { error: statusError } = await supabase.from("rider_status").upsert({
          id: registeredUser.id,
          rider_status: "offline",
        });

        if (statusError) {
          console.error("[Auth] Rider status upsert failure:", statusError);
        }

        console.log("[Auth] Rider onboarding registration complete.");

      } else {
        console.log("[Auth] Logging in rider via email:", normalizedEmail);

        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (loginError) {
          if (loginError.message?.includes("Invalid login credentials")) {
            throw new Error("Incorrect phone number or password.");
          }
          throw loginError;
        }

        const { data: { session: loginSession } } = await supabase.auth.getSession();
        if (!loginSession) {
          console.error("[Auth] Session not established after login");
          throw new Error("Session setup failed. Please try again.");
        }

        const authenticatedUser = loginData?.user;
        console.log("[Auth] Account validated. Verifying rider privileges...");

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