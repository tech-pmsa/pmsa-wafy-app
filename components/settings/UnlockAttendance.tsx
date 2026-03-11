import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { AlertTriangle, CalendarIcon, Unlock, X } from 'lucide-react-native';
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
      <View
        className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[16px] p-5 shadow-sm"
        style={cardShadow()}
      >
        <View className="flex-row items-center mb-5">
          <View className="bg-[#D97706]/10 p-2.5 rounded-[12px] border border-[#D97706]/20">
            <AlertTriangle size={20} color={COLORS.warning} />
          </View>
          <Text className="text-lg font-muller-bold text-[#D97706] ml-3 tracking-tight">Unlock Attendance</Text>
        </View>

        <Text className="text-[13px] font-muller-bold text-[#475569] mb-2 ml-1">Select Class</Text>
        <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] overflow-hidden mb-5">
          <Picker
            selectedValue={selectedClass}
            onValueChange={setSelectedClass}
            style={{ color: '#0F172A' }}
          >
            <Picker.Item label="Select class..." value="" color="#94A3B8" />
            {classes.map(cls => <Picker.Item key={cls} label={cls} value={cls} color="#0F172A" />)}
          </Picker>
        </View>

        <Text className="text-[13px] font-muller-bold text-[#475569] mb-2 ml-1">Select Date</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 mb-5"
        >
          <CalendarIcon size={18} color="#475569" />
          <Text className="ml-3 text-[#0F172A] font-muller-bold text-[15px]">{format(selectedDate, 'PPP')}</Text>
        </TouchableOpacity>
        {showDatePicker && <DateTimePicker value={selectedDate} mode="date" maximumDate={new Date()} onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setSelectedDate(d); }} />}

        <Text className="text-[13px] font-muller-bold text-[#475569] mb-2 ml-1">Reason</Text>
        <TextInput
          className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[15px] mb-6"
          placeholder="Reason for unlocking"
          placeholderTextColor="#94A3B8"
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          disabled={!selectedClass || !reason}
          activeOpacity={0.8}
          className={`py-3.5 rounded-[14px] items-center flex-row justify-center ${(!selectedClass || !reason) ? 'bg-[#E2E8F0]' : 'bg-[#D97706]'}`}
        >
          <Unlock size={18} color={(!selectedClass || !reason) ? '#94A3B8' : 'white'} />
          <Text className={`font-muller-bold ml-2 text-[15px] tracking-wide ${(!selectedClass || !reason) ? 'text-[#94A3B8]' : 'text-white'}`}>
            Unlock Day
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center px-6">
          <View
            className="bg-[#FFFFFF] rounded-[20px] p-6 shadow-xl border border-[#E2E8F0]"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-muller-bold text-[#D97706] tracking-tight">Confirm Unlock</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsModalOpen(false)}
                className="bg-[#F1F5F9] p-2.5 rounded-full"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <Text className="text-[#475569] font-muller text-[15px] mb-5 leading-relaxed">
              Type <Text className="font-muller-bold text-[#0F172A]">{confPhrase}</Text> to unlock {selectedClass}.
            </Text>

            <TextInput
              className="bg-[#F8FAFC] border border-[#E2E8F0] font-muller-bold text-[#0F172A] rounded-[14px] p-4 text-[15px] mb-6"
              placeholder={confPhrase}
              placeholderTextColor="#94A3B8"
              value={confirmationText}
              onChangeText={setConfirmationText}
            />

            <TouchableOpacity
              onPress={handleUnlock}
              activeOpacity={0.8}
              disabled={isLoading || confirmationText.toLowerCase() !== confPhrase.toLowerCase()}
              className={`w-full py-4 rounded-[14px] items-center flex-row justify-center ${
                confirmationText.toLowerCase() === confPhrase.toLowerCase() ? 'bg-[#D97706]' : 'bg-[#E2E8F0]'
              }`}
            >
              {isLoading && <ActivityIndicator color="white" className="mr-2" />}
              <Text className={`font-muller-bold text-[16px] tracking-wide ${
                confirmationText.toLowerCase() === confPhrase.toLowerCase() ? 'text-white' : 'text-[#94A3B8]'
              }`}>
                Confirm & Unlock
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}