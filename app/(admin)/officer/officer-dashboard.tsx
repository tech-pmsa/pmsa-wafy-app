import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';

import CollegeAttendanceOverview from '@/components/admin/CollegeAttendanceOverview';
import FeeManagementDashboard from '@/components/admin/FeeManagementDashboard';
import AchievementViewer from '@/components/admin/AchievementViewer';

export default function OfficerDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center">
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="mt-4 text-zinc-500 font-medium">Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 font-muller bg-zinc-100" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 mt-4">
          <Text className="text-3xl font-bold text-zinc-900">
            Welcome, {details?.name || 'Officer'}
          </Text>
          <Text className="text-zinc-500 mt-1">
            Here is a high-level overview of the college's current status.
          </Text>
        </View>

        <View className="space-y-6">
          <CollegeAttendanceOverview />
          <FeeManagementDashboard />
          <AchievementViewer />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}