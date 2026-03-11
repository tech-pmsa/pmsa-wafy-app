import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  Pencil,
  Trash2,
  PlusCircle,
  BookMarked,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export function AcademicsTab({ entries, onAdd, onEdit, onDelete }: any) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Academic Records</Text>
          <Text className="text-sm font-muller text-[#475569] mt-1">
            A record of your performance.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onAdd}
          className="bg-[#1E40AF]/10 px-3.5 py-2.5 rounded-[12px] border border-[#1E40AF]/20 flex-row items-center"
        >
          <PlusCircle size={16} color={COLORS.primary} />
          <Text className="text-[#1E40AF] font-muller-bold ml-1.5 text-xs uppercase tracking-wider">Add</Text>
        </TouchableOpacity>
      </View>

      {entries && entries.length > 0 ? (
        <View>
          {entries.map((entry: any) => {
            const isExpanded = expandedId === entry.id;

            return (
              <View
                key={entry.id}
                className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] overflow-hidden mb-3.5 shadow-sm"
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="p-4 flex-row items-center justify-between bg-[#F8FAFC]"
                >
                  <Text className="font-muller-bold text-[#0F172A] text-[15px] flex-1 pr-3">
                    {entry.title}
                  </Text>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => onEdit(entry)}
                      className="p-2 bg-[#FFFFFF] rounded-[10px] border border-[#E2E8F0] mr-2"
                    >
                      <Pencil size={16} color={COLORS.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => onDelete(entry.id)}
                      className="p-2 bg-[#FFFFFF] rounded-[10px] border border-[#E2E8F0] mr-2.5"
                    >
                      <Trash2 size={16} color={COLORS.danger} />
                    </TouchableOpacity>

                    {isExpanded ? (
                      <ChevronUp size={22} color="#94A3B8" />
                    ) : (
                      <ChevronDown size={22} color="#94A3B8" />
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View className="px-4 pb-4 border-t border-[#E2E8F0] pt-3.5">
                    <View className="flex-row border-b border-[#E2E8F0] pb-2 mb-2.5">
                      <Text className="flex-1 text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
                        Subject
                      </Text>
                      <Text className="w-16 text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
                        Mark
                      </Text>
                      <Text className="w-16 text-right text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider">
                        Status
                      </Text>
                    </View>

                    {entry.subject_marks && entry.subject_marks.length > 0 ? (
                      entry.subject_marks.map((sub: any) => {
                        const passed = !!sub.status;

                        return (
                          <View
                            key={sub.id}
                            className="flex-row items-center py-2.5 border-b border-[#E2E8F0]/60"
                          >
                            <Text className="flex-1 font-muller-bold text-[#0F172A] text-[13px] pr-2">
                              {sub.subject_name}
                            </Text>

                            <Text className="w-16 font-muller-bold text-[#0F172A] text-[13px]">
                              {sub.marks_obtained}
                            </Text>

                            {passed ? (
                              <View className="w-16 items-end">
                                <View className="bg-[#16A34A]/10 px-2.5 py-1.5 rounded-[8px] border border-[#16A34A]/20">
                                  <Text className="text-[10px] font-muller-bold text-[#16A34A] uppercase tracking-wider">
                                    PASS
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <View className="w-16 items-end">
                                <View className="bg-[#DC2626]/10 px-2.5 py-1.5 rounded-[8px] border border-[#DC2626]/20">
                                  <Text className="text-[10px] font-muller-bold text-[#DC2626] uppercase tracking-wider">
                                    FAIL
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-[13px] font-muller text-[#94A3B8] py-4 text-center">
                        No subjects added.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View className="items-center justify-center p-8 bg-[#F8FAFC] rounded-[16px] border border-dashed border-[#E2E8F0]">
          <BookMarked size={48} color="#94A3B8" />
          <Text className="mt-4 font-muller-bold text-[#0F172A] text-lg tracking-tight">
            No Records Found
          </Text>
        </View>
      )}
    </View>
  );
}