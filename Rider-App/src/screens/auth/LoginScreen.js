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

  const handleAuth = async () => {
    if (!phone || !password) {
      console.log("[Auth] Validation failed: phone or password empty", {
        phone: !!phone,
        password: !!password,
      });
      return;
    }
    setAuthLock(true);
    setErrorBanner("");
    console.log("[Auth] handleAuth started", { isRegister, phone });

    // Normalize phone format
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[Auth] Normalized phone:", normalizedPhone);

    try {
      if (isRegister) {
        // Sign up new rider
        console.log(
          "[Auth] Attempting signUp with email:",
          `${normalizedPhone}@beba.express`,
        );
        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email: `${normalizedPhone}@beba.express`,
            password: password,
          });
        console.log("[Auth] signUp result:", {
          authData: JSON.stringify(authData),
          signUpError: JSON.stringify(signUpError),
        });

        if (signUpError) {
          console.log("[Auth] signUp error details:", signUpError);
          if (signUpError.message?.includes("already registered")) {
            setErrorBanner("Phone already registered. Try signing in.");
          } else {
            setErrorBanner(signUpError.message || "Registration failed.");
          }
          setAuthLock(false);
          return;
        }

        // If session exists, user is auto-confirmed; otherwise needs email confirmation
        if (authData.session) {
          console.log("[Auth] signUp session exists, inserting profile...");
          // Insert rider profile
          const { error: profileError } = await supabase.from("users").insert({
            id: authData.user?.id,
            phone: normalizedPhone,
            full_name: fullName || "Rider",
            email: `${normalizedPhone}@beba.express`,
            user_type: "rider",
            rider_password: password,
          });
          console.log("[Auth] Profile insert result:", {
            profileError: JSON.stringify(profileError),
            userId: authData.user?.id,
          });

          if (profileError) {
            console.log("[Auth] Profile insertion failed:", profileError);
            setErrorBanner("Profile creation failed. Contact support.");
            setAuthLock(false);
            return;
          }

          // Create rider_status record
          console.log("[Auth] Creating rider_status for:", authData.user?.id);
          await supabase.from("rider_status").insert({
            id: authData.user?.id,
            is_rider_online: false,
          });
        } else {
          console.log(
            "[Auth] No session after signUp, email confirmation required",
          );
          setErrorBanner(
            "Check email for confirmation. Auto-confirm in Supabase Dashboard → Auth → Settings.",
          );
          setAuthLock(false);
          return;
        }
      } else {
        // Login existing rider
        console.log(
          "[Auth] Attempting signInWithPassword for:",
          `${normalizedPhone}@beba.express`,
        );
        const { error } = await supabase.auth.signInWithPassword({
          email: `${normalizedPhone}@beba.express`,
          password: password,
        });

        if (error) {
          console.log("[Auth] signInWithPassword failed:", error);
          if (error.message?.includes("Invalid login credentials")) {
            setErrorBanner("Incorrect phone number or password.");
          } else {
            setErrorBanner(error.message || "Login failed. Please try again.");
          }
          setAuthLock(false);
          return;
        }

        console.log(
          "[Auth] signInWithPassword succeeded, checking rider role...",
        );

        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const { data: userData, error: profileError } = await supabase
          .from("users")
          .select("user_type")
          .eq("id", authSession.user.id)
          .single();

        console.log("[Auth] User profile check:", {
          userData: JSON.stringify(userData),
          profileError: JSON.stringify(profileError),
        });

        if (profileError || !userData || userData.user_type !== "rider") {
          console.log("[Auth] User is not a rider, signing out");
          await supabase.auth.signOut();
          setErrorBanner("This account is not registered as a rider.");
          setAuthLock(false);
          return;
        }

        console.log("[Auth] Login fully verified as rider!");
      }
    } catch (err) {
      console.log("[Auth] Caught exception in handleAuth:", err);
      setErrorBanner(err.message);
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
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Phone Number (e.g., 233592558160)"
        placeholderTextColor="#94a3b8"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#94a3b8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={handleAuth}
        disabled={authLock}
      >
        {authLock ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>
            {isRegister ? "Register & Start Duty" : "Start Duty Shift"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => setIsRegister(!isRegister)}
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
  },
  toggleBtn: { marginTop: 24, alignItems: "center" },
  toggleText: { color: "#38bdf8", fontSize: 14, fontWeight: "600" },
});
