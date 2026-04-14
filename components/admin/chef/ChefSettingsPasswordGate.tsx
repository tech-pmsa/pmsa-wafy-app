import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import { LockKeyhole, ShieldAlert } from "lucide-react-native";

let isChefSettingsUnlocked = false;

export function resetChefSettingsAccess() {
  isChefSettingsUnlocked = false;
}

interface Props {
  children: React.ReactNode;
}

export default function ChefSettingsPasswordGate({ children }: Props) {
  const [verified, setVerified] = useState(isChefSettingsUnlocked);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!password.trim()) {
      Alert.alert("Required", "Please enter the password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("page_access_passwords")
        .select("password_text")
        .eq("page_key", "chef-settings")
        .eq("is_active", true)
        .single();

      if (error) throw error;

      if (!data || data.password_text !== password.trim()) {
        Alert.alert("Denied", "Wrong password.");
        return;
      }

      isChefSettingsUnlocked = true;
      setVerified(true);
      setPassword("");
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Could not verify password.");
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <LockKeyhole size={28} color={theme.colors.primary} />
        </View>

        <Text style={styles.title}>Protected Settings</Text>
        <Text style={styles.subtitle}>
          Enter the password to open chef settings.
        </Text>

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={theme.colors.textMuted}
            onSubmitEditing={handleVerify}
          />
        </View>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.84}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.textOnDark} />
          ) : (
            <>
              <ShieldAlert size={18} color={theme.colors.textOnDark} />
              <Text style={styles.btnText}>Verify Password</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    ...theme.shadows.medium,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  inputWrap: {
    width: "100%",
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontFamily: "MullerMedium",
    fontSize: 15,
    color: theme.colors.text,
  },
  btnPrimary: {
    width: "100%",
    minHeight: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: theme.colors.textOnDark,
    fontFamily: "MullerBold",
    fontSize: 15,
    lineHeight: 19,
  },
});