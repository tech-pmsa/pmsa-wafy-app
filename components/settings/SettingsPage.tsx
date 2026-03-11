import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';
import { User, BookUser, UserPlus, Trash2, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

// Import our tabs
import ProfileSection from '@/components/settings/ProfileSection';
import ClassCouncil from '@/components/settings/ClassCouncil';
import AddStudents from '@/components/settings/AddStudents';
import AddBulkStudents from '@/components/settings/AddBulkStudents';
import UnlockAttendance from '@/components/settings/UnlockAttendance';
import ClearAttendance from '@/components/settings/ClearAttendance';

const settingsTabs = [
  { value: 'profile', label: 'My Profile', icon: User, roles: ['student', 'officer', 'class', 'class-leader', 'staff'] },
  { value: 'council', label: 'Class Council', icon: BookUser, roles: ['class'] },
  { value: 'student-management', label: 'Student Management', icon: UserPlus, roles: ['officer'] },
  { value: 'danger-zone', label: 'Danger Zone', icon: Trash2, roles: ['officer'] },
];

export default function SettingsPage() {
  const { role, loading } = useUserData();
  const [activeTab, setActiveTab] = useState('profile');

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!role) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center p-6">
        <View className="bg-[#DC2626]/10 p-5 rounded-full mb-4">
          <AlertTriangle size={48} color={COLORS.danger} />
        </View>
        <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight mt-2">Access Denied</Text>
        <Text className="text-[#475569] font-muller mt-2 text-center leading-relaxed">
          Could not determine user role. Please try logging in again.
        </Text>
      </SafeAreaView>
    );
  }

  const accessibleTabs = settingsTabs.filter(tab => tab.roles.includes(role));

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">Settings</Text>
        <Text className="text-[#475569] font-muller mt-1.5">Manage your profile and system configuration.</Text>
      </View>

      {/* Tab Navigation */}
      <View className="px-5">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-5 -ml-1 pl-1">
          {accessibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.value)}
                className={`flex-row items-center px-4 py-3 rounded-[14px] mr-2.5 border ${
                  isActive ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                }`}
              >
                <Icon size={18} color={isActive ? 'white' : '#475569'} />
                <Text className={`ml-2.5 font-muller-bold tracking-wide text-[13px] ${isActive ? 'text-white' : 'text-[#475569]'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'council' && <ClassCouncil />}

        {activeTab === 'student-management' && (
          <View className="space-y-6">
            <AddStudents />
            <AddBulkStudents />
          </View>
        )}

        {activeTab === 'danger-zone' && (
          <View className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-[18px] p-5">
            <Text className="text-xl font-muller-bold tracking-tight text-[#DC2626] mb-1">Danger Zone</Text>
            <Text className="text-[13px] font-muller text-[#DC2626]/80 mb-6">Critical actions with permanent consequences.</Text>

            <View className="space-y-4">
              <UnlockAttendance />
              <ClearAttendance />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}