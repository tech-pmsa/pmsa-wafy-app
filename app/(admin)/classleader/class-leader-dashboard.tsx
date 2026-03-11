import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';
import { COLORS } from '@/constants/theme';

import AttendanceForm from '@/components/admin/AttendanceForm'; // We'll build this next

export default function ClassLeaderDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-medium font-muller">Loading Portal...</Text>
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
            Attendance Portal
          </Text>
          <Text className="text-[#475569] text-base mt-1.5 font-muller">
            Welcome, {details?.name}. Please mark today's attendance for your class: <Text className="font-muller-bold text-[#1E40AF]">{details?.designation}</Text>.
          </Text>
        </View>

        <AttendanceForm />
      </ScrollView>
    </SafeAreaView>
  );
}