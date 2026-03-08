import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert as NativeAlert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { CalendarIcon, UserPlus, Download, Trash2, Save, Search, Clock, BedDouble, X } from 'lucide-react-native';
import { Switch } from 'react-native';

// File system imports for Excel generation
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';

interface StaffMember { id: string; name: string; designation: string | null; }
interface AttendanceRecord { staff_id: string; date: string; time_in: string | null; time_out: string | null; is_staying: boolean; }

export default function StaffRegisterPage() {
  const { role, loading: userLoading } = useUserData();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});

  // Date States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time Picker States
  const [activeTimePicker, setActiveTimePicker] = useState<{ staffId: string, field: 'time_in' | 'time_out', currentValue: Date } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffDesignation, setNewStaffDesignation] = useState('');

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const [{ data: staffData }, { data: attendanceData }] = await Promise.all([
      supabase.from('staff').select('*').eq('is_active', true).order('name'),
      supabase.from('staff_attendance').select('*').eq('date', formattedDate)
    ]);

    if (staffData) setStaffList(staffData);
    if (attendanceData) {
      const recordsMap = attendanceData.reduce((acc, record) => { acc[record.staff_id] = record; return acc; }, {} as Record<string, AttendanceRecord>);
      setAttendanceRecords(recordsMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(selectedDate); }, [selectedDate, fetchData]);

  const handleAttendanceChange = (staffId: string, field: 'time_in' | 'time_out' | 'is_staying', value: string | boolean | null) => {
    const existingRecord = attendanceRecords[staffId] || { staff_id: staffId, date: format(selectedDate, 'yyyy-MM-dd'), time_in: null, time_out: null, is_staying: false };
    const updatedRecord = { ...existingRecord, [field]: value };
    setAttendanceRecords(prev => ({ ...prev, [staffId]: updatedRecord as AttendanceRecord }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const recordsToUpsert = Object.values(attendanceRecords);
    if (recordsToUpsert.length === 0) {
      NativeAlert.alert("Notice", "No changes to save.");
      setIsSaving(false); return;
    }
    const { error } = await supabase.from('staff_attendance').upsert(recordsToUpsert, { onConflict: 'staff_id,date' });
    if (error) NativeAlert.alert("Error", error.message);
    else NativeAlert.alert("Success", "Attendance saved successfully!");
    setIsSaving(false);
  };

  const handleAddNewStaff = async () => {
    if(!newStaffName) return;
    const { data, error } = await supabase.from('staff').insert({ name: newStaffName, designation: newStaffDesignation }).select().single();
    if(error) NativeAlert.alert("Error", error.message);
    else if (data) {
      NativeAlert.alert("Success", `${data.name} added to staff list.`);
      setStaffList(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewStaffName(''); setNewStaffDesignation(''); setIsAddStaffOpen(false);
    }
  };

  const handleExport = async () => {
    try {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const { data, error } = await supabase.from('staff_attendance')
        .select('date, time_in, time_out, is_staying, staff(name, designation)')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error || !data || data.length === 0) return NativeAlert.alert("Notice", "No data available to export for this month.");

      const formatTimeForExport = (time: string | null, isStaying: boolean) => {
        if (time) return format(parse(time, 'HH:mm:ss', new Date()), 'hh:mm a');
        if (isStaying) return 'Staying';
        return '';
      };

      const exportData = data.map(rec => ({
        Date: format(new Date(rec.date), 'dd-MM-yyyy'),
        Name: (rec.staff as any).name,
        Designation: (rec.staff as any).designation,
        "Time In": formatTimeForExport(rec.time_in, rec.is_staying),
        "Time Out": formatTimeForExport(rec.time_out, rec.is_staying)
      }));

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Attendance');
      const wbout = write(workbook, { type: 'base64', bookType: 'xlsx' });

      const uri = `${FileSystem.cacheDirectory}Staff_Attendance_${format(selectedDate, 'MMM_yyyy')}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { dialogTitle: 'Export Staff Register' });

    } catch (e: any) {
      NativeAlert.alert("Export Failed", e.message);
    }
  };

  const handleDeleteMonthData = () => {
    NativeAlert.alert(
      "Confirm Delete",
      `Delete all records for ${format(selectedDate, 'MMMM yyyy')}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
            const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
            const { error } = await supabase.from('staff_attendance').delete().gte('date', monthStart).lte('date', monthEnd);
            if (error) NativeAlert.alert("Error", error.message);
            else { NativeAlert.alert("Deleted", "Data cleared."); fetchData(selectedDate); }
        }}
      ]
    );
  };

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffList;
    return staffList.filter(staff => staff.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [staffList, searchQuery]);

  if (userLoading) return <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center"><ActivityIndicator size="large" color="#09090b" /></SafeAreaView>;
  if (role !== 'officer') return <SafeAreaView className="flex-1 bg-zinc-100 justify-center items-center"><Text>Access Denied.</Text></SafeAreaView>;

  return (
    <SafeAreaView className="flex-1 bg-zinc-100" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-bold text-zinc-900">Staff Register</Text>
        <Text className="text-zinc-500 mt-1">Manage daily attendance for staff.</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Controls Card */}
        <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 mb-4">
          <Text className="font-bold text-zinc-900 mb-4 text-lg">Controls</Text>

          <TouchableOpacity onPress={() => setShowDatePicker(true)} className="flex-row items-center border border-zinc-200 bg-zinc-50 rounded-xl px-4 py-3 mb-4">
            <CalendarIcon size={20} color="#71717a" />
            <Text className="ml-3 text-zinc-900 font-semibold">{format(selectedDate, 'PPP')}</Text>
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={selectedDate} mode="date" onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setSelectedDate(d); }} />}

          <View className="flex-row gap-2 mb-4">
            <TouchableOpacity onPress={() => setIsAddStaffOpen(true)} className="flex-1 py-3 rounded-xl border border-zinc-300 flex-row items-center justify-center bg-zinc-50">
              <UserPlus size={16} color="#09090b" /><Text className="font-bold text-zinc-900 ml-2">Add Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleExport} className="flex-1 py-3 rounded-xl border border-zinc-300 flex-row items-center justify-center bg-zinc-50">
              <Download size={16} color="#09090b" /><Text className="font-bold text-zinc-900 ml-2">Export Month</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleSaveAll} disabled={isSaving} className="w-full py-4 rounded-xl flex-row justify-center items-center bg-zinc-900">
            {isSaving ? <ActivityIndicator color="white" className="mr-2" /> : <Save size={18} color="white" className="mr-2" />}
            <Text className="text-white font-bold text-lg">Save All Changes</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm mb-4">
          <Search size={20} color="#a1a1aa" />
          <TextInput
            className="flex-1 ml-2 text-base text-zinc-900"
            placeholder="Search staff..."
            value={searchQuery} onChangeText={setSearchQuery}
          />
        </View>

        {/* List */}
        {loading ? <ActivityIndicator size="large" color="#09090b" className="my-10" /> : (
          <View className="space-y-3 mb-6">
            {filteredStaff.map(staff => {
              const record = attendanceRecords[staff.id] || {};
              const formatDisplayTime = (t: string | null) => t ? format(parse(t, 'HH:mm:ss', new Date()), 'hh:mm a') : 'Set Time';

              return (
                <View key={staff.id} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                  <Text className="font-bold text-zinc-900 text-lg mb-1">{staff.name}</Text>
                  <Text className="text-sm text-zinc-500 mb-4">{staff.designation}</Text>

                  <View className="flex-row items-end gap-3">
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-zinc-500 mb-1 flex-row items-center"><Clock size={12} color="#71717a"/> IN Time</Text>
                      <TouchableOpacity
                        onPress={() => setActiveTimePicker({ staffId: staff.id, field: 'time_in', currentValue: record.time_in ? parse(record.time_in, 'HH:mm:ss', new Date()) : new Date() })}
                        className="bg-zinc-50 border border-zinc-200 py-2.5 rounded-lg items-center"
                      >
                        <Text className={`font-semibold ${record.time_in ? 'text-zinc-900' : 'text-zinc-400'}`}>{formatDisplayTime(record.time_in)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-bold text-zinc-500 mb-1 flex-row items-center"><Clock size={12} color="#71717a"/> OUT Time</Text>
                      <TouchableOpacity
                        onPress={() => setActiveTimePicker({ staffId: staff.id, field: 'time_out', currentValue: record.time_out ? parse(record.time_out, 'HH:mm:ss', new Date()) : new Date() })}
                        className="bg-zinc-50 border border-zinc-200 py-2.5 rounded-lg items-center"
                      >
                        <Text className={`font-semibold ${record.time_out ? 'text-zinc-900' : 'text-zinc-400'}`}>{formatDisplayTime(record.time_out)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="items-center px-2">
                      <Text className="text-xs font-bold text-zinc-500 mb-2"><BedDouble size={12} color="#71717a"/> Staying</Text>
                      <Switch value={record.is_staying || false} onValueChange={v => handleAttendanceChange(staff.id, 'is_staying', v)} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Danger Zone */}
        <View className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center mb-4">
            <Trash2 size={24} color="#dc2626" />
            <Text className="text-lg font-bold text-red-700 ml-3">Delete Month's Data</Text>
          </View>
          <Text className="text-sm text-red-600 mb-4">Permanently delete all attendance records for {format(selectedDate, 'MMMM yyyy')}.</Text>
          <TouchableOpacity onPress={handleDeleteMonthData} className="bg-red-600 py-3 rounded-xl items-center shadow-sm">
            <Text className="text-white font-bold">Delete Records</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Global Time Picker Overlay */}
      {activeTimePicker && (
        <DateTimePicker
          value={activeTimePicker.currentValue}
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            if (Platform.OS === 'android') setActiveTimePicker(null);
            if (date) {
              handleAttendanceChange(activeTimePicker.staffId, activeTimePicker.field, format(date, 'HH:mm:ss'));
            }
          }}
        />
      )}
      {/* iOS Done button for the spinner */}
      {Platform.OS === 'ios' && activeTimePicker && (
         <View className="absolute bottom-0 w-full bg-white border-t border-zinc-200 pb-8 pt-4 px-4 shadow-xl">
            <TouchableOpacity onPress={() => setActiveTimePicker(null)} className="w-full bg-blue-600 py-4 rounded-xl items-center">
              <Text className="text-white font-bold text-lg">Confirm Time</Text>
            </TouchableOpacity>
         </View>
      )}

      {/* Add Staff Modal */}
      <Modal visible={isAddStaffOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsAddStaffOpen(false)}>
        <View className="flex-1 bg-zinc-100 pt-6 px-6">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-2xl font-bold text-zinc-900">Add Staff Member</Text>
            <TouchableOpacity onPress={() => setIsAddStaffOpen(false)} className="bg-zinc-200 p-2 rounded-full"><X size={20} color="#09090b" /></TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Full Name</Text>
              <TextInput className="bg-white border border-zinc-200 rounded-xl p-4 text-base" value={newStaffName} onChangeText={setNewStaffName} />
            </View>
            <View>
              <Text className="text-sm font-medium text-zinc-700 mb-1">Designation</Text>
              <TextInput className="bg-white border border-zinc-200 rounded-xl p-4 text-base" placeholder="e.g. Principal" value={newStaffDesignation} onChangeText={setNewStaffDesignation} />
            </View>
            <TouchableOpacity onPress={handleAddNewStaff} disabled={!newStaffName} className={`w-full py-4 rounded-xl items-center mt-4 ${!newStaffName ? 'bg-zinc-300' : 'bg-zinc-900'}`}>
              <Text className="text-white font-bold text-lg">Add Staff</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}