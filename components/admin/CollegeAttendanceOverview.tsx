import React from 'react';
import { View, Text } from 'react-native';
import { Users, UserCheck, UserX } from 'lucide-react-native'; // Notice we use the native icons!

export default function CollegeAttendanceOverview() {
  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 mb-6">
      <View className="flex-row items-center mb-4 border-b border-zinc-100 pb-4">
        <View className="bg-blue-50 p-3 rounded-xl mr-3">
          <Users size={24} color="#2563eb" />
        </View>
        <View>
          <Text className="text-xl font-bold text-zinc-900">College Overview</Text>
          <Text className="text-sm text-zinc-500">Today's Attendance Status</Text>
        </View>
      </View>

      <View className="items-center py-6">
        <Text className="text-zinc-500 font-medium">UI successfully converted to Native!</Text>
        <Text className="text-xs text-zinc-400 mt-2 text-center">Paste your PWA code for this component in the chat so we can build the full native version.</Text>
      </View>
    </View>
  );
}