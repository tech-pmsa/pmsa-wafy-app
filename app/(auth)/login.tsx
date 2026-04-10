import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { GraduationCap, LogIn, AlertCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { BlurView } from "expo-blur";
import { theme } from "@/theme/theme";

export default function LoginScreen() {
  const router = useRouter();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const didAutoDismissRef = useRef(false);
  const previousEmailRef = useRef("");
  const previousPasswordRef = useRef("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again later.");
      }
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  useEffect(() => {
    const prevEmail = previousEmailRef.current;
    const prevPassword = previousPasswordRef.current;

    const emailJustFilled = !prevEmail && !!email.trim();
    const passwordJustFilled = !prevPassword && !!password;

    const autofillLikelyHappened =
      focusedField !== null &&
      !!email.trim() &&
      !!password &&
      (emailJustFilled || passwordJustFilled) &&
      !didAutoDismissRef.current;

    if (autofillLikelyHappened) {
      const timeout = setTimeout(() => {
        Keyboard.dismiss();
        emailRef.current?.blur();
        passwordRef.current?.blur();
        didAutoDismissRef.current = true;
        setFocusedField(null);
      }, 180);

      previousEmailRef.current = email;
      previousPasswordRef.current = password;

      return () => clearTimeout(timeout);
    }

    previousEmailRef.current = email;
    previousPasswordRef.current = password;
  }, [email, password, focusedField]);

  return (
    <ImageBackground
      source={require("../../assets/images/pmsalogin.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.fullOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroBlock}>
              <BlurView intensity={28} tint="light" style={styles.heroBadge}>
                <GraduationCap size={34} color={theme.colors.textOnDark} />
              </BlurView>

              <Text style={styles.heroTitle}>PMSA Wafy College</Text>
              <Text style={styles.heroSubtitle}>
                Modern academic access for students, staff, officers, and class
                management.
              </Text>
            </View>

            <BlurView intensity={42} tint="dark" style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>
                  Sign in to continue to your academic dashboard
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="you@pmsa.com"
                    placeholderTextColor="rgba(255,255,255,0.58)"
                    value={email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="username"
                    importantForAutofill="yes"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onFocus={() => {
                      didAutoDismissRef.current = false;
                      setFocusedField("email");
                    }}
                    onChangeText={(text) => {
                      didAutoDismissRef.current = false;
                      setEmail(text);
                    }}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputShell}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.58)"
                    value={password}
                    secureTextEntry
                    editable={!loading}
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    importantForAutofill="yes"
                    returnKeyType="done"
                    onFocus={() => {
                      didAutoDismissRef.current = false;
                      setFocusedField("password");
                    }}
                    onChangeText={(text) => {
                      didAutoDismissRef.current = false;
                      setPassword(text);
                    }}
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      passwordRef.current?.blur();
                    }}
                  />
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <View style={styles.errorIconWrap}>
                    <AlertCircle size={18} color="#FECACA" />
                  </View>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.86}
                style={[styles.loginButton, loading && styles.loginButtonLoading]}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.textOnDark} />
                ) : (
                  <LogIn size={18} color={theme.colors.textOnDark} />
                )}

                <Text style={styles.loginButtonText}>
                  {loading ? "Signing In..." : "Sign In"}
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomHintWrap}>
                <Text style={styles.bottomHintText}>
                  Secure sign-in with your college account credentials
                </Text>
              </View>
            </BlurView>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: "rgba(8,15,30,0.50)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  heroBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroBadge: {
    width: 82,
    height: 82,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    marginBottom: 18,
  },
  heroTitle: {
    color: theme.colors.textOnDark,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    fontFamily: "MullerBold",
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.80)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    fontFamily: "MullerMedium",
    paddingHorizontal: 12,
    maxWidth: 340,
  },
  formCard: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  formHeader: {
    marginBottom: 22,
    alignItems: "center",
  },
  formTitle: {
    color: theme.colors.textOnDark,
    fontSize: 25,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  formSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.92)",
    marginBottom: 9,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerMedium",
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 14,
  },
  input: {
    minHeight: 56,
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "rgba(220,38,38,0.18)",
    borderWidth: 1,
    borderColor: "rgba(254,202,202,0.30)",
  },
  errorIconWrap: {
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    color: "#FEE2E2",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  loginButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#101828",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  loginButtonLoading: {
    opacity: 0.9,
  },
  loginButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
    letterSpacing: 0.2,
  },
  bottomHintWrap: {
    marginTop: 14,
    alignItems: "center",
  },
  bottomHintText: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
});