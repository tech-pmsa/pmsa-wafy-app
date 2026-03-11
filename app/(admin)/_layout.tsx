import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { COLORS } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true, // This forces the Navbar to appear
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
      backBehavior="history"
    >
      <Drawer.Screen name="officer/officer-dashboard" options={{ title: 'Officer Dashboard' }} />
      <Drawer.Screen name="officer/staffregister" options={{ title: 'Staff Register' }} />
      <Drawer.Screen name="classroom/class-dashboard" options={{ title: 'Class Dashboard' }} />
      <Drawer.Screen name="classroom/notifications" options={{ title: 'Notifications' }} />
      <Drawer.Screen name="classleader/class-leader-dashboard" options={{ title: 'Class Leader' }} />
      <Drawer.Screen name="staff/staff-dashboard" options={{ title: 'Staff Dashboard' }} />
      <Drawer.Screen name="manage-students" options={{ title: 'Manage Students' }} />
      <Drawer.Screen name="manage-staff" options={{ title: 'Manage Staff' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}