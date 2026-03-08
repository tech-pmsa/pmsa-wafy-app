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

function cardShadow() {
  return {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}

export function AcademicsTab({ entries, onAdd, onEdit, onDelete }: any) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <View
      className="bg-white rounded-3xl p-5 border border-zinc-200"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1 pr-3">
          <Text className="text-xl font-bold text-zinc-900">Academic Records</Text>
          <Text className="text-sm text-zinc-500 mt-1">
            A record of your performance.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onAdd}
          className="bg-zinc-900 px-3 py-2 rounded-xl flex-row items-center"
        >
          <PlusCircle size={16} color="white" />
          <Text className="text-white font-bold ml-1 text-xs">Add</Text>
        </TouchableOpacity>
      </View>

      {entries && entries.length > 0 ? (
        <View>
          {entries.map((entry: any) => {
            const isExpanded = expandedId === entry.id;

            return (
              <View
                key={entry.id}
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden mb-3"
                style={cardShadow()}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="p-4 flex-row items-center justify-between bg-zinc-50"
                >
                  <Text className="font-bold text-zinc-900 text-base flex-1 pr-3">
                    {entry.title}
                  </Text>

                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => onEdit(entry)}
                      className="p-2 bg-white rounded-full border border-zinc-200 mr-2"
                    >
                      <Pencil size={16} color="#09090b" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onDelete(entry.id)}
                      className="p-2 bg-white rounded-full border border-zinc-200 mr-2"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>

                    {isExpanded ? (
                      <ChevronUp size={20} color="#71717a" />
                    ) : (
                      <ChevronDown size={20} color="#71717a" />
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View className="px-4 pb-4 border-t border-zinc-100 pt-3">
                    <View className="flex-row border-b border-zinc-200 pb-2 mb-2">
                      <Text className="flex-1 text-xs font-bold text-zinc-500 uppercase">
                        Subject
                      </Text>
                      <Text className="w-16 text-xs font-bold text-zinc-500 uppercase">
                        Mark
                      </Text>
                      <Text className="w-16 text-right text-xs font-bold text-zinc-500 uppercase">
                        Status
                      </Text>
                    </View>

                    {entry.subject_marks && entry.subject_marks.length > 0 ? (
                      entry.subject_marks.map((sub: any) => {
                        const passed = !!sub.status;

                        return (
                          <View
                            key={sub.id}
                            className="flex-row items-center py-2 border-b border-zinc-100"
                          >
                            <Text className="flex-1 font-semibold text-zinc-900 uppercase text-xs pr-2">
                              {sub.subject_name}
                            </Text>

                            <Text className="w-16 font-semibold text-zinc-900 uppercase text-xs">
                              {sub.marks_obtained}
                            </Text>

                            {passed ? (
                              <View className="w-16 items-center py-1 rounded bg-green-100">
                                <Text className="text-[10px] font-bold text-green-700">
                                  PASS
                                </Text>
                              </View>
                            ) : (
                              <View className="w-16 items-center py-1 rounded bg-red-100">
                                <Text className="text-[10px] font-bold text-red-700">
                                  FAIL
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text className="text-sm text-zinc-500 py-4 text-center">
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
        <View className="items-center justify-center p-8 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
          <BookMarked size={48} color="#a1a1aa" />
          <Text className="mt-4 font-bold text-zinc-700 text-lg">
            No Records Found
          </Text>
        </View>
      )}
    </View>
  );
}