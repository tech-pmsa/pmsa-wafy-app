import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, Alert as NativeAlert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { CalendarIcon, Check, X, UserCheck, UserX, Lock, Save, Search, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

// Type Definitions
interface Student { uid: string; name: string; }
interface PeriodDetail {
  status: 'Present' | 'Absent';
  reason?: 'Home' | 'Medical' | 'Cic Related' | 'Wsf Related' | 'Exam Related';
  description?: string;
}
interface AttendanceRecord { [period: string]: PeriodDetail }
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const absenceReasons = ['Home', 'Medical', 'Cic Related', 'Wsf Related', 'Exam Related'];
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

export default function AttendanceForm() {
  const { details, loading: userLoading } = useUserData();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<{ [uid: string]: AttendanceRecord }>({});

  // Date & Config States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLeaveDay, setIsLeaveDay] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reason Modal States
  const [modalState, setModalState] = useState<{ isOpen: boolean; studentUid: string | null; period: string | null; }>({ isOpen: false, studentUid: null, period: null });
  const [reasonDraft, setReasonDraft] = useState<PeriodDetail['reason']>('Home');
  const [descDraft, setDescDraft] = useState('');
  const [lastReasons, setLastReasons] = useState<{ [uid: string]: PeriodDetail }>({});

  const classId = useMemo(() => details?.designation?.replace(' Class', ''), [details]);

  // Data Fetching logic matches web exactly
  const fetchDataForDate = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const [{ data: studentsData }, { data: attendanceData }] = await Promise.all([
      supabase.from('students').select('uid, name').eq('class_id', classId).order('name'),
      supabase.from('attendance').select('*').eq('class_id', classId).eq('date', dateStr)
    ]);

    if (studentsData) {
      setStudents(studentsData);
      const initialAttendance: { [uid: string]: AttendanceRecord } = {};
      const initialLastReasons: { [uid: string]: PeriodDetail } = {};

      setIsLocked(attendanceData?.[0]?.status_locked || false);
      setIsLeaveDay(attendanceData?.[0]?.is_leave_day || false);

      studentsData.forEach(student => {
        const record = attendanceData?.find(att => att.student_uid === student.uid);
        if (record) {
          initialAttendance[student.uid] = periods.reduce((acc, p) => ({ ...acc, [p]: record[p] || { status: 'Present' } }), {});
          const lastReason = periods.map(p => record[p]).find(p => p?.status === 'Absent');
          if (lastReason) initialLastReasons[student.uid] = lastReason;
        } else {
          initialAttendance[student.uid] = periods.reduce((acc, p) => ({ ...acc, [p]: { status: 'Present' } }), {});
        }
      });
      setAttendance(initialAttendance);
      setLastReasons(initialLastReasons);
    }
    setLoading(false);
  }, [classId, selectedDate]);

  useEffect(() => { if (!userLoading && classId) fetchDataForDate(); }, [userLoading, fetchDataForDate, classId]);

  // Derived State
  const filteredStudents = useMemo(() => students.filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, searchTerm]);

  const attendanceSummary = useMemo(() => {
    const presentCount = students.filter(student => {
      const studentAttendance = attendance[student.uid];
      return studentAttendance && Object.values(studentAttendance).some(p => p.status === 'Present' || excusedAbsences.includes(p.reason || ''));
    }).length;
    return { present: presentCount, absent: students.length - presentCount };
  }, [attendance, students]);

  // Handlers
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) setSelectedDate(date);
  };

  const openReasonModal = (uid: string, period: string | null) => {
    const lastReason = lastReasons[uid];
    setReasonDraft(lastReason?.reason || 'Home');
    setDescDraft(lastReason?.description || '');
    setModalState({ isOpen: true, studentUid: uid, period });
  };

  const handlePeriodClick = (uid: string, period: string) => {
    if (isLocked || isLeaveDay) return;
    const currentStatus = attendance[uid][period];
    if (currentStatus.status === 'Present') {
      openReasonModal(uid, period);
    } else {
      setAttendance(prev => ({ ...prev, [uid]: { ...prev[uid], [period]: { status: 'Present' } } }));
    }
  };

  const markAll = (uid: string, isPresent: boolean) => {
    if (isLocked || isLeaveDay) return;
    if (isPresent) {
      const newRecord: AttendanceRecord = {};
      periods.forEach(p => newRecord[p] = { status: 'Present' });
      setAttendance(prev => ({ ...prev, [uid]: newRecord }));
    } else {
      openReasonModal(uid, 'all');
    }
  };

  const saveAbsence = () => {
    const { studentUid, period } = modalState;
    if (!studentUid) return;

    const newReason: PeriodDetail = { status: 'Absent', reason: reasonDraft, description: descDraft };

    if (period === 'all') {
      const newRecord: AttendanceRecord = {};
      periods.forEach(p => newRecord[p] = newReason);
      setAttendance(prev => ({ ...prev, [studentUid]: newRecord }));
    } else if (period) {
      setAttendance(prev => ({ ...prev, [studentUid]: { ...prev[studentUid], [period]: newReason } }));
    }

    setLastReasons(prev => ({ ...prev, [studentUid]: newReason }));
    setModalState({ isOpen: false, studentUid: null, period: null });
  };

  const handleSubmission = async (shouldLock: boolean) => {
    if (!classId) return NativeAlert.alert("Error", "Class ID is missing.");
    if (shouldLock) setIsLocking(true); else setIsUpdating(true);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const updates = students.map(student => {
      const studentAttendance = attendance[student.uid];
      const record: any = { student_uid: student.uid, date: dateStr, class_id: classId, is_leave_day: isLeaveDay, status_locked: shouldLock };
      for (const p of periods) { record[p] = studentAttendance[p]; }
      return record;
    });

    const { error } = await supabase.from("attendance").upsert(updates, { onConflict: "student_uid,date" });

    if (!error) {
      NativeAlert.alert("Success", `Attendance has been ${shouldLock ? 'locked' : 'updated'}.`);
      if (shouldLock) setIsLocked(true);
    } else {
      NativeAlert.alert("Error", error.message);
    }

    if (shouldLock) setIsLocking(false); else setIsUpdating(false);
  };

  if (userLoading || loading) {
    return <ActivityIndicator size="large" color="#09090b" className="my-10" />;
  }

  return (
    <View className="space-y-6">
      {/* --- Controls Panel --- */}
      <View className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-5">
        <Text className="font-bold text-zinc-900 text-lg mb-4">Controls</Text>

        <View className="flex-row space-x-4 mb-4">
          <View className="flex-1">
            <Text className="text-xs font-medium text-zinc-500 mb-1">Select Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-3"
            >
              <CalendarIcon size={16} color="#71717a" />
              <Text className="ml-2 text-zinc-900">{format(selectedDate, 'PPP')}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-xs font-medium text-zinc-500 mb-1">Day Type</Text>
            <TouchableOpacity
              onPress={() => !isLocked && setIsLeaveDay(!isLeaveDay)}
              className={`border rounded-xl px-3 py-3 ${isLeaveDay ? 'border-blue-200 bg-blue-50' : 'border-zinc-200 bg-zinc-50'}`}
              disabled={isLocked}
            >
              <Text className={`font-medium ${isLeaveDay ? 'text-blue-700' : 'text-zinc-900'}`}>
                {isLeaveDay ? 'Leave Day' : 'Working Day'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker value={selectedDate} mode="date" maximumDate={new Date()} onChange={handleDateChange} />
        )}

        {/* Stats Row */}
        <View className="flex-row gap-2 mt-2">
          <View className="flex-1 bg-green-50 border border-green-200 rounded-2xl p-4 items-center flex-row justify-center">
            <UserCheck size={24} color="#16a34a" />
            <View className="ml-3">
              <Text className="text-2xl font-bold text-green-700">{attendanceSummary.present}</Text>
              <Text className="text-xs font-medium text-green-600">Present</Text>
            </View>
          </View>
          <View className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-4 items-center flex-row justify-center">
            <UserX size={24} color="#dc2626" />
            <View className="ml-3">
              <Text className="text-2xl font-bold text-red-700">{attendanceSummary.absent}</Text>
              <Text className="text-xs font-medium text-red-600">Absent</Text>
            </View>
          </View>
        </View>
      </View>

      {isLocked && (
        <View className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex-row items-center">
          <Lock size={20} color="#2563eb" />
          <Text className="ml-2 text-blue-700 flex-1">Attendance for this date has been finalized and locked.</Text>
        </View>
      )}

      {/* --- Search --- */}
      <View className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm">
        <Search size={20} color="#a1a1aa" />
        <TextInput
          className="flex-1 ml-2 text-base text-zinc-900"
          placeholder="Search for a student..."
          placeholderTextColor="#a1a1aa"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* --- Student List (Custom Accordion) --- */}
      <View className={`space-y-3 pb-4 ${isLocked || isLeaveDay ? 'opacity-60' : ''}`}>
        {filteredStudents.map(student => {
          const isExpanded = expandedId === student.uid;
          const studentAttendance = attendance[student.uid];

          return (
            <View key={student.uid} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <TouchableOpacity
                activeOpacity={isLocked || isLeaveDay ? 1 : 0.7}
                onPress={() => !(isLocked || isLeaveDay) && setExpandedId(isExpanded ? null : student.uid)}
                className="p-4"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-bold text-zinc-900 text-lg flex-1">{student.name}</Text>
                  {isExpanded ? <ChevronUp size={24} color="#71717a" /> : <ChevronDown size={24} color="#71717a" />}
                </View>

                {/* Quick Action Buttons visible even when collapsed */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); markAll(student.uid, true); }}
                    disabled={isLocked || isLeaveDay}
                    className="flex-1 bg-zinc-100 py-2 rounded-lg flex-row justify-center items-center border border-zinc-200"
                  >
                    <Check size={16} color="#09090b" />
                    <Text className="ml-1 text-xs font-semibold text-zinc-900">All Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); markAll(student.uid, false); }}
                    disabled={isLocked || isLeaveDay}
                    className="flex-1 bg-zinc-100 py-2 rounded-lg flex-row justify-center items-center border border-zinc-200"
                  >
                    <X size={16} color="#09090b" />
                    <Text className="ml-1 text-xs font-semibold text-zinc-900">All Absent</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View className="px-4 pb-4 border-t border-zinc-100 pt-4">
                  <View className="flex-row flex-wrap justify-between gap-y-2">
                    {periods.map((period, i) => {
                      const periodData = studentAttendance?.[period];
                      const isPresent = periodData?.status === 'Present';
                      const isExcused = !isPresent && excusedAbsences.includes(periodData?.reason || '');

                      let bg = "bg-red-50"; let border = "border-red-200"; let text = "text-red-700";
                      if (isPresent) { bg = "bg-green-600"; border = "border-green-600"; text = "text-white"; }
                      else if (isExcused) { bg = "bg-white"; border = "border-blue-500"; text = "text-blue-600"; }

                      return (
                        <TouchableOpacity
                          key={period}
                          disabled={isLocked || isLeaveDay}
                          onPress={() => handlePeriodClick(student.uid, period)}
                          className={`w-[23%] py-2.5 rounded-lg border items-center justify-center ${bg} ${border}`}
                        >
                          <Text className={`font-bold text-xs ${text}`}>P{i + 1}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Show absence reasons if any period is absent */}
                  <View className="mt-3 bg-red-50 rounded-lg p-3">
                    {periods.filter(p => studentAttendance?.[p]?.status === 'Absent').map((p, i) => {
                       const detail = studentAttendance[p];
                       return (
                         <Text key={p} className="text-xs text-red-700 font-medium mb-1">
                           • P{i+1}: {detail.reason} {detail.description ? `(${detail.description})` : ''}
                         </Text>
                       );
                    })}
                    {periods.filter(p => studentAttendance?.[p]?.status === 'Absent').length === 0 && (
                      <Text className="text-xs text-green-700 font-medium">100% Present Today.</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* --- Submit Buttons --- */}
      <View className="flex-row gap-3 pt-4">
        <TouchableOpacity
          onPress={() => handleSubmission(false)}
          disabled={isLocked || isUpdating || isLocking}
          className={`flex-1 py-4 rounded-xl flex-row justify-center items-center ${isLocked ? 'bg-zinc-300' : 'bg-white border-2 border-zinc-900'}`}
        >
          {isUpdating ? <ActivityIndicator size="small" color="#09090b" className="mr-2" /> : <Save size={18} color="#09090b" className="mr-2" />}
          <Text className={`font-bold ${isLocked ? 'text-zinc-500' : 'text-zinc-900'}`}>Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSubmission(true)}
          disabled={isLocked || isUpdating || isLocking}
          className={`flex-1 py-4 rounded-xl flex-row justify-center items-center ${isLocked ? 'bg-zinc-300' : 'bg-zinc-900'}`}
        >
          {isLocking ? <ActivityIndicator size="small" color="white" className="mr-2" /> : <Lock size={18} color="white" className="mr-2" />}
          <Text className={`font-bold ${isLocked ? 'text-zinc-500' : 'text-white'}`}>Lock & Submit</Text>
        </TouchableOpacity>
      </View>

      {/* --- Reason Modal --- */}
      <Modal visible={modalState.isOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 shadow-xl pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-zinc-900">Mark Absent</Text>
              <TouchableOpacity onPress={() => setModalState({ isOpen: false, studentUid: null, period: null })}>
                <X size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-medium text-zinc-500 mb-2">Reason for Absence</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {absenceReasons.map(r => (
                <TouchableOpacity
                  key={r} onPress={() => setReasonDraft(r as any)}
                  className={`px-4 py-2 rounded-full border ${reasonDraft === r ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'}`}
                >
                  <Text className={`font-semibold text-sm ${reasonDraft === r ? 'text-white' : 'text-zinc-700'}`}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-zinc-500 mb-2">Description (Optional)</Text>
            <TextInput
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-base mb-6 h-24"
              placeholder="e.g., Attending family function"
              placeholderTextColor="#a1a1aa"
              multiline
              textAlignVertical="top"
              value={descDraft}
              onChangeText={setDescDraft}
            />

            <TouchableOpacity
              onPress={saveAbsence}
              className="bg-zinc-900 py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-lg">Save Absence</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}