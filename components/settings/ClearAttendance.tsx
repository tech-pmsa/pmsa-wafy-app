import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert, Modal } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Trash2, AlertTriangle, X } from 'lucide-react-native';

const CONFIRMATION_PHRASE = 'CLEAR ALL ATTENDANCE';

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
      <View className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-4">
        <View className="flex-row items-center mb-4">
          <Trash2 size={24} color="#dc2626" />
          <Text className="text-lg font-bold text-red-700 ml-3">Clear All Attendance</Text>
        </View>
        <Text className="text-sm text-red-600 mb-6 leading-5">This will permanently delete all attendance records for all students. This cannot be undone.</Text>

        <TouchableOpacity onPress={() => setIsDialogOpen(true)} className="bg-red-600 py-3 rounded-xl items-center flex-row justify-center shadow-sm">
          <Trash2 size={18} color="white" />
          <Text className="text-white font-bold ml-2">Clear Data</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isDialogOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-red-700">Are you sure?</Text>
              <TouchableOpacity onPress={() => setIsDialogOpen(false)}><X size={24} color="#71717a" /></TouchableOpacity>
            </View>
            <Text className="text-zinc-600 mb-4">This is a critical action. You are about to permanently delete all attendance records. Type <Text className="font-bold text-zinc-900">{CONFIRMATION_PHRASE}</Text> to confirm.</Text>

            <TextInput
              className="bg-zinc-50 border border-zinc-300 rounded-xl p-4 text-base mb-6 font-bold"
              placeholder={CONFIRMATION_PHRASE}
              value={confirmationInput}
              onChangeText={setConfirmationInput}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              onPress={handleClearAttendance}
              disabled={isDeleting || confirmationInput !== CONFIRMATION_PHRASE}
              className={`w-full py-4 rounded-xl items-center flex-row justify-center ${confirmationInput === CONFIRMATION_PHRASE ? 'bg-red-600' : 'bg-red-300'}`}
            >
              {isDeleting && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-white font-bold text-lg">Confirm & Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}