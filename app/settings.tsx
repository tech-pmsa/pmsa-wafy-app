import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';
import { User, BookUser, UserPlus, Trash2, AlertTriangle } from 'lucide-react-native';

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
      <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center">
        <ActivityIndicator size="large" color="#09090b" />
      </SafeAreaView>
    );
  }

  if (!role) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center p-6">
        <AlertTriangle size={48} color="#dc2626" />
        <Text className="text-xl font-bold text-zinc-900 mt-4">Access Denied</Text>
        <Text className="text-zinc-500 mt-2 text-center">Could not determine user role. Please try logging in again.</Text>
      </SafeAreaView>
    );
  }

  const accessibleTabs = settingsTabs.filter(tab => tab.roles.includes(role));

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-3xl font-bold text-zinc-900">Settings</Text>
        <Text className="text-zinc-500 mt-1">Manage your profile and system settings.</Text>
      </View>

      {/* Tab Navigation */}
      <View className="px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-4">
          {accessibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                className={`flex-row items-center px-4 py-2.5 rounded-full mr-2 border ${
                  isActive ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'
                }`}
              >
                <Icon size={16} color={isActive ? 'white' : '#71717a'} />
                <Text className={`ml-2 font-semibold ${isActive ? 'text-white' : 'text-zinc-700'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'council' && <ClassCouncil />}

        {activeTab === 'student-management' && (
          <View className="space-y-6">
            <AddStudents />
            <AddBulkStudents />
          </View>
        )}

        {activeTab === 'danger-zone' && (
          <View className="bg-red-50 border border-red-200 rounded-3xl p-5">
            <Text className="text-xl font-bold text-red-700 mb-2">Danger Zone</Text>
            <Text className="text-sm text-red-600 mb-4">Critical actions with permanent consequences.</Text>
            <UnlockAttendance />
            <ClearAttendance />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}