import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Alert as NativeAlert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { CalendarIcon, UserPlus, Download, Trash2, Save, Search, Clock, BedDouble, X, Edit, XCircle } from 'lucide-react-native';
import { Switch } from 'react-native';

// File system imports for Excel generation
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';
import { COLORS } from '@/constants/theme';

interface StaffMember { id: string; name: string; designation: string | null; }
interface AttendanceRecord { staff_id: string; date: string; time_in: string | null; time_out: string | null; is_staying: boolean; }

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

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

  // Add Staff Modal States
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffDesignation, setNewStaffDesignation] = useState('');

  // Edit Staff Modal States
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

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

  const handleUpdateStaff = async () => {
    if (!editingStaff || !editingStaff.name) return;
    const { error } = await supabase.from('staff')
      .update({ name: editingStaff.name, designation: editingStaff.designation })
      .eq('id', editingStaff.id);

    if (error) NativeAlert.alert("Error", error.message);
    else {
      NativeAlert.alert("Success", "Staff details updated.");
      setStaffList(prev => prev.map(s => s.id === editingStaff.id ? editingStaff : s).sort((a, b) => a.name.localeCompare(b.name)));
      setIsEditStaffOpen(false);
      setEditingStaff(null);
    }
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    NativeAlert.alert(
      "Remove Staff",
      `Are you sure you want to remove ${staff.name}? This will hide them from the active list.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: async () => {
            const { error } = await supabase.from('staff').update({ is_active: false }).eq('id', staff.id);
            if (error) NativeAlert.alert("Error", error.message);
            else {
              setStaffList(prev => prev.filter(s => s.id !== staff.id));
              NativeAlert.alert("Success", `${staff.name} removed.`);
            }
        }}
      ]
    );
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

  if (userLoading) return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
      <ActivityIndicator size="large" color={COLORS.primary} />
    </SafeAreaView>
  );

  if (role !== 'officer') return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
      <Text className="text-[#475569] font-muller">Access Denied.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="px-6 pt-4 pb-4">
        <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">Staff Register</Text>
        <Text className="text-[#475569] font-muller mt-1">Manage daily attendance for staff.</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Controls Card */}
        <View
          className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-5"
          style={cardShadow()}
        >
          <Text className="font-muller-bold text-[#0F172A] mb-4 text-lg tracking-tight">Controls</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center border border-[#E2E8F0] bg-[#F8FAFC] rounded-[14px] px-4 py-3.5 mb-4"
          >
            <CalendarIcon size={20} color="#475569" />
            <Text className="ml-3 text-[#0F172A] font-muller-bold">{format(selectedDate, 'PPP')}</Text>
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={selectedDate} mode="date" onChange={(e, d) => { setShowDatePicker(Platform.OS === 'ios'); if(d) setSelectedDate(d); }} />}

          <View className="flex-row gap-2.5 mb-4">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsAddStaffOpen(true)}
              className="flex-1 py-3.5 rounded-[14px] border border-[#E2E8F0] flex-row items-center justify-center bg-[#F8FAFC]"
            >
              <UserPlus size={18} color="#0F172A" />
              <Text className="font-muller-bold text-[#0F172A] ml-2">Add Staff</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleExport}
              className="flex-1 py-3.5 rounded-[14px] border border-[#E2E8F0] flex-row items-center justify-center bg-[#F8FAFC]"
            >
              <Download size={18} color="#0F172A" />
              <Text className="font-muller-bold text-[#0F172A] ml-2">Export Month</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSaveAll}
            disabled={isSaving}
            className={`w-full py-4 rounded-[14px] flex-row justify-center items-center ${isSaving ? 'bg-[#1E40AF]/60' : 'bg-[#1E40AF]'}`}
          >
            {isSaving ? <ActivityIndicator color="white" className="mr-2" /> : <Save size={18} color="white" className="mr-2.5" />}
            <Text className="text-white font-muller-bold text-lg tracking-wide">Save All Changes</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 shadow-sm mb-5"
          style={cardShadow()}
        >
          <Search size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
            placeholder="Search staff..."
            placeholderTextColor="#94A3B8"
            value={searchQuery} onChangeText={setSearchQuery}
          />
        </View>

        {/* List */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} className="my-10" />
        ) : (
          <View className="space-y-3.5 mb-6">
            {filteredStaff.map(staff => {
              const record = attendanceRecords[staff.id] || {};
              const formatDisplayTime = (t: string | null) => t ? format(parse(t, 'HH:mm:ss', new Date()), 'hh:mm a') : 'Set Time';

              return (
                <View
                  key={staff.id}
                  className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] p-4 shadow-sm"
                  style={cardShadow()}
                >

                  {/* Header Row with Edit/Delete Buttons */}
                  <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1">
                      <Text className="font-muller-bold text-[#0F172A] text-lg tracking-tight mb-1">{staff.name}</Text>
                      <Text className="text-[13px] font-muller text-[#475569]">{staff.designation}</Text>
                    </View>
                    <View className="flex-row items-center gap-4 pl-2 mt-1">
                      <TouchableOpacity activeOpacity={0.6} onPress={() => { setEditingStaff(staff); setIsEditStaffOpen(true); }}>
                        <Edit size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.6} onPress={() => handleDeleteStaff(staff)}>
                        <Trash2 size={20} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-end gap-3 border-t border-[#E2E8F0] pt-4">
                    {/* IN TIME BLOCK WITH CLEAR BUTTON */}
                    <View className="flex-1">
                      <Text className="text-[11px] font-muller-bold text-[#94A3B8] mb-1.5 flex-row items-center uppercase tracking-wider">
                        <Clock size={12} color="#94A3B8"/> In Time
                      </Text>
                      <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px]">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setActiveTimePicker({ staffId: staff.id, field: 'time_in', currentValue: record.time_in ? parse(record.time_in, 'HH:mm:ss', new Date()) : new Date() })}
                          className="flex-1 py-3 pl-3"
                        >
                          <Text className={`font-muller-bold text-xs ${record.time_in ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                            {formatDisplayTime(record.time_in)}
                          </Text>
                        </TouchableOpacity>
                        {record.time_in && (
                          <TouchableOpacity onPress={() => handleAttendanceChange(staff.id, 'time_in', null)} className="px-2 py-3">
                            <XCircle size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* OUT TIME BLOCK WITH CLEAR BUTTON */}
                    <View className="flex-1">
                      <Text className="text-[11px] font-muller-bold text-[#94A3B8] mb-1.5 flex-row items-center uppercase tracking-wider">
                        <Clock size={12} color="#94A3B8"/> Out Time
                      </Text>
                      <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px]">
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setActiveTimePicker({ staffId: staff.id, field: 'time_out', currentValue: record.time_out ? parse(record.time_out, 'HH:mm:ss', new Date()) : new Date() })}
                          className="flex-1 py-3 pl-3"
                        >
                          <Text className={`font-muller-bold text-xs ${record.time_out ? 'text-[#0F172A]' : 'text-[#94A3B8]'}`}>
                            {formatDisplayTime(record.time_out)}
                          </Text>
                        </TouchableOpacity>
                        {record.time_out && (
                          <TouchableOpacity onPress={() => handleAttendanceChange(staff.id, 'time_out', null)} className="px-2 py-3">
                            <XCircle size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* STAYING TOGGLE */}
                    <View className="items-center px-1">
                      <Text className="text-[11px] font-muller-bold text-[#94A3B8] mb-2 uppercase tracking-wider">
                        <BedDouble size={12} color="#94A3B8"/> Staying
                      </Text>
                      <Switch
                        value={record.is_staying || false}
                        onValueChange={v => handleAttendanceChange(staff.id, 'is_staying', v)}
                        trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Danger Zone */}
        <View className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-[18px] p-5 mb-6">
          <View className="flex-row items-center mb-3">
            <Trash2 size={24} color={COLORS.danger} />
            <Text className="text-lg font-muller-bold text-[#DC2626] ml-3 tracking-tight">Delete Month's Data</Text>
          </View>
          <Text className="text-sm font-muller text-[#DC2626]/80 mb-5">
            Permanently delete all attendance records for {format(selectedDate, 'MMMM yyyy')}.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDeleteMonthData}
            className="bg-[#DC2626] py-3.5 rounded-[14px] items-center"
          >
            <Text className="text-white font-muller-bold tracking-wide">Delete Records</Text>
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
         <View className="absolute bottom-0 w-full bg-[#FFFFFF] border-t border-[#E2E8F0] pb-8 pt-5 px-5 shadow-xl">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTimePicker(null)}
              className="w-full bg-[#1E40AF] py-4 rounded-[14px] items-center"
            >
              <Text className="text-white font-muller-bold text-[16px] tracking-wide">Confirm Time</Text>
            </TouchableOpacity>
         </View>
      )}

      {/* Add Staff Modal */}
      <Modal visible={isAddStaffOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsAddStaffOpen(false)}>
        <View className="flex-1 bg-[#F8FAFC] pt-6 px-6">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">Add Staff Member</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsAddStaffOpen(false)}
              className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-muller-bold text-[#475569] mb-2 ml-1">Full Name</Text>
              <TextInput
                className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[16px] shadow-sm"
                value={newStaffName}
                onChangeText={setNewStaffName}
              />
            </View>
            <View>
              <Text className="text-sm font-muller-bold text-[#475569] mb-2 ml-1">Designation</Text>
              <TextInput
                className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[16px] shadow-sm"
                placeholder="e.g. Principal"
                placeholderTextColor="#94A3B8"
                value={newStaffDesignation}
                onChangeText={setNewStaffDesignation}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddNewStaff}
              disabled={!newStaffName}
              className={`w-full py-4 rounded-[14px] items-center mt-5 ${!newStaffName ? 'bg-[#E2E8F0]' : 'bg-[#1E40AF]'}`}
            >
              <Text className={`font-muller-bold text-[16px] tracking-wide ${!newStaffName ? 'text-[#94A3B8]' : 'text-white'}`}>
                Add Staff
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal visible={isEditStaffOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {setIsEditStaffOpen(false); setEditingStaff(null);}}>
        <View className="flex-1 bg-[#F8FAFC] pt-6 px-6">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">Edit Staff Details</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {setIsEditStaffOpen(false); setEditingStaff(null);}}
              className="bg-[#E2E8F0]/60 p-2.5 rounded-full"
            >
              <X size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {editingStaff && (
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-muller-bold text-[#475569] mb-2 ml-1">Full Name</Text>
                <TextInput
                  className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[16px] shadow-sm"
                  value={editingStaff.name}
                  onChangeText={(text) => setEditingStaff({...editingStaff, name: text})}
                />
              </View>
              <View>
                <Text className="text-sm font-muller-bold text-[#475569] mb-2 ml-1">Designation</Text>
                <TextInput
                  className="bg-[#FFFFFF] border border-[#E2E8F0] font-muller text-[#0F172A] rounded-[14px] p-4 text-[16px] shadow-sm"
                  placeholder="e.g. Principal"
                  placeholderTextColor="#94A3B8"
                  value={editingStaff.designation || ''}
                  onChangeText={(text) => setEditingStaff({...editingStaff, designation: text})}
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleUpdateStaff}
                disabled={!editingStaff.name}
                className={`w-full py-4 rounded-[14px] items-center mt-5 ${!editingStaff.name ? 'bg-[#E2E8F0]' : 'bg-[#1E40AF]'}`}
              >
                <Text className={`font-muller-bold text-[16px] tracking-wide ${!editingStaff.name ? 'text-[#94A3B8]' : 'text-white'}`}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
}