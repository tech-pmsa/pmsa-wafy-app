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
  { href: '/(admin)/staff/staff-dashboard', label: 'Dashboard', icon: BookUser, roles: ['staff'] },
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
    <View className="flex-1 bg-[#F8FAFC]">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>

        {/* Header / Logo Area */}
        <View className="px-6 py-4 bg-[#FFFFFF] border-b border-[#E2E8F0] flex-row items-center pt-16">
          <View className="bg-[#1E40AF] p-3 rounded-[14px]">
            <GraduationCap size={26} color="#FFFFFF" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-[#0F172A] text-xl font-bold font-heading tracking-tight">PMSA Wafy</Text>
            <Text className="text-[#475569] text-xs font-medium mt-0.5">Academic Portal</Text>
          </View>
        </View>

        {/* Navigation Links */}
        <View className="p-4 mt-2">
          {accessibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const touchableClass = isActive
              ? "flex-row items-center p-3.5 rounded-[14px] mb-1 bg-[#1E40AF]/10 border border-[#1E40AF]/10"
              : "flex-row items-center p-3.5 rounded-[14px] mb-1 bg-transparent border border-transparent";

            const textClass = isActive
              ? "ml-3.5 font-semibold text-[#1E40AF]"
              : "ml-3.5 font-medium text-[#475569]";

            return (
              <TouchableOpacity
                key={item.href}
                onPress={() => router.push(item.href as any)}
                className={touchableClass}
                activeOpacity={0.7}
              >
                <Icon size={22} color={isActive ? '#1E40AF' : '#94A3B8'} />
                <Text className={textClass}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Dynamic Settings Link */}
          <View className="h-[1px] bg-[#E2E8F0] my-3 mx-2" />

          <TouchableOpacity
            onPress={() => router.push(settingsRoute as any)}
            className={isSettingsActive ? "flex-row items-center p-3.5 rounded-[14px] mb-2 bg-[#1E40AF]/10 border border-[#1E40AF]/10" : "flex-row items-center p-3.5 rounded-[14px] mb-2 bg-transparent border border-transparent"}
            activeOpacity={0.7}
          >
            <Settings size={22} color={isSettingsActive ? '#1E40AF' : '#94A3B8'} />
            <Text className={isSettingsActive ? "ml-3.5 font-semibold text-[#1E40AF]" : "ml-3.5 font-medium text-[#475569]"}>Settings</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Footer Profile Section */}
      <View className="p-4 bg-[#FFFFFF] border-t border-[#E2E8F0] pb-8 shadow-sm">

        {/* Profile Card Block */}
        <View className="flex-row items-center mb-4 bg-[#F8FAFC] p-3 rounded-[16px] border border-[#E2E8F0]">
          <View className="h-11 w-11 bg-[#1E40AF]/10 rounded-[12px] items-center justify-center overflow-hidden border border-[#1E40AF]/20">
            {details?.img_url ? (
              <Image source={{ uri: details.img_url }} className="h-full w-full" />
            ) : (
              <Text className="text-[#1E40AF] font-bold text-lg">{details?.name?.charAt(0) || 'U'}</Text>
            )}
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-[#0F172A] font-bold text-[15px] tracking-tight truncate" numberOfLines={1}>
              {details?.name || 'Loading...'}
            </Text>
            <Text className="text-[#475569] text-xs capitalize font-medium mt-0.5">
              {details?.role || role || 'User'}
            </Text>
          </View>
        </View>

        {/* Danger Logout Action */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-center p-3.5 bg-[#DC2626]/10 rounded-[14px] border border-[#DC2626]/20"
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#DC2626" />
          <Text className="ml-2.5 font-semibold text-[#DC2626]">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}