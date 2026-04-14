import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from "react-native";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  School,
  UserCheck,
  Settings,
  BookUser,
  Bell,
  Book,
  CookingPot,
  LogOut,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

const allNavItems = [
  {
    href: "/(admin)/officer/officer-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["officer"],
  },
  {
    href: "/(admin)/classroom/class-dashboard",
    label: "Dashboard",
    icon: School,
    roles: ["class"],
  },
  {
    href: "/(admin)/classleader/class-leader-dashboard",
    label: "Dashboard",
    icon: BookUser,
    roles: ["class-leader"],
  },
  {
    href: "/(admin)/staff/staff-dashboard",
    label: "Dashboard",
    icon: BookUser,
    roles: ["staff"],
  },
  {
    href: "/(admin)/students-detail",
    label: "Students",
    icon: Users,
    roles: ["staff"],
  },
  {
    href: "/(student)/student-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["student"],
  },
  {
    href: "/(admin)/manage-students",
    label: "Students",
    icon: Users,
    roles: ["officer", "class"],
  },
  {
    href: "/(admin)/manage-staff",
    label: "Staff",
    icon: UserCheck,
    roles: ["officer"],
  },
  {
    href: "/(admin)/officer/staffregister",
    label: "Staff Register",
    icon: Book,
    roles: ["officer"],
  },
  {
    href: "/(admin)/classroom/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["class"],
  },
  {
    href: "/(admin)/chef/chef-dashboard",
    label: "Dashboard",
    icon: CookingPot,
    roles: ["chef"],
  },
  {
    href: "/(admin)/main/main-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["main"],
  },
  {
    href: "/(admin)/chef/chef-settings",
    label: "Kitchen Settings",
    icon: Settings,
    roles: ["chef"],
  },
  {
    href: "/(admin)/kitchen",
    label: "Kitchen Attendance",
    icon: CookingPot,
    roles: ["officer", "class"],
  },
];

function stripGroupSegments(path: string) {
  return path.replace(/\/\([^)]+\)/g, "");
}

export default function CustomDrawerContent(
  props: DrawerContentComponentProps
) {
  const { role, details } = useUserData();
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = stripGroupSegments(pathname);

  const accessibleNavItems = useMemo(
    () => allNavItems.filter((item) => item.roles.includes(role || "")),
    [role]
  );

  const settingsRoute =
    role === "student" ? "/(student)/settings" : "/(admin)/settings";

  const normalizedSettingsRoute = stripGroupSegments(settingsRoute);

  const isSettingsActive =
    normalizedPathname === normalizedSettingsRoute ||
    normalizedPathname.startsWith(`${normalizedSettingsRoute}/`);

  const userInitial = details?.name?.charAt(0)?.toUpperCase() || "U";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login" as any);
  };

  return (
    <View style={styles.root}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.drawerShell}>
          <View style={styles.heroCard}>
            <View style={styles.brandIconWrap}>
              <GraduationCap size={24} color={theme.colors.textOnDark} />
            </View>

            <View style={styles.brandTextWrap}>
              <Text style={styles.brandTitle}>PMSA Wafy</Text>
              <Text style={styles.brandSubtitle}>Academic Portal</Text>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Navigation</Text>

            <View style={styles.navGroup}>
              {accessibleNavItems.map((item) => {
                const normalizedHref = stripGroupSegments(item.href);

                const isActive =
                  normalizedPathname === normalizedHref ||
                  normalizedPathname.startsWith(`${normalizedHref}/`);

                const Icon = item.icon;

                return (
                  <TouchableOpacity
                    key={item.href}
                    onPress={() => router.push(item.href as any)}
                    activeOpacity={0.82}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                  >
                    <View
                      style={[
                        styles.navIconWrap,
                        isActive && styles.navIconWrapActive,
                      ]}
                    >
                      <Icon
                        size={20}
                        color={
                          isActive
                            ? theme.colors.primary
                            : theme.colors.icon ?? theme.colors.textSecondary
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.navLabel,
                        isActive && styles.navLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.divider} />

              <TouchableOpacity
                onPress={() => router.push(settingsRoute as any)}
                activeOpacity={0.82}
                style={[
                  styles.navItem,
                  isSettingsActive && styles.navItemActive,
                ]}
              >
                <View
                  style={[
                    styles.navIconWrap,
                    isSettingsActive && styles.navIconWrapActive,
                  ]}
                >
                  <Settings
                    size={20}
                    color={
                      isSettingsActive
                        ? theme.colors.primary
                        : theme.colors.icon ?? theme.colors.textSecondary
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.navLabel,
                    isSettingsActive && styles.navLabelActive,
                  ]}
                >
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </DrawerContentScrollView>

      <View style={styles.footerWrap}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {details?.img_url ? (
              <Image source={{ uri: details.img_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarFallback}>{userInitial}</Text>
            )}
          </View>

          <View style={styles.profileTextWrap}>
            <Text numberOfLines={1} style={styles.profileName}>
              {details?.name || "Loading..."}
            </Text>
            <Text numberOfLines={1} style={styles.profileRole}>
              {details?.role || role || "User"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          style={styles.logoutButton}
        >
          <LogOut size={18} color={theme.colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: theme.spacing.lg,
  },
  drawerShell: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === "ios" ? 56 : 28,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    shadowColor: "#101828",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginBottom: theme.spacing.lg,
  },
  brandIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    shadowColor: "#101828",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  brandTextWrap: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  brandTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "MullerBold",
  },
  brandSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  sectionBlock: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  sectionLabel: {
    marginBottom: theme.spacing.sm,
    paddingHorizontal: 4,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "MullerMedium",
  },
  navGroup: {
    gap: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  navItemActive: {
    backgroundColor: theme.colors.primaryTint,
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  navIconWrapActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  navIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  navLabel: {
    marginLeft: theme.spacing.md,
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    fontFamily: "MullerMedium",
  },
  navLabelActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.divider ?? theme.colors.border,
  },
  footerWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: theme.colors.primaryTint,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    color: theme.colors.primary,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "MullerBold",
  },
  profileTextWrap: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  profileName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  profileRole: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "capitalize",
    fontFamily: "MullerMedium",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
  },
  logoutText: {
    marginLeft: 10,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
});