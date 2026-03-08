import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap } from 'lucide-react-native';
import { format } from 'date-fns';
import { useUserData } from '@/hooks/useUserData';

import CollegeLiveAttendance from '@/components/admin/CollegeLiveAttendance';
import AllStaffRegister from '@/components/admin/AllStaffRegister';

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
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 flex-row items-center mb-6">
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

        {/* --- Custom Tab Switcher --- */}
        <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab('students')}
            className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'students' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`font-semibold ${activeTab === 'students' ? 'text-zinc-900' : 'text-zinc-500'}`}>Live Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('register')}
            className={`flex-1 py-3 rounded-lg items-center ${activeTab === 'register' ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`font-semibold ${activeTab === 'register' ? 'text-zinc-900' : 'text-zinc-500'}`}>Staff Register</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'students' ? (
          <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
            <Text className="text-xl font-bold text-zinc-900">College Live Attendance</Text>
            <Text className="text-sm text-zinc-500 mt-1 mb-4">
              A real-time overview for <Text className="font-semibold text-blue-600">{today}</Text>.
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