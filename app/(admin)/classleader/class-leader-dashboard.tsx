import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/useUserData';

import AttendanceForm from '@/components/admin/AttendanceForm'; // We'll build this next

export default function ClassLeaderDashboardPage() {
  const { details, loading } = useUserData();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center">
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="mt-4 text-zinc-500 font-medium">Loading Portal...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 mt-4">
          <Text className="text-3xl font-bold text-zinc-900">
            Attendance Portal
          </Text>
          <Text className="text-zinc-500 mt-1">
            Welcome, {details?.name}. Please mark today's attendance for your class: {details?.designation}.
          </Text>
        </View>

        <AttendanceForm />
      </ScrollView>
    </SafeAreaView>
  );
}