import { Drawer } from 'expo-router/drawer';
import CustomDrawerContent from '@/components/CustomDrawerContent';

export default function StudentLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#18181b' },
        headerTintColor: '#ffffff',
        headerTitle: "Student Portal",
        drawerStyle: { width: 280 },
      }}
    />
  );
}