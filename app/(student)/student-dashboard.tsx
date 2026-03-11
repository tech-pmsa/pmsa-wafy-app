import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';
import { COLORS } from '@/constants/theme';

import StudentAttendanceCard from '@/components/student/StudentAttendanceCard';
import StudentFeeDashboard from '@/components/student/StudentFeeDashboard';
import AchievementsForm from '@/components/student/AchievementsForm';
import ApprovedAchievements from '@/components/student/ApprovedAchievements';

export default function StudentDashboardPage() {
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
            My Dashboard
          </Text>
          <Text className="text-[#475569] text-base mt-1.5 font-muller">
            Welcome back, <Text className="font-muller-bold text-[#0F172A]">{details?.name}</Text>. Here's an overview of your progress.
          </Text>
        </View>

        <View className="space-y-6">
          <StudentAttendanceCard />
          <StudentFeeDashboard />
          <AchievementsForm />
          <ApprovedAchievements />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}