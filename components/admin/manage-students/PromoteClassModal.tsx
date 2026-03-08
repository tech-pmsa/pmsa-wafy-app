import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert as NativeAlert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabaseClient';
import { ChevronsRight, X } from 'lucide-react-native';

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
      <View className="flex-1 bg-black/60 justify-center px-6">
        <View className="bg-white rounded-3xl p-6 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <ChevronsRight size={24} color="#2563eb" />
              <Text className="text-xl font-bold text-zinc-900 ml-2">Promote Class</Text>
            </View>
            <TouchableOpacity onPress={() => setIsOpen(false)}><X size={24} color="#71717a" /></TouchableOpacity>
          </View>

          <Text className="text-zinc-600 text-sm mb-4">Select the new class to move all students from <Text className="font-bold text-zinc-900">{currentClass}</Text>.</Text>

          <View className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden mb-6">
            <Picker selectedValue={toClass} onValueChange={setToClass}>
              <Picker.Item label="Select destination..." value="" />
              {allClasses.filter(c => c !== currentClass).map(cls => (
                <Picker.Item key={cls} label={cls} value={cls} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity onPress={handlePromote} disabled={loading || !toClass} className={`w-full py-4 rounded-xl items-center flex-row justify-center ${!toClass ? 'bg-zinc-300' : 'bg-blue-600'}`}>
            {loading && <ActivityIndicator color="white" className="mr-2" />}
            <Text className="text-white font-bold text-lg">Confirm Promotion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}