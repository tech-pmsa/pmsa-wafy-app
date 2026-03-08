import React from 'react';
import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/CustomDrawerContent';

export default function StudentLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerTintColor: '#09090b',
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
        drawerActiveBackgroundColor: '#f4f4f5',
        drawerActiveTintColor: '#09090b',
      }}
      backBehavior="history" // <--- THIS FIXES THE BACK BUTTON BUG!
    >
      <Drawer.Screen name="student-dashboard" options={{ title: 'Dashboard' }} />

      {/* Add the new settings screen here! */}
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}