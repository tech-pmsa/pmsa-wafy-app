import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert as NativeAlert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import {
  CalendarIcon,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  BedDouble,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';
import { COLORS } from '@/constants/theme';

interface StaffMember {
  id: string;
  name: string;
  designation: string | null;
}

interface AttendanceRecord {
  date: string;
  time_in: string | null;
  time_out: string | null;
  is_staying: boolean;
}

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

const formatTime12 = (time24: string | null): string => {
  if (!time24) return '-';

  try {
    const date = new Date(`1970-01-01T${time24}`);
    return format(date, 'hh:mm a');
  } catch {
    return 'Invalid Time';
  }
};

function StatusBadge({ record }: { record?: AttendanceRecord }) {
  if (record?.is_staying) {
    return (
      <View className="bg-[#7E22CE]/10 border border-[#7E22CE]/20 px-2.5 py-1.5 rounded-[8px] flex-row items-center">
        <BedDouble size={14} color="#7E22CE" />
        <Text className="text-[10px] font-muller-bold text-[#7E22CE] ml-1.5 tracking-wider uppercase">STAYING</Text>
      </View>
    );
  }

  if (record?.time_in || record?.time_out) {
    return (
      <View className="bg-[#16A34A]/10 border border-[#16A34A]/20 px-2.5 py-1.5 rounded-[8px] flex-row items-center">
        <CheckCircle2 size={14} color={COLORS.success} />
        <Text className="text-[10px] font-muller-bold text-[#16A34A] ml-1.5 tracking-wider uppercase">PRESENT</Text>
      </View>
    );
  }

  return (
    <View className="bg-[#DC2626]/10 border border-[#DC2626]/20 px-2.5 py-1.5 rounded-[8px] flex-row items-center">
      <XCircle size={14} color={COLORS.danger} />
      <Text className="text-[10px] font-muller-bold text-[#DC2626] ml-1.5 tracking-wider uppercase">ABSENT</Text>
    </View>
  );
}

export default function AllStaffRegister() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDataForDate = async () => {
      setLoading(true);

      const formattedDate = format(selectedDate, 'yyyy-MM-dd');

      const [{ data: staffData }, { data: attendanceData }] = await Promise.all([
        supabase.from('staff').select('*').eq('is_active', true).order('name'),
        supabase.from('staff_attendance').select('*').eq('date', formattedDate),
      ]);

      if (staffData) {
        setStaffList(staffData);
      } else {
        setStaffList([]);
      }

      if (attendanceData) {
        const recordsMap = attendanceData.reduce((acc, record: any) => {
          acc[record.staff_id] = record;
          return acc;
        }, {} as Record<string, AttendanceRecord>);

        setRecords(recordsMap);
      } else {
        setRecords({});
      }

      setLoading(false);
    };

    fetchDataForDate();
  }, [selectedDate]);

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staffList;

    return staffList.filter((staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setSelectedDate(date);
  };

  const handleExport = async () => {
    if (filteredStaff.length === 0) {
      NativeAlert.alert('Export Failed', 'No data to export for the selected day.');
      return;
    }

    try {
      const exportData = filteredStaff.map((staff) => {
        const record = records[staff.id];

        return {
          Name: staff.name,
          Designation: staff.designation || 'N/A',
          'Time In': record ? formatTime12(record.time_in) : 'Absent',
          'Time Out': record ? formatTime12(record.time_out) : 'Absent',
          Status: record?.is_staying ? 'Staying' : record ? 'Present' : 'Absent',
        };
      });

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Attendance');

      const wbout = write(workbook, { type: 'base64', bookType: 'xlsx' });

      const uri = `${FileSystem.cacheDirectory}Staff_Register_${format(
        selectedDate,
        'yyyy-MM-dd'
      )}.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Staff Register',
      });
    } catch (e) {
      NativeAlert.alert('Error', 'Failed to generate Excel file.');
      console.error(e);
    }
  };

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0]"
      style={cardShadow()}
    >
      <View className="mb-5">
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Daily Staff Register</Text>
        <Text className="text-sm font-muller text-[#475569] mt-1">
          Overview of staff attendance.
        </Text>
      </View>

      <View className="flex-row mb-5">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowDatePicker(true)}
          className="flex-1 flex-row items-center border border-[#E2E8F0] bg-[#F8FAFC] rounded-[14px] px-4 py-3.5 mr-3"
        >
          <CalendarIcon size={18} color="#475569" />
          <Text className="ml-2.5 text-[#0F172A] font-muller-bold text-[15px]">
            {format(selectedDate, 'PPP')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleExport}
          className="bg-[#1E40AF] rounded-[14px] px-5 py-3.5 flex-row items-center"
        >
          <Download size={18} color="white" />
          <Text className="text-white font-muller-bold ml-2 text-[15px]">Export</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      <View className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 mb-5 shadow-sm">
        <Search size={20} color="#94A3B8" />
        <TextInput
          className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
          placeholder="Search staff by name..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="mt-4 text-[#475569] font-muller font-medium">Loading register...</Text>
        </View>
      ) : filteredStaff.length === 0 ? (
        <View className="items-center py-12 border border-dashed border-[#E2E8F0] rounded-[16px] bg-[#F8FAFC]">
          <Search size={32} color="#94A3B8" />
          <Text className="mt-3 font-muller-bold text-[#0F172A]">No staff found.</Text>
        </View>
      ) : (
        <View className="pb-2">
          {filteredStaff.map((staff) => {
            const record = records[staff.id];

            return (
              <View
                key={staff.id}
                className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-[16px] p-4 flex-row items-center justify-between mb-3"
                style={cardShadow()}
              >
                <View className="flex-1">
                  <Text className="font-muller-bold text-[#0F172A] text-[15px] tracking-tight">{staff.name}</Text>
                  <Text className="text-xs font-muller text-[#475569] mt-0.5">
                    {staff.designation || 'N/A'}
                  </Text>

                  <View className="flex-row items-center mt-3">
                    <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-3 py-2 mr-2.5">
                      <Text className="text-[10px] uppercase text-[#94A3B8] font-muller-bold tracking-wider mb-1">
                        Time In
                      </Text>
                      <Text className="text-[13px] font-muller-bold text-[#0F172A]">
                        {formatTime12(record?.time_in || null)}
                      </Text>
                    </View>

                    <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] px-3 py-2">
                      <Text className="text-[10px] uppercase text-[#94A3B8] font-muller-bold tracking-wider mb-1">
                        Time Out
                      </Text>
                      <Text className="text-[13px] font-muller-bold text-[#0F172A]">
                        {formatTime12(record?.time_out || null)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="items-end pl-2">
                  <StatusBadge record={record} />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}