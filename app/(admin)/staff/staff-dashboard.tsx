import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GraduationCap, Users2, BookOpenCheck } from "lucide-react-native";
import { format } from "date-fns";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";

import CollegeLiveAttendance from "@/components/admin/CollegeLiveAttendance";
import AllStaffRegister from "@/components/admin/AllStaffRegister";
import FeeManagementDashboard from "@/components/admin/FeeManagementDashboard";

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function StaffDashboardPage() {
  const { loading } = useUserData();
  const [activeTab, setActiveTab] = useState<"students" | "register">(
    "students"
  );
  const today = format(new Date(), "PPP");

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
              <GraduationCap size={28} color={theme.colors.primary} />
            </View>

            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Staff Dashboard</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Staff Workspace</Text>
          <Text style={styles.heroSubtitle}>
            View student attendance or review the staff register using a cleaner,
            role-focused workspace.
          </Text>
        </View>

        <View style={styles.segmentWrap}>
          <TabButton
            label="Live Attendance"
            active={activeTab === "students"}
            onPress={() => setActiveTab("students")}
          />
          <TabButton
            label="Staff Register"
            active={activeTab === "register"}
            onPress={() => setActiveTab("register")}
          />
        </View>

        {activeTab === "students" ? (
          <View style={styles.contentCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconWrap}>
                  <Users2 size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.sectionTextWrap}>
                  <Text style={styles.sectionTitle}>College Live Attendance</Text>
                  <Text style={styles.sectionSubtitle}>
                    Real-time overview for{" "}
                    <Text style={styles.sectionSubtitleStrong}>{today}</Text>
                  </Text>
                </View>
              </View>
            </View>

            <CollegeLiveAttendance />
          </View>
        ) : (
          <View style={styles.contentCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={styles.sectionIconWrapAlt}>
                  <BookOpenCheck size={20} color={theme.colors.secondary} />
                </View>
                <View style={styles.sectionTextWrap}>
                  <Text style={styles.sectionTitle}>Staff Register</Text>
                  <Text style={styles.sectionSubtitle}>
                    Review the latest register details in one place
                  </Text>
                </View>
              </View>
            </View>

            <AllStaffRegister />
          </View>
        )}
        <View style={styles.sectionStack}>
          <FeeManagementDashboard />
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
    marginBottom: 18,
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
  heroPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.secondarySoft,
  },
  heroPillText: {
    color: theme.colors.secondary,
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
  segmentWrap: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 18,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    ...theme.shadows.soft,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
  contentCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    ...theme.shadows.medium,
  },
  sectionStack: {
    gap: 16,
  },
  sectionHeader: {
    marginBottom: 18,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  sectionIconWrapAlt: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondarySoft,
    borderWidth: 1,
    borderColor: theme.colors.secondaryTint,
  },
  sectionTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  sectionSubtitleStrong: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
});