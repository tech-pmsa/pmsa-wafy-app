import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert, Modal } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Search, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { is_leave_day: boolean; [key: string]: any; }
interface StudentFullAttendance { uid: string; name: string; class_id: string; today_attendance: TodaysAttendanceRecord | null; }

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
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

export default function CollegeLiveAttendance() {
  const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Track expanded accordions and active period filters per class
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [periodFilters, setPeriodFilters] = useState<Record<string, string>>({});

  // Modal for showing absence reasons
  const [selectedAbsence, setSelectedAbsence] = useState<{name: string, period: number, reason: string, desc: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const todayString = format(new Date(), 'yyyy-MM-dd');

      const [{ data: studentsData }, { data: todayData }] = await Promise.all([
        supabase.from('students').select('uid, name, class_id'),
        supabase.from('attendance').select('*').eq('date', todayString)
      ]);

      if (studentsData) {
        const todayAttendanceMap = new Map();
        if (todayData) todayData.forEach(rec => { todayAttendanceMap.set(rec.student_uid, rec); });

        const combinedData = studentsData.map(student => ({
          ...student,
          today_attendance: todayAttendanceMap.get(student.uid) || null
        }));
        setAllAttendance(combinedData);
      }
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('college-live-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, payload => {
        const updatedRecord = payload.new as any;
        if (updatedRecord.date === format(new Date(), 'yyyy-MM-dd')) {
          setAllAttendance(prev => prev.map(student =>
            student.uid === updatedRecord.student_uid ? { ...student, today_attendance: updatedRecord } : student
          ));
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const groupedAndFilteredStudents = useMemo(() => {
    const filtered = allAttendance.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const grouped = filtered.reduce((acc, student) => {
      const key = student.class_id || 'Unassigned';
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {} as Record<string, StudentFullAttendance[]>);

    return Object.keys(grouped).sort().reduce((obj, key) => {
      obj[key] = grouped[key];
      return obj;
    }, {} as Record<string, StudentFullAttendance[]>);
  }, [allAttendance, searchTerm]);

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  if (loading) {
    return (
      <View
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center my-4 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Live Attendance...</Text>
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {/* Search Bar */}
      <View
        className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 mb-5"
        style={cardShadow()}
      >
        <Search size={20} color="#94A3B8" />
        <TextInput
          className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
          placeholder="Search students across all classes..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Classes Accordion */}
      <View className="space-y-4 pb-6 gap-2">
        {Object.entries(groupedAndFilteredStudents).map(([classId, students]) => {
          const isExpanded = !!expandedClasses[classId];
          const activeFilter = periodFilters[classId] || 'all';

          const studentsToDisplay = activeFilter === 'all'
            ? students
            : students.filter(student => {
                const detail = student.today_attendance?.[activeFilter] as PeriodDetail;
                return detail?.status !== 'Present';
              });

          return (
            <View
              key={classId}
              className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] overflow-hidden"
              style={cardShadow()}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleClass(classId)}
                className="p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1">
                  <Text className="font-muller-bold text-[#0F172A] tracking-tight text-[17px]">{classId}</Text>
                  <View className="ml-3 bg-[#F1F5F9] px-3 py-1.5 rounded-[10px] border border-[#E2E8F0]">
                    <Text className="text-xs font-muller-bold text-[#475569]">{students.length} Students</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp size={24} color="#94A3B8" /> : <ChevronDown size={24} color="#94A3B8" />}
              </TouchableOpacity>

              {isExpanded && (
                <View className="px-4 pb-4 border-t border-[#E2E8F0] pt-4">
                  {/* Period Filter Tabs */}
                  <View className="flex-row flex-wrap gap-2.5 mb-5">
                    <TouchableOpacity
                      onPress={() => setPeriodFilters(prev => ({ ...prev, [classId]: 'all' }))}
                      activeOpacity={0.7}
                      className={`px-4 py-2 rounded-[12px] border ${
                        activeFilter === 'all' ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                      }`}
                    >
                      <Text className={`font-muller-bold text-xs ${activeFilter === 'all' ? 'text-white' : 'text-[#475569]'}`}>All</Text>
                    </TouchableOpacity>
                    {periods.map((period, i) => (
                      <TouchableOpacity
                        key={period}
                        onPress={() => setPeriodFilters(prev => ({ ...prev, [classId]: period }))}
                        activeOpacity={0.7}
                        className={`px-4 py-2 rounded-[12px] border ${
                          activeFilter === period ? 'bg-[#1E40AF] border-[#1E40AF]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
                        }`}
                      >
                        <Text className={`font-muller-bold text-xs ${activeFilter === period ? 'text-white' : 'text-[#475569]'}`}>P{i + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Student List */}
                  <View className="space-y-3">
                    {studentsToDisplay.map(student => {
                      const detailForFilter = activeFilter !== 'all' ? student.today_attendance?.[activeFilter] as PeriodDetail : null;

                      return (
                        <View key={student.uid} className="bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0]">
                          <View className="flex-row justify-between items-center mb-3.5">
                            <Text className="font-muller-bold text-[#0F172A] text-[15px]">{student.name}</Text>
                            {activeFilter !== 'all' && detailForFilter && (
                              <View className={`px-2.5 py-1 rounded-[8px] ${
                                excusedAbsences.includes(detailForFilter.reason || '')
                                  ? 'bg-[#1E40AF]/10 border border-[#1E40AF]/20'
                                  : 'bg-[#DC2626]/10 border border-[#DC2626]/20'
                              }`}>
                                <Text className={`text-[11px] font-muller-bold ${
                                  excusedAbsences.includes(detailForFilter.reason || '') ? 'text-[#1E40AF]' : 'text-[#DC2626]'
                                }`}>
                                  {detailForFilter.reason || 'Absent'}
                                </Text>
                              </View>
                            )}
                          </View>

                          {activeFilter === 'all' ? (
                            student.today_attendance?.is_leave_day ? (
                              <View className="bg-[#1E40AF]/10 self-start px-3 py-1.5 rounded-[10px] border border-[#1E40AF]/20">
                                <Text className="text-sm font-muller-bold text-[#1E40AF]">Leave Day</Text>
                              </View>
                            ) : student.today_attendance ? (
                              <View className="flex-row flex-wrap gap-1.5 justify-between">
                                {periods.map((period, i) => {
                                  const pDetail = student.today_attendance?.[period] as PeriodDetail;
                                  const isPresent = pDetail?.status === 'Present';
                                  const isExcused = excusedAbsences.includes(pDetail?.reason || '');

                                  let IconComp = XCircle; let color = COLORS.danger;
                                  let bg = "bg-[#DC2626]/10"; let border = "border-[#DC2626]/20";

                                  if (isPresent) {
                                    IconComp = CheckCircle2; color = COLORS.success;
                                    bg = "bg-[#16A34A]/10"; border = "border-[#16A34A]/20";
                                  } else if (isExcused) {
                                    IconComp = AlertCircle; color = COLORS.primary;
                                    bg = "bg-[#1E40AF]/10"; border = "border-[#1E40AF]/20";
                                  }

                                  return (
                                    <TouchableOpacity
                                      key={period}
                                      disabled={isPresent}
                                      activeOpacity={0.6}
                                      onPress={() => setSelectedAbsence({
                                        name: student.name,
                                        period: i+1,
                                        reason: pDetail?.reason || 'Absent',
                                        desc: pDetail?.description || 'No description provided.'
                                      })}
                                      className={`w-[23%] items-center justify-center py-2.5 rounded-[10px] border ${bg} ${border} mb-1.5`}
                                    >
                                      <Text className="text-[11px] font-muller-bold text-[#475569] mb-1.5">P{i + 1}</Text>
                                      <IconComp size={16} color={color} />
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            ) : (
                              <Text className="text-sm font-muller text-[#94A3B8] italic">Pending submission...</Text>
                            )
                          ) : (
                            <Text className="text-[13px] font-muller text-[#475569] leading-relaxed">
                              {detailForFilter?.description || "No description provided."}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                    {studentsToDisplay.length === 0 && (
                      <View className="bg-[#F8FAFC] p-5 rounded-[14px] border border-[#E2E8F0] items-center">
                        <Text className="text-[#475569] font-muller">No absentees for this period.</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Absence Details Modal */}
      <Modal visible={!!selectedAbsence} transparent animationType="fade" onRequestClose={() => setSelectedAbsence(null)}>
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View
            className="bg-[#FFFFFF] rounded-[20px] w-full p-6 border border-[#E2E8F0]"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-muller-bold tracking-tight text-[#0F172A]">
                {selectedAbsence?.reason}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedAbsence(null)}
                className="bg-[#F1F5F9] p-2 rounded-full"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View className="bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0] mb-5">
              <Text className="text-[#0F172A] font-muller-bold mb-1.5 text-base">
                {selectedAbsence?.name}
              </Text>
              <Text className="text-[#475569] font-muller text-sm">
                Missed: <Text className="font-muller-bold">Period {selectedAbsence?.period}</Text>
              </Text>
            </View>

            <Text className="text-[#0F172A] font-muller-bold mb-2">Description / Note</Text>
            <Text className="text-[#475569] font-muller leading-relaxed">
              {selectedAbsence?.desc}
            </Text>

            <TouchableOpacity
              onPress={() => setSelectedAbsence(null)}
              activeOpacity={0.8}
              className="mt-8 bg-[#1E40AF] py-3.5 rounded-[14px] items-center"
            >
              <Text className="text-white font-muller-bold text-[15px]">Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}