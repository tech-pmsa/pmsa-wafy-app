import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, Alert as NativeAlert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { CalendarIcon, Check, X, UserCheck, UserX, Lock, Save, Search, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

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

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

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
    return <ActivityIndicator size="large" color={COLORS.primary} className="my-10" />;
  }

  return (
    <View className="space-y-6 gap-3">
      {/* --- Controls Panel --- */}
      <View
        className="bg-[#FFFFFF] rounded-[18px] border border-[#E2E8F0] p-5"
        style={cardShadow()}
      >
        <Text className="font-muller-bold text-[#0F172A] tracking-tight text-lg mb-4">Controls</Text>

        <View className="flex-row space-x-4 mb-5">
          <View className="flex-1">
            <Text className="text-xs font-muller-bold text-[#475569] mb-1.5">Select Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              className="flex-row items-center border border-[#E2E8F0] bg-[#F8FAFC] rounded-[14px] px-3.5 py-3.5"
            >
              <CalendarIcon size={18} color="#475569" />
              <Text className="ml-2.5 font-muller text-[#0F172A]">{format(selectedDate, 'PPP')}</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1 ml-2">
            <Text className="text-xs font-muller-bold text-[#475569] mb-1.5">Day Type</Text>
            <TouchableOpacity
              onPress={() => !isLocked && setIsLeaveDay(!isLeaveDay)}
              activeOpacity={0.7}
              className={`border rounded-[14px] px-3.5 py-3.5 ${
                isLeaveDay ? 'border-[#1E40AF]/30 bg-[#1E40AF]/10' : 'border-[#E2E8F0] bg-[#F8FAFC]'
              }`}
              disabled={isLocked}
            >
              <Text className={`font-muller-bold ${isLeaveDay ? 'text-[#1E40AF]' : 'text-[#0F172A]'}`}>
                {isLeaveDay ? 'Leave Day' : 'Working Day'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker value={selectedDate} mode="date" maximumDate={new Date()} onChange={handleDateChange} />
        )}

        {/* Stats Row */}
        <View className="flex-row gap-2 mt-1">
          <View className="flex-1 bg-[#16A34A]/10 border border-[#16A34A]/20 rounded-[16px] p-4 items-center flex-row justify-center">
            <UserCheck size={26} color={COLORS.success} />
            <View className="ml-3">
              <Text className="text-2xl font-muller-bold text-[#16A34A]">{attendanceSummary.present}</Text>
              <Text className="text-xs font-muller-bold text-[#16A34A]">Present</Text>
            </View>
          </View>
          <View className="flex-1 bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-[16px] p-4 items-center flex-row justify-center">
            <UserX size={26} color={COLORS.danger} />
            <View className="ml-3">
              <Text className="text-2xl font-muller-bold text-[#DC2626]">{attendanceSummary.absent}</Text>
              <Text className="text-xs font-muller-bold text-[#DC2626]">Absent</Text>
            </View>
          </View>
        </View>
      </View>

      {isLocked && (
        <View className="bg-[#1E40AF]/10 border border-[#1E40AF]/20 p-4 rounded-[14px] flex-row items-center">
          <Lock size={20} color={COLORS.primary} />
          <Text className="ml-3 text-[#1E40AF] font-muller flex-1">
            Attendance for this date has been finalized and locked.
          </Text>
        </View>
      )}

      {/* --- Search --- */}
      <View
        className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5"
        style={cardShadow()}
      >
        <Search size={20} color="#94A3B8" />
        <TextInput
          className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
          placeholder="Search for a student..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* --- Student List (Custom Accordion) --- */}
      <View className={`space-y-3 pb-4 gap-1 ${isLocked || isLeaveDay ? 'opacity-70' : ''}`}>
        {filteredStudents.map(student => {
          const isExpanded = expandedId === student.uid;
          const studentAttendance = attendance[student.uid];

          return (
            <View
              key={student.uid}
              className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] overflow-hidden"
              style={cardShadow()}
            >
              <TouchableOpacity
                activeOpacity={isLocked || isLeaveDay ? 1 : 0.7}
                onPress={() => !(isLocked || isLeaveDay) && setExpandedId(isExpanded ? null : student.uid)}
                className="p-4"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-muller-bold text-[#0F172A] text-[17px] tracking-tight flex-1">
                    {student.name}
                  </Text>
                  {isExpanded ? <ChevronUp size={24} color="#94A3B8" /> : <ChevronDown size={24} color="#94A3B8" />}
                </View>

                {/* Quick Action Buttons visible even when collapsed */}
                <View className="flex-row gap-2.5">
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); markAll(student.uid, true); }}
                    disabled={isLocked || isLeaveDay}
                    activeOpacity={0.7}
                    className="flex-1 bg-[#F8FAFC] py-2.5 rounded-[12px] flex-row justify-center items-center border border-[#E2E8F0]"
                  >
                    <Check size={16} color="#0F172A" />
                    <Text className="ml-1.5 text-xs font-muller-bold text-[#0F172A]">All Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); markAll(student.uid, false); }}
                    disabled={isLocked || isLeaveDay}
                    activeOpacity={0.7}
                    className="flex-1 bg-[#F8FAFC] py-2.5 rounded-[12px] flex-row justify-center items-center border border-[#E2E8F0]"
                  >
                    <X size={16} color="#0F172A" />
                    <Text className="ml-1.5 text-xs font-muller-bold text-[#0F172A]">All Absent</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View className="px-4 pb-4 border-t border-[#E2E8F0] pt-4">
                  <View className="flex-row flex-wrap justify-between gap-y-2.5">
                    {periods.map((period, i) => {
                      const periodData = studentAttendance?.[period];
                      const isPresent = periodData?.status === 'Present';
                      const isExcused = !isPresent && excusedAbsences.includes(periodData?.reason || '');

                      let bg = "bg-[#DC2626]/10"; let border = "border-[#DC2626]/20"; let text = "text-[#DC2626]";
                      if (isPresent) {
                        bg = "bg-[#16A34A]"; border = "border-[#16A34A]"; text = "text-white";
                      } else if (isExcused) {
                        bg = "bg-[#FFFFFF]"; border = "border-[#1E40AF]"; text = "text-[#1E40AF]";
                      }

                      return (
                        <TouchableOpacity
                          key={period}
                          disabled={isLocked || isLeaveDay}
                          onPress={() => handlePeriodClick(student.uid, period)}
                          activeOpacity={0.7}
                          className={`w-[23%] py-2.5 rounded-[10px] border items-center justify-center ${bg} ${border}`}
                        >
                          <Text className={`font-muller-bold text-xs ${text}`}>P{i + 1}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Show absence reasons if any period is absent */}
                  <View className="mt-4 bg-[#DC2626]/10 rounded-[12px] p-3 border border-[#DC2626]/20">
                    {periods.filter(p => studentAttendance?.[p]?.status === 'Absent').map((p, i) => {
                       const detail = studentAttendance[p];
                       return (
                         <Text key={p} className="text-xs text-[#DC2626] font-muller-bold mb-1.5">
                           • P{i+1}: {detail.reason} {detail.description ? `(${detail.description})` : ''}
                         </Text>
                       );
                    })}
                    {periods.filter(p => studentAttendance?.[p]?.status === 'Absent').length === 0 && (
                      <Text className="text-xs text-[#16A34A] font-muller-bold">100% Present Today.</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* --- Submit Buttons --- */}
      <View className="flex-row gap-3 pt-2 pb-2">
        <TouchableOpacity
          onPress={() => handleSubmission(false)}
          disabled={isLocked || isUpdating || isLocking}
          activeOpacity={0.8}
          className={`flex-1 py-4 rounded-[14px] flex-row justify-center items-center ${
            isLocked || isUpdating || isLocking
              ? 'bg-[#E2E8F0] border-2 border-transparent opacity-60'
              : 'bg-[#FFFFFF] border-2 border-[#1E40AF]'
          }`}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={COLORS.primary} className="mr-2.5" />
          ) : (
            <Save size={18} color={isLocked ? '#94A3B8' : COLORS.primary} className="mr-2.5" />
          )}
          <Text className={`font-muller-bold tracking-wide ${isLocked ? 'text-[#94A3B8]' : 'text-[#1E40AF]'}`}>
            Update
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSubmission(true)}
          disabled={isLocked || isUpdating || isLocking}
          activeOpacity={0.8}
          className={`flex-1 py-4 rounded-[14px] flex-row justify-center items-center ${
            isLocked || isUpdating || isLocking ? 'bg-[#94A3B8] opacity-60' : 'bg-[#1E40AF]'
          }`}
        >
          {isLocking ? (
            <ActivityIndicator size="small" color="white" className="mr-2.5" />
          ) : (
            <Lock size={18} color="white" className="mr-2.5" />
          )}
          <Text className={`font-muller-bold tracking-wide ${isLocked ? 'text-[#E2E8F0]' : 'text-white'}`}>
            Lock & Submit
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Reason Modal --- */}
      <Modal visible={modalState.isOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-[#FFFFFF] rounded-t-[24px] p-6 shadow-xl pb-10 border-t border-[#E2E8F0]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Mark Absent</Text>
              <TouchableOpacity
                onPress={() => setModalState({ isOpen: false, studentUid: null, period: null })}
                className="bg-[#F1F5F9] p-2 rounded-full"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-muller-bold text-[#475569] mb-3">Reason for Absence</Text>
            <View className="flex-row flex-wrap gap-2.5 mb-6">
              {absenceReasons.map(r => (
                <TouchableOpacity
                  key={r} onPress={() => setReasonDraft(r as any)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-full border ${
                    reasonDraft === r ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                  }`}
                >
                  <Text className={`font-muller-bold text-sm ${reasonDraft === r ? 'text-white' : 'text-[#475569]'}`}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-muller-bold text-[#475569] mb-3">Description (Optional)</Text>
            <TextInput
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-4 text-base font-muller text-[#0F172A] mb-8 h-24"
              placeholder="e.g., Attending family function"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={descDraft}
              onChangeText={setDescDraft}
            />

            <TouchableOpacity
              onPress={saveAbsence}
              activeOpacity={0.8}
              className="bg-[#1E40AF] py-4 rounded-[14px] items-center"
            >
              <Text className="text-white font-muller-bold text-lg tracking-wide">Save Absence</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}