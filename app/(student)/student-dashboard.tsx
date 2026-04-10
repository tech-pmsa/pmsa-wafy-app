import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import { UserRound, Sparkles } from "lucide-react-native";

import StudentAttendanceCard from "@/components/student/StudentAttendanceCard";
import StudentFeeDashboard from "@/components/student/StudentFeeDashboard";
import AchievementsForm from "@/components/student/AchievementsForm";
import ApprovedAchievements from "@/components/student/ApprovedAchievements";

export default function StudentDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />
        
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <UserRound size={28} color={theme.colors.primary} />
            </View>

            <View style={styles.heroBadge}>
              <Sparkles size={14} color={theme.colors.accent} />
              <Text style={styles.heroBadgeText}>Student Space</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>My Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            Welcome back,{" "}
            <Text style={styles.heroSubtitleStrong}>
              {details?.name || "Student"}
            </Text>
            . Here's a modern overview of your attendance, fees, and
            achievements.
          </Text>
        </View>

        <View style={styles.sectionStack}>
          <StudentAttendanceCard />
          <StudentFeeDashboard />
          <AchievementsForm />
          <ApprovedAchievements />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 40,
  },
  loadingScreen: {
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
  loadingCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    marginBottom: 20,
    ...theme.shadows.medium,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  heroBadgeText: {
    color: theme.colors.warningText ?? theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "MullerMedium",
  },
  heroSubtitleStrong: {
    color: theme.colors.text,
    fontFamily: "MullerBold",
  },
  sectionStack: {
    gap: 16,
  },
});