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
    <View className="flex-row items-start bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0] mb-3.5">
      <View className="bg-[#FFFFFF] p-2.5 rounded-[12px] border border-[#E2E8F0] mt-0.5">
        <Icon size={20} color="#94A3B8" />
      </View>

      <View className="ml-3.5 flex-1">
        <Text className="text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider mb-1">
          {label}
        </Text>

        {isList && Array.isArray(value) && value.length > 0 ? (
          <View className="mt-0.5">
            {value.map((item: any, i: number) => (
              <Text
                key={i}
                className="text-[15px] font-muller-bold text-[#0F172A] mb-1.5 leading-relaxed"
              >
                • {String(item)}
              </Text>
            ))}
          </View>
        ) : (
          <Text className="text-[15px] font-muller-bold text-[#0F172A] leading-snug">
            {hasValue ? String(value) : 'Not set'}
          </Text>
        )}
      </View>
    </View>
  );
}