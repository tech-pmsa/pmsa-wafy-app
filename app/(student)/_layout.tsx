import React from "react";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "@/components/CustomDrawerContent";
import { theme } from "@/theme/theme";
import { Platform } from "react-native";

export default function StudentLayout() {
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
          color: theme.colors.text,
        },
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerStatusBarHeight: Platform.OS === "ios" ? undefined : 15,
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
      <Drawer.Screen name="student-dashboard" options={{ title: "Your Dashboard" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
    </Drawer>
  );
}