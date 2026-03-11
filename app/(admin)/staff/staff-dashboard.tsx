import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap } from 'lucide-react-native';
import { format } from 'date-fns';
import { useUserData } from '@/hooks/useUserData';
import { COLORS } from '@/constants/theme';

import CollegeLiveAttendance from '@/components/admin/CollegeLiveAttendance';
import AllStaffRegister from '@/components/admin/AllStaffRegister';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
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
      activeOpacity={0.7}
      className={`flex-1 py-3.5 rounded-[14px] items-center justify-center ${
        active ? 'bg-[#FFFFFF] border border-[#E2E8F0]' : 'bg-transparent border border-transparent'
      }`}
      style={active ? cardShadow() : undefined}
    >
      <Text className={`font-semibold tracking-tight text-[15px] ${active ? 'text-[#1E40AF]' : 'text-[#475569]'}`}>
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
        <View
          className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] flex-row items-center mb-6"
          style={cardShadow()}
        >
          <View className="bg-[#1E40AF]/10 p-3.5 rounded-[14px]">
            <GraduationCap size={28} color={COLORS.primary} />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Staff Dashboard</Text>
            <Text className="text-sm font-muller text-[#475569] mt-1">
              View student attendance or review the staff register.
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View className="flex-row bg-[#E2E8F0]/60 p-1.5 rounded-[16px] mb-6">
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
            className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
            style={cardShadow()}
          >
            <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">College Live Attendance</Text>
            <Text className="text-sm font-muller text-[#475569] mt-1.5 mb-5">
              A real-time overview for{' '}
              <Text className="font-muller-bold text-[#1E40AF]">{today}</Text>.
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