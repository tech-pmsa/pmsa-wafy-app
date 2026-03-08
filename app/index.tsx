import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { GraduationCap } from 'lucide-react-native';

export default function IndexScreen() {
  // This screen is intentionally dumb.
  // It just shows a loading state while app/_layout.tsx checks Supabase
  // and redirects the user to either /(auth)/login or their dashboard.

  return (
    <View className="flex-1 justify-center items-center bg-zinc-900">
      <View className="items-center mb-8">
        <GraduationCap size={64} color="white" />
        <Text className="text-white text-2xl font-bold font-heading mt-4">
          PMSA Wafy College
        </Text>
      </View>

      <ActivityIndicator size="large" color="white" />
      <Text className="text-zinc-400 mt-4 text-sm font-medium">
        Authenticating...
      </Text>
    </View>
  );
}