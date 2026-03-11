import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { GraduationCap } from 'lucide-react-native';

export default function IndexScreen() {
  // This screen is intentionally dumb.
  // It just shows a loading state while app/_layout.tsx checks Supabase
  // and redirects the user to either /(auth)/login or their dashboard.

  return (
    <View className="flex-1 justify-center items-center bg-[#F8FAFC]">
      <View className="items-center mb-8">
        <View className="bg-[#1E40AF]/10 p-5 rounded-[18px] mb-5 border border-[#1E40AF]/10">
          <GraduationCap size={56} color="#1E40AF" />
        </View>
        <Text className="text-[#0F172A] text-2xl font-bold font-muller-bold mt-2">
          PMSA Wafy College
        </Text>
        <Text className="text-[#475569] text-sm mt-1 font-medium">
          Academic Management System
        </Text>
      </View>

      <ActivityIndicator size="large" color="#1E40AF" />
      <Text className="text-[#94A3B8] mt-4 text-sm font-medium">
        Authenticating securely...
      </Text>
    </View>
  );
}