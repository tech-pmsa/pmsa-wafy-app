import React from "react";
import { Platform } from "react-native";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "@/components/CustomDrawerContent";
import { theme } from "@/theme/theme";

export default function AdminLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.colors.text,
        headerStyle: {
          backgroundColor: theme.colors.background,
          height: Platform.OS === "ios" ? 96 : 64,
        },
        headerTitleStyle: {
          fontFamily: "MullerBold",
          fontSize: 18,
          lineHeight: 22,
          color: theme.colors.text,
        },
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStatusBarHeight: Platform.OS === "ios" ? undefined : 15,
        headerLeftContainerStyle: {
          paddingLeft: 6,
        },
        headerRightContainerStyle: {
          paddingRight: 6,
        },
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
        drawerType: "front",
        drawerStyle: {
          width: 320,
          backgroundColor: "transparent",
        },
        drawerActiveBackgroundColor: theme.colors.primaryTint,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textSecondary,
      }}
      backBehavior="history"
    >
      <Drawer.Screen
        name="officer/officer-dashboard"
        options={{ title: "Officer Dashboard" }}
      />
      <Drawer.Screen
        name="officer/staffregister"
        options={{ title: "Staff Register" }}
      />
      <Drawer.Screen
        name="classroom/class-dashboard"
        options={{ title: "Class Dashboard" }}
      />
      <Drawer.Screen
        name="classroom/notifications"
        options={{ title: "Notifications" }}
      />
      <Drawer.Screen
        name="classleader/class-leader-dashboard"
        options={{ title: "Class Leader" }}
      />
      <Drawer.Screen
        name="chef/chef-dashboard"
        options={{ title: "Kitchen Dashboard" }}
      />
      <Drawer.Screen
        name="main/main-dashboard"
        options={{ title: "Main Office Dashboard" }}
      />
      <Drawer.Screen
        name="chef/chef-settings"
        options={{ title: "Kitchen Settings" }}
      />
      <Drawer.Screen
        name="staff/staff-dashboard"
        options={{ title: "Staff Dashboard" }}
      />
      <Drawer.Screen
        name="manage-students"
        options={{ title: "Manage Students" }}
      />
      <Drawer.Screen
        name="students-detail"
        options={{ title: "Students Detail" }}
      />
      <Drawer.Screen name="manage-staff" options={{ title: "Manage Staff" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
      <Drawer.Screen name="kitchen" options={{ title: "Kitchen Attendance" }} />
    </Drawer>
  );
}