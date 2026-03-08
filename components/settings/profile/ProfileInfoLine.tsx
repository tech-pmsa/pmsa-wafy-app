import React from 'react';
import { View, Text } from 'react-native';

export function ProfileInfoLine({
  icon: Icon,
  label,
  value,
  isList = false,
}: any) {
  const hasValue = Array.isArray(value) ? value.length > 0 : !!value;

  return (
    <View className="flex-row items-start bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-3">
      <View className="bg-white p-2 rounded-lg border border-zinc-200 mt-0.5">
        <Icon size={20} color="#71717a" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-xs font-bold text-zinc-500 uppercase">
          {label}
        </Text>

        {isList && Array.isArray(value) && value.length > 0 ? (
          <View className="mt-1">
            {value.map((item: any, i: number) => (
              <Text
                key={i}
                className="text-base font-semibold text-zinc-900 mb-1"
              >
                • {String(item)}
              </Text>
            ))}
          </View>
        ) : (
          <Text className="text-base font-semibold text-zinc-900 mt-1">
            {hasValue ? String(value) : 'Not set'}
          </Text>
        )}
      </View>
    </View>
  );
}