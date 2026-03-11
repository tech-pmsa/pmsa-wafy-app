import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabaseClient';
import { ChevronsRight, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

const allClasses = ["TH-1", "TH-2", "AL-1", "AL-2", "AL-3", "AL-4", "Foundation A", "Foundation B", "Graduated"];

export function PromoteClassModal({ isOpen, setIsOpen, currentClass, onSave }: any) {
  const [toClass, setToClass] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePromote = async () => {
    if (!toClass) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'promote_class', from_class: currentClass, to_class: toClass }
      });
      if (error) throw error;

      NativeAlert.alert("Success", `Promoted to ${toClass}`);
      onSave();
      setIsOpen(false);
    } catch (e: any) {
      NativeAlert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center px-6">
        <View className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-xl border border-[#E2E8F0]">

          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center bg-[#1E40AF]/10 px-3 py-2 rounded-[12px] border border-[#1E40AF]/20">
              <ChevronsRight size={20} color={COLORS.primary} />
              <Text className="text-[15px] font-muller-bold text-[#1E40AF] ml-2 tracking-tight uppercase">Promote Class</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsOpen(false)}
              className="bg-[#F1F5F9] p-2.5 rounded-full"
            >
              <X size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <Text className="text-[#475569] font-muller text-[15px] mb-5 leading-relaxed">
            Select the new class to move all students from <Text className="font-muller-bold text-[#0F172A]">{currentClass}</Text>.
          </Text>

          <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] overflow-hidden mb-8">
            <Picker
              selectedValue={toClass}
              onValueChange={setToClass}
              style={{ color: '#0F172A' }}
            >
              <Picker.Item label="Select destination..." value="" color="#94A3B8" />
              {allClasses.filter(c => c !== currentClass).map(cls => (
                <Picker.Item key={cls} label={cls} value={cls} color="#0F172A" />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePromote}
            disabled={loading || !toClass}
            className={`w-full py-4 rounded-[14px] items-center flex-row justify-center ${
              !toClass ? 'bg-[#E2E8F0]' : 'bg-[#1E40AF]'
            }`}
          >
            {loading && <ActivityIndicator color="white" className="mr-2.5" />}
            <Text className={`font-muller-bold text-[16px] tracking-wide ${!toClass ? 'text-[#94A3B8]' : 'text-white'}`}>
              Confirm Promotion
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}