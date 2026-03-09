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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
      <View className="bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md flex-row items-center">
        <BedDouble size={14} color="#7e22ce" />
        <Text className="text-[10px] font-bold text-purple-700 ml-1">STAYING</Text>
      </View>
    );
  }

  if (record?.time_in || record?.time_out) {
    return (
      <View className="bg-green-100 border border-green-200 px-2.5 py-1 rounded-md flex-row items-center">
        <CheckCircle2 size={14} color="#15803d" />
        <Text className="text-[10px] font-bold text-green-700 ml-1">PRESENT</Text>
      </View>
    );
  }

  return (
    <View className="bg-red-100 border border-red-200 px-2.5 py-1 rounded-md flex-row items-center">
      <XCircle size={14} color="#b91c1c" />
      <Text className="text-[10px] font-bold text-red-700 ml-1">ABSENT</Text>
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
      className="bg-white rounded-3xl p-5 border border-zinc-200"
      style={cardShadow()}
    >
      <View className="mb-4">
        <Text className="text-xl font-bold text-zinc-900">Daily Staff Register</Text>
        <Text className="text-sm text-zinc-500 mt-1">
          Overview of staff attendance.
        </Text>
      </View>

      <View className="flex-row mb-4">
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          className="flex-1 flex-row items-center border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-3 mr-2"
        >
          <CalendarIcon size={16} color="#71717a" />
          <Text className="ml-2 text-zinc-900 font-medium">
            {format(selectedDate, 'PPP')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExport}
          className="bg-zinc-900 rounded-xl px-4 py-3 flex-row items-center"
        >
          <Download size={16} color="white" />
          <Text className="text-white font-bold ml-2">Export</Text>
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

      <View className="flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4">
        <Search size={20} color="#a1a1aa" />
        <TextInput
          className="flex-1 ml-2 text-base text-zinc-900"
          placeholder="Search staff by name..."
          placeholderTextColor="#a1a1aa"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <View className="py-10 items-center">
          <ActivityIndicator size="large" color="#09090b" />
        </View>
      ) : filteredStaff.length === 0 ? (
        <View className="items-center py-10 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
          <Search size={32} color="#a1a1aa" />
          <Text className="mt-2 font-semibold text-zinc-700">No staff found.</Text>
        </View>
      ) : (
        <View className="pb-4">
          {filteredStaff.map((staff) => {
            const record = records[staff.id];

            return (
              <View
                key={staff.id}
                className="bg-white border border-zinc-200 rounded-xl p-4 flex-row items-center justify-between mb-3"
                style={cardShadow()}
              >
                <View className="flex-1">
                  <Text className="font-bold text-zinc-900">{staff.name}</Text>
                  <Text className="text-xs text-zinc-500">
                    {staff.designation || 'N/A'}
                  </Text>

                  <View className="flex-row items-center mt-2">
                    <View>
                      <Text className="text-[10px] uppercase text-zinc-400 font-bold mb-0.5">
                        Time In
                      </Text>
                      <Text className="text-sm font-medium text-zinc-700">
                        {formatTime12(record?.time_in || null)}
                      </Text>
                    </View>

                    <View style={{ marginLeft: 16 }}>
                      <Text className="text-[10px] uppercase text-zinc-400 font-bold mb-0.5">
                        Time Out
                      </Text>
                      <Text className="text-sm font-medium text-zinc-700">
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