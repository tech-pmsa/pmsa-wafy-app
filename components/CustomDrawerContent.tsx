import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { GraduationCap, LayoutDashboard, Users, School, UserCheck, Settings, BookUser, Bell, Book, LogOut } from 'lucide-react-native';

const allNavItems = [
  { href: '/(admin)/officer/officer-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['officer'] },
  { href: '/(admin)/classroom/class-dashboard', label: 'Dashboard', icon: School, roles: ['class'] },
  { href: '/(admin)/classleader/class-leader-dashboard', label: 'Dashboard', icon: BookUser, roles: ['class-leader'] },
  { href: '/(student)/student-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student'] },
  { href: '/(admin)/manage-students', label: 'Students', icon: Users, roles: ['officer', 'class'] },
  { href: '/(admin)/manage-staff', label: 'Staff', icon: UserCheck, roles: ['officer'] },
  { href: '/(admin)/officer/staffregister', label: 'Staff Register', icon: Book, roles: ['officer'] },
  { href: '/(admin)/classroom/notifications', label: 'Notifications', icon: Bell, roles: ['class'] },
];

export default function CustomDrawerContent(props: any) {
  const { role, details } = useUserData();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  };

  const accessibleNavItems = allNavItems.filter(item => item.roles.includes(role || ''));

  // Dynamically determine the correct settings path based on role
  const settingsRoute = role === 'student' ? '/(student)/settings' : '/(admin)/settings';
  // Check if current path ends with settings so the highlight works in both admin and student routes
  const isSettingsActive = pathname.endsWith('/settings');

  return (
    <View className="flex-1 bg-zinc-900">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>

        {/* Header / Logo */}
        <View className="p-6 border-b border-zinc-800 flex-row items-center pt-16">
          <View className="bg-blue-600 p-2 rounded-xl">
            <GraduationCap size={24} color="white" />
          </View>
          <Text className="text-white text-xl font-bold ml-3 font-heading">PMSA Wafy</Text>
        </View>

        {/* Links */}
        <View className="p-4 mt-2">
          {accessibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            // Strict NativeWind strings
            const touchableClass = isActive
              ? "flex-row items-center p-3 rounded-xl mb-2 bg-blue-600"
              : "flex-row items-center p-3 rounded-xl mb-2 bg-transparent";

            const textClass = isActive
              ? "ml-3 font-semibold text-white"
              : "ml-3 font-semibold text-zinc-400";

            return (
              <TouchableOpacity
                key={item.href}
                onPress={() => router.push(item.href as any)}
                className={touchableClass}
              >
                <Icon size={20} color={isActive ? 'white' : '#a1a1aa'} />
                <Text className={textClass}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Dynamic Settings Link */}
          <TouchableOpacity
            onPress={() => router.push(settingsRoute as any)}
            className={isSettingsActive ? "flex-row items-center p-3 rounded-xl mb-2 bg-blue-600" : "flex-row items-center p-3 rounded-xl mb-2 bg-transparent"}
          >
            <Settings size={20} color={isSettingsActive ? 'white' : '#a1a1aa'} />
            <Text className={isSettingsActive ? "ml-3 font-semibold text-white" : "ml-3 font-semibold text-zinc-400"}>Settings</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Footer Profile Section */}
      <View className="p-4 border-t border-zinc-800 pb-8">
        <View className="flex-row items-center mb-4">
          <View className="h-10 w-10 bg-zinc-800 rounded-full items-center justify-center overflow-hidden">
            {details?.img_url ? (
              <Image source={{ uri: details.img_url }} className="h-full w-full" />
            ) : (
              <Text className="text-white font-bold">{details?.name?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white font-semibold truncate" numberOfLines={1}>{details?.name}</Text>
            <Text className="text-zinc-400 text-xs capitalize">{details?.role || role}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} className="flex-row items-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
          <LogOut size={18} color="#ef4444" />
          <Text className="ml-3 font-semibold text-red-500">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}