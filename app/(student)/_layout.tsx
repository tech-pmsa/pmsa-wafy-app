import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { COLORS } from '@/constants/theme';

export default function StudentLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTintColor: COLORS.textPrimary, // #0F172A
        headerStyle: { backgroundColor: COLORS.background }, // #F8FAFC to blend with screens
        headerTitleStyle: {
          fontFamily: 'MullerBold',
          fontSize: 18,
        },
        headerShadowVisible: false,
        drawerActiveBackgroundColor: COLORS.primaryLight,
        drawerActiveTintColor: COLORS.primary,
      }}
      backBehavior="history" // <--- THIS FIXES THE BACK BUTTON BUG!
    >
      <Drawer.Screen name="student-dashboard" options={{ title: 'Dashboard' }} />

      {/* Add the new settings screen here! */}
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}