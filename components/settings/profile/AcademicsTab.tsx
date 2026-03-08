import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Pencil, Trash2, PlusCircle, BookMarked, ChevronDown, ChevronUp } from 'lucide-react-native';

export function AcademicsTab({ entries, onAdd, onEdit, onDelete }: any) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1">
          <Text className="text-xl font-bold text-zinc-900">Academic Records</Text>
          <Text className="text-sm text-zinc-500 mt-1">A record of your performance.</Text>
        </View>
        <TouchableOpacity onPress={onAdd} className="bg-zinc-900 px-3 py-2 rounded-xl flex-row items-center">
          <PlusCircle size={16} color="white" />
          <Text className="text-white font-bold ml-1 text-xs">Add</Text>
        </TouchableOpacity>
      </View>

      {entries.length > 0 ? (
        <View className="space-y-3">
          {entries.map((entry: any) => {
            const isExpanded = expandedId === entry.id;
            return (
              <View key={entry.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="p-4 flex-row items-center justify-between bg-zinc-50"
                >
                  <Text className="font-bold text-zinc-900 text-base flex-1">{entry.title}</Text>

                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => onEdit(entry)} className="p-2 bg-white rounded-full border border-zinc-200"><Pencil size={16} color="#09090b" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete(entry.id)} className="p-2 bg-white rounded-full border border-zinc-200"><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
                    {isExpanded ? <ChevronUp size={20} color="#71717a" /> : <ChevronDown size={20} color="#71717a" />}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View className="px-4 pb-4 border-t border-zinc-100 pt-3">
                    <View className="flex-row border-b border-zinc-200 pb-2 mb-2">
                      <Text className="flex-[2] text-xs font-bold text-zinc-500 uppercase">Subject</Text>
                      <Text className="flex-1 text-xs font-bold text-zinc-500 uppercase">Mark</Text>
                      <Text className="w-16 text-right text-xs font-bold text-zinc-500 uppercase">Status</Text>
                    </View>

                    {entry.subject_marks && entry.subject_marks.length > 0 ? (
                      entry.subject_marks.map((sub: any) => (
                        <View key={sub.id} className="flex-row items-center py-2 border-b border-zinc-100">
                          <Text className="flex-[2] font-semibold text-zinc-900 uppercase text-xs pr-2">{sub.subject_name}</Text>
                          <Text className="flex-1 font-semibold text-zinc-900 uppercase text-xs">{sub.marks_obtained}</Text>
                          <View className={`w-16 items-center py-1 rounded ${sub.status ? 'bg-green-100' : 'bg-red-100'}`}>
                            <Text className={`text-[10px] font-bold ${sub.status ? 'text-green-700' : 'text-red-700'}`}>{sub.status ? 'PASS' : 'FAIL'}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text className="text-sm text-zinc-500 py-4 text-center">No subjects added.</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View className="items-center justify-center p-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
          <BookMarked size={48} color="#a1a1aa" />
          <Text className="mt-4 font-bold text-zinc-700 text-lg">No Records Found</Text>
        </View>
      )}
    </View>
  );
}