import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';
import { COLORS } from '@/constants/theme';

import ClassAttendanceDashboard from '@/components/admin/ClassAttendanceDashboard';
import FeeManagementDashboard from '@/components/admin/FeeManagementDashboard';
import AchievementViewer from '@/components/admin/AchievementViewer';

export default function ClassroomDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-medium font-muller">Loading Dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 mt-4">
          <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">
            {details?.designation || 'Class'} Dashboard
          </Text>
          <Text className="text-[#475569] text-base mt-1.5 font-muller">
            Welcome, {details?.name}. Here is an overview of your class.
          </Text>
        </View>

        <View className="space-y-6">
          <ClassAttendanceDashboard />
          <FeeManagementDashboard />
          <AchievementViewer />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}