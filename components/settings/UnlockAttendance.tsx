import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Unlock, X } from 'lucide-react-native';

export default function UnlockAttendance() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from('students').select('class_id');
      if (data) {
        const uniqueClasses = [...new Set(data.map(item => item.class_id).filter(Boolean))].sort();
        setClasses(uniqueClasses as string[]);
      }
    };
    fetchClasses();
  }, []);

  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'unlock_attendance',
          class_id: selectedClass,
          date: format(selectedDate, 'yyyy-MM-dd'),
          reason
        }
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      NativeAlert.alert('Success', 'Attendance unlocked.');
      setSelectedClass(''); setReason(''); setConfirmationText(''); setIsModalOpen(false);
    } catch (error: any) {
      NativeAlert.alert('Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confPhrase = `unlock ${selectedClass}`;

  return (
    <>
      <View className="bg-orange-50 border border-orange-200 rounded-3xl p-5">
        <View className="flex-row items-center mb-4">
          <AlertTriangle size={24} color="#f97316" />
          <Text className="text-lg font-bold text-orange-700 ml-3">Unlock Attendance</Text>
        </View>

        <Text className="text-sm font-medium text-zinc-700 mb-1">Select Class</Text>
        <View className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-4">
          <Picker selectedValue={selectedClass} onValueChange={setSelectedClass}>
            <Picker.Item label="Select..." value="" />
            {classes.map(cls => <Picker.Item key={cls} label={cls} value={cls} />)}
          </Picker>
        </View>

        <Text className="text-sm font-medium text-zinc-700 mb-1">Select Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3 mb-4">
          <CalendarIcon size={18} color="#71717a" />
          <Text className="ml-2 text-zinc-900">{format(selectedDate, 'PPP')}</Text>
        </TouchableOpacity>
        {showDatePicker && <DateTimePicker value={selectedDate} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setSelectedDate(d); }} />}

        <Text className="text-sm font-medium text-zinc-700 mb-1">Reason</Text>
        <TextInput className="bg-white border border-zinc-200 rounded-xl p-4 text-base mb-6" placeholder="Reason for unlocking" value={reason} onChangeText={setReason} />

        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          disabled={!selectedClass || !reason}
          className={`py-3 rounded-xl items-center flex-row justify-center ${(!selectedClass || !reason) ? 'bg-orange-300' : 'bg-orange-500'}`}
        >
          <Unlock size={18} color="white" />
          <Text className="text-white font-bold ml-2">Unlock Day</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-center px-6">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4"><Text className="text-xl font-bold text-orange-700">Confirm Unlock</Text><TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={24} color="#71717a" /></TouchableOpacity></View>
            <Text className="text-zinc-600 mb-4">Type <Text className="font-bold text-zinc-900">{confPhrase}</Text> to unlock {selectedClass}.</Text>
            <TextInput className="bg-zinc-50 border border-zinc-300 rounded-xl p-4 text-base mb-6" placeholder={confPhrase} value={confirmationText} onChangeText={setConfirmationText} />
            <TouchableOpacity onPress={handleUnlock} disabled={isLoading || confirmationText.toLowerCase() !== confPhrase.toLowerCase()} className={`w-full py-4 rounded-xl items-center flex-row justify-center ${confirmationText.toLowerCase() === confPhrase.toLowerCase() ? 'bg-orange-500' : 'bg-orange-300'}`}>
              {isLoading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className="text-white font-bold text-lg">Confirm & Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}