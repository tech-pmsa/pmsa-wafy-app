import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap } from 'lucide-react-native';
import { format } from 'date-fns';
import { useUserData } from '@/hooks/useUserData';

import CollegeLiveAttendance from '@/components/admin/CollegeLiveAttendance';
import AllStaffRegister from '@/components/admin/AllStaffRegister';

function cardShadow() {
  return {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={active ? 'flex-1 py-3 rounded-lg items-center bg-white' : 'flex-1 py-3 rounded-lg items-center'}
      style={active ? cardShadow() : undefined}
    >
      <Text className={active ? 'font-semibold text-zinc-900' : 'font-semibold text-zinc-500'}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function StaffDashboardPage() {
  const { loading } = useUserData();
  const [activeTab, setActiveTab] = useState<'students' | 'register'>('students');
  const today = format(new Date(), 'PPP');

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center">
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="mt-4 text-zinc-500 font-medium">Loading Dashboard...</Text>
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
        <View
          className="bg-white rounded-3xl p-5 border border-zinc-200 flex-row items-center mb-6"
          style={cardShadow()}
        >
          <View className="bg-blue-50 p-3 rounded-xl">
            <GraduationCap size={28} color="#2563eb" />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-xl font-bold text-zinc-900">Staff Dashboard</Text>
            <Text className="text-sm text-zinc-500 mt-1">
              View student attendance or review the staff register.
            </Text>
          </View>
        </View>

        <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-6">
          <TabButton
            label="Live Attendance"
            active={activeTab === 'students'}
            onPress={() => setActiveTab('students')}
          />
          <TabButton
            label="Staff Register"
            active={activeTab === 'register'}
            onPress={() => setActiveTab('register')}
          />
        </View>

        {activeTab === 'students' ? (
          <View
            className="bg-white rounded-3xl p-5 border border-zinc-200"
            style={cardShadow()}
          >
            <Text className="text-xl font-bold text-zinc-900">College Live Attendance</Text>
            <Text className="text-sm text-zinc-500 mt-1 mb-4">
              A real-time overview for{' '}
              <Text className="font-semibold text-blue-600">{today}</Text>.
            </Text>

            <CollegeLiveAttendance />
          </View>
        ) : (
          <AllStaffRegister />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}