import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { User, School, Users, Phone, Eye, Edit, Trash2 } from 'lucide-react-native';

export function StudentCard({ student, onView, onEdit, onDelete }: any) {
  return (
    <View className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <View className="p-4 flex-row items-center border-b border-zinc-100">
        <View className="h-14 w-14 rounded-full bg-zinc-100 items-center justify-center overflow-hidden border border-zinc-200">
          {student.img_url ? (
            <Image source={{ uri: student.img_url }} className="h-full w-full" />
          ) : (
            <User size={24} color="#a1a1aa" />
          )}
        </View>
        <View className="ml-4 flex-1">
          <Text className="font-bold text-zinc-900 text-lg truncate" numberOfLines={1}>{student.name}</Text>
          <Text className="text-sm text-zinc-500">CIC: {student.cic || 'N/A'}</Text>
        </View>
      </View>

      <View className="px-4 py-3 flex-row flex-wrap gap-y-2 bg-zinc-50">
        <View className="w-1/2 flex-row items-center"><School size={14} color="#71717a" /><Text className="text-xs text-zinc-600 ml-1.5">{student.class_id}</Text></View>
        <View className="w-1/2 flex-row items-center"><Users size={14} color="#71717a" /><Text className="text-xs text-zinc-600 ml-1.5">{student.council || 'N/A'}</Text></View>
        <View className="w-1/2 flex-row items-center"><Phone size={14} color="#71717a" /><Text className="text-xs text-zinc-600 ml-1.5">{student.phone || 'N/A'}</Text></View>
      </View>

      <View className="flex-row border-t border-zinc-100">
        <TouchableOpacity onPress={() => onView(student)} className="flex-1 py-3 items-center justify-center flex-row border-r border-zinc-100">
          <Eye size={16} color="#3b82f6" /><Text className="ml-1 font-semibold text-blue-600 text-xs">View</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(student)} className="flex-1 py-3 items-center justify-center flex-row border-r border-zinc-100">
          <Edit size={16} color="#eab308" /><Text className="ml-1 font-semibold text-yellow-600 text-xs">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(student)} className="flex-1 py-3 items-center justify-center flex-row">
          <Trash2 size={16} color="#dc2626" /><Text className="ml-1 font-semibold text-red-600 text-xs">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}