import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { User, School, Users, Phone, Eye, Edit, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

export function StudentCard({ student, onView, onEdit, onDelete }: any) {
  return (
    <View className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] overflow-hidden shadow-sm">
      <View className="p-4 flex-row items-center border-b border-[#E2E8F0]">
        <View className="h-14 w-14 rounded-[12px] bg-[#F1F5F9] items-center justify-center overflow-hidden border border-[#E2E8F0]">
          {student.img_url ? (
            <Image source={{ uri: student.img_url }} className="h-full w-full" />
          ) : (
            <User size={24} color="#94A3B8" />
          )}
        </View>
        <View className="ml-4 flex-1">
          <Text className="font-muller-bold text-[#0F172A] text-[16px] tracking-tight truncate" numberOfLines={1}>
            {student.name}
          </Text>
          <Text className="text-[13px] font-muller text-[#475569] mt-0.5">CIC: {student.cic || 'N/A'}</Text>
        </View>
      </View>

      <View className="px-4 py-3.5 flex-row flex-wrap gap-y-2.5 bg-[#F8FAFC]">
        <View className="w-1/2 flex-row items-center pr-2">
          <School size={14} color="#94A3B8" />
          <Text className="text-[13px] font-muller text-[#475569] ml-2 truncate" numberOfLines={1}>{student.class_id}</Text>
        </View>
        <View className="w-1/2 flex-row items-center">
          <Users size={14} color="#94A3B8" />
          <Text className="text-[13px] font-muller text-[#475569] ml-2 truncate" numberOfLines={1}>{student.council || 'N/A'}</Text>
        </View>
        <View className="w-1/2 flex-row items-center pr-2">
          <Phone size={14} color="#94A3B8" />
          <Text className="text-[13px] font-muller text-[#475569] ml-2 truncate" numberOfLines={1}>{student.phone || 'N/A'}</Text>
        </View>
      </View>

      <View className="flex-row border-t border-[#E2E8F0] bg-[#FFFFFF]">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onView(student)}
          className="flex-1 py-3.5 items-center justify-center flex-row border-r border-[#E2E8F0]"
        >
          <Eye size={16} color={COLORS.primary} />
          <Text className="ml-2 font-muller-bold text-[#1E40AF] text-[13px] uppercase tracking-wider">View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onEdit(student)}
          className="flex-1 py-3.5 items-center justify-center flex-row border-r border-[#E2E8F0]"
        >
          <Edit size={16} color={COLORS.warning} />
          <Text className="ml-2 font-muller-bold text-[#D97706] text-[13px] uppercase tracking-wider">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onDelete(student)}
          className="flex-1 py-3.5 items-center justify-center flex-row"
        >
          <Trash2 size={16} color={COLORS.danger} />
          <Text className="ml-2 font-muller-bold text-[#DC2626] text-[13px] uppercase tracking-wider">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}