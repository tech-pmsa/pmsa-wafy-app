import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert, Modal } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, AlertTriangle, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

const CONFIRMATION_PHRASE = 'CLEAR ALL ATTENDANCE';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function ClearAttendance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearAttendance = async () => {
    if (confirmationInput !== CONFIRMATION_PHRASE) return NativeAlert.alert('Error', 'Confirmation phrase does not match.');

    setIsDeleting(true);
    try {
      // Calls edge function because it requires service role to bypass RLS easily
      const { error } = await supabase.functions.invoke('admin-actions', {
        body: { action: 'clear_attendance' }
      });
      if (error) throw error;

      NativeAlert.alert('Success', 'All attendance data has been successfully cleared.');
      setIsDialogOpen(false);
      setConfirmationInput('');
    } catch (error: any) {
      NativeAlert.alert('Deletion Failed', error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <View
        className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm"
        style={cardShadow()}
      >
        <View className="flex-row items-center mb-3.5">
          <View className="bg-[#DC2626]/10 p-2.5 rounded-[12px] border border-[#DC2626]/20">
            <Trash2 size={20} color={COLORS.danger} />
          </View>
          <Text className="text-lg font-muller-bold text-[#DC2626] ml-3 tracking-tight">Clear All Attendance</Text>
        </View>
        <Text className="text-[13px] font-muller text-[#475569] mb-6 leading-relaxed">
          This will permanently delete all attendance records for all students. This cannot be undone.
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsDialogOpen(true)}
          className="bg-[#DC2626]/10 border border-[#DC2626]/20 py-3.5 rounded-[14px] items-center flex-row justify-center"
        >
          <Trash2 size={18} color={COLORS.danger} />
          <Text className="text-[#DC2626] font-muller-bold ml-2 text-[15px] tracking-wide">Clear Data</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isDialogOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center px-6">
          <View
            className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-xl border border-[#E2E8F0]"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-muller-bold text-[#DC2626] tracking-tight">Are you sure?</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsDialogOpen(false)}
                className="bg-[#F1F5F9] p-2.5 rounded-full"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <Text className="text-[#475569] font-muller text-[15px] mb-5 leading-relaxed">
              This is a critical action. You are about to permanently delete all attendance records. Type <Text className="font-muller-bold text-[#0F172A]">{CONFIRMATION_PHRASE}</Text> to confirm.
            </Text>

            <TextInput
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-4 text-[15px] mb-6 font-muller-bold text-[#0F172A]"
              placeholder={CONFIRMATION_PHRASE}
              placeholderTextColor="#94A3B8"
              value={confirmationInput}
              onChangeText={setConfirmationInput}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              onPress={handleClearAttendance}
              activeOpacity={0.8}
              disabled={isDeleting || confirmationInput !== CONFIRMATION_PHRASE}
              className={`w-full py-4 rounded-[14px] items-center flex-row justify-center ${
                confirmationInput === CONFIRMATION_PHRASE ? 'bg-[#DC2626]' : 'bg-[#E2E8F0]'
              }`}
            >
              {isDeleting && <ActivityIndicator color="white" className="mr-2" />}
              <Text className={`font-muller-bold text-[16px] tracking-wide ${
                confirmationInput === CONFIRMATION_PHRASE ? 'text-white' : 'text-[#94A3B8]'
              }`}>
                Confirm & Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}