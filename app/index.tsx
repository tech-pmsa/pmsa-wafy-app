import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { GraduationCap } from "lucide-react-native";
import { theme } from "@/theme/theme";

export default function IndexScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.bgOrbPrimary} />
      <View style={styles.bgOrbAccent} />

      <View style={styles.centerWrap}>
        <View style={styles.brandCard}>
          <View style={styles.logoWrap}>
            <GraduationCap size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>PMSA Wafy College</Text>
          <Text style={styles.subtitle}>Academic Management System</Text>

          <View style={styles.loaderRow}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>

          <Text style={styles.statusText}>Authenticating securely...</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  bgOrbPrimary: {
    position: "absolute",
    top: 120,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryTint,
  },
  bgOrbAccent: {
    position: "absolute",
    bottom: 110,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: theme.colors.accentTint,
  },
  centerWrap: {
    width: "100%",
    maxWidth: 380,
  },
  brandCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    shadowColor: "#101828",
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logoWrap: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginBottom: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 32,
    textAlign: "center",
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  loaderRow: {
    marginTop: 22,
    marginBottom: 14,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
});