import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/CustomDrawerContent';

export default function AdminLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,             // Shows the top navbar with the hamburger icon
        headerStyle: { backgroundColor: '#18181b' }, // Dark header
        headerTintColor: '#ffffff',    // White text/icons on header
        headerTitle: "Admin Portal",
        drawerStyle: { width: 280 },
      }}
    />
  );
}