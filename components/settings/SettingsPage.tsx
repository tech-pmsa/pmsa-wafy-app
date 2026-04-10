import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppRole, useUserData } from "@/hooks/useUserData";
import { User, BookUser, UserPlus, Trash2, AlertTriangle } from "lucide-react-native";
import { theme } from "@/theme/theme";

import ProfileSection from "@/components/settings/ProfileSection";
import ClassCouncil from "@/components/settings/ClassCouncil";
import AddStudents from "@/components/settings/AddStudents";
import AddBulkStudents from "@/components/settings/AddBulkStudents";
import UnlockAttendance from "@/components/settings/UnlockAttendance";
import ClearAttendance from "@/components/settings/ClearAttendance";

type SettingsTab = {
  value: 'profile' | 'council' | 'student-management' | 'danger-zone';
  label: string;
  icon: any;
  roles: AppRole[];
};

const settingsTabs: SettingsTab[] = [
  {
    value: 'profile',
    label: 'My Profile',
    icon: User,
    roles: ['student', 'officer', 'class', 'class-leader', 'staff'],
  },
  {
    value: 'council',
    label: 'Class Council',
    icon: BookUser,
    roles: ['class'],
  },
  {
    value: 'student-management',
    label: 'Student Management',
    icon: UserPlus,
    roles: ['officer'],
  },
  {
    value: 'danger-zone',
    label: 'Danger Zone',
    icon: Trash2,
    roles: ['officer'],
  },
];

export default function SettingsPage() {
  const { role, loading } = useUserData();
  const [activeTab, setActiveTab] = useState("profile");

  const accessibleTabs = useMemo(
    () => settingsTabs.filter((tab) => role && tab.roles.includes(role)),
    [role]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading Settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!role) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <View style={styles.deniedIconWrap}>
          <AlertTriangle size={48} color={theme.colors.error} />
        </View>
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedText}>
          Could not determine user role. Please try logging in again.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
        <Text style={styles.pageSubtitle}>
          Manage your profile and system configuration.
        </Text>
      </View>

      <View style={styles.tabsOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {accessibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;

            return (
              <TouchableOpacity
                key={tab.value}
                activeOpacity={0.84}
                onPress={() => setActiveTab(tab.value)}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
              >
                <Icon
                  size={17}
                  color={isActive ? theme.colors.textOnDark : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    isActive && styles.tabChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "council" && <ClassCouncil />}

        {activeTab === "student-management" && (
          <View style={styles.stack}>
            <AddStudents />
            <AddBulkStudents />
          </View>
        )}

        {activeTab === "danger-zone" && (
          <View style={styles.dangerZoneCard}>
            <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            <Text style={styles.dangerZoneSubtitle}>
              Critical actions with permanent consequences.
            </Text>

            <View style={styles.stack}>
              <UnlockAttendance />
              <ClearAttendance />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
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
  stateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  deniedIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  deniedTitle: {
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "MullerBold",
  },
  deniedText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  pageSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },
  tabsOuter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabsRow: {
    gap: 8,
    paddingRight: 8,
  },
  tabChip: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.soft,
  },
  tabChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabChipText: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  tabChipTextActive: {
    color: theme.colors.textOnDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  stack: {
    gap: 14,
  },
  dangerZoneCard: {
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    borderRadius: 24,
    padding: 18,
    ...theme.shadows.soft,
  },
  dangerZoneTitle: {
    color: theme.colors.error,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  dangerZoneSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: theme.colors.error,
    opacity: 0.86,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
});