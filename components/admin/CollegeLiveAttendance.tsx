import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert as NativeAlert, Modal } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Search, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react-native';

interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { is_leave_day: boolean; [key: string]: any; }
interface StudentFullAttendance { uid: string; name: string; class_id: string; today_attendance: TodaysAttendanceRecord | null; }

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

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
    return <ActivityIndicator size="large" color="#09090b" className="my-10" />;
  }

  return (
    <View className="space-y-4">
      <View className="flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4">
        <Search size={20} color="#a1a1aa" />
        <TextInput
          className="flex-1 ml-2 text-base text-zinc-900"
          placeholder="Search students across all classes..."
          placeholderTextColor="#a1a1aa"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View className="space-y-3 pb-6">
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
            <View key={classId} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleClass(classId)}
                className="p-4 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1">
                  <Text className="font-bold text-zinc-900 text-lg">{classId}</Text>
                  <View className="ml-3 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
                    <Text className="text-xs font-semibold text-zinc-700">{students.length} Students</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp size={24} color="#71717a" /> : <ChevronDown size={24} color="#71717a" />}
              </TouchableOpacity>

              {isExpanded && (
                <View className="px-4 pb-4 border-t border-zinc-100 pt-4">
                  {/* Period Filter Buttons */}
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    <TouchableOpacity
                      onPress={() => setPeriodFilters(prev => ({ ...prev, [classId]: 'all' }))}
                      className={`px-3 py-1.5 rounded-lg border ${activeFilter === 'all' ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'}`}
                    >
                      <Text className={`font-semibold text-xs ${activeFilter === 'all' ? 'text-white' : 'text-zinc-700'}`}>All</Text>
                    </TouchableOpacity>
                    {periods.map((period, i) => (
                      <TouchableOpacity
                        key={period}
                        onPress={() => setPeriodFilters(prev => ({ ...prev, [classId]: period }))}
                        className={`px-3 py-1.5 rounded-lg border ${activeFilter === period ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'}`}
                      >
                        <Text className={`font-semibold text-xs ${activeFilter === period ? 'text-white' : 'text-zinc-700'}`}>P{i + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Student List */}
                  <View className="space-y-3">
                    {studentsToDisplay.map(student => {
                      const detailForFilter = activeFilter !== 'all' ? student.today_attendance?.[activeFilter] as PeriodDetail : null;

                      return (
                        <View key={student.uid} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                          <View className="flex-row justify-between items-center mb-3">
                            <Text className="font-bold text-zinc-900">{student.name}</Text>
                            {activeFilter !== 'all' && detailForFilter && (
                              <Text className={`text-xs font-semibold ${excusedAbsences.includes(detailForFilter.reason || '') ? 'text-blue-600' : 'text-red-600'}`}>
                                {detailForFilter.reason || 'Absent'}
                              </Text>
                            )}
                          </View>

                          {activeFilter === 'all' ? (
                            student.today_attendance?.is_leave_day ? (
                              <Text className="text-sm font-semibold text-blue-600">Leave Day</Text>
                            ) : student.today_attendance ? (
                              <View className="flex-row flex-wrap gap-1.5">
                                {periods.map((period, i) => {
                                  const pDetail = student.today_attendance?.[period] as PeriodDetail;
                                  const isPresent = pDetail?.status === 'Present';
                                  const isExcused = excusedAbsences.includes(pDetail?.reason || '');

                                  let IconComp = XCircle; let color = "#dc2626"; let bg = "bg-red-50"; let border = "border-red-200";
                                  if (isPresent) { IconComp = CheckCircle2; color = "#16a34a"; bg = "bg-green-50"; border = "border-green-200"; }
                                  else if (isExcused) { IconComp = AlertCircle; color = "#3b82f6"; bg = "bg-blue-50"; border = "border-blue-200"; }

                                  return (
                                    <TouchableOpacity
                                      key={period}
                                      disabled={isPresent}
                                      onPress={() => setSelectedAbsence({ name: student.name, period: i+1, reason: pDetail?.reason || 'Absent', desc: pDetail?.description || 'No description provided.' })}
                                      className={`w-[23%] items-center justify-center py-2 rounded-lg border ${bg} ${border}`}
                                    >
                                      <Text className="text-[10px] font-bold text-zinc-600 mb-1">P{i + 1}</Text>
                                      <IconComp size={16} color={color} />
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            ) : (
                              <Text className="text-sm text-zinc-400 italic">Pending...</Text>
                            )
                          ) : (
                            <Text className="text-sm text-zinc-500 italic">{detailForFilter?.description || "No description provided."}</Text>
                          )}
                        </View>
                      );
                    })}
                    {studentsToDisplay.length === 0 && (
                      <Text className="text-center text-zinc-500 py-4">No absentees for this period.</Text>
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
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-zinc-900">{selectedAbsence?.reason}</Text>
              <TouchableOpacity onPress={() => setSelectedAbsence(null)}>
                <X size={24} color="#71717a" />
              </TouchableOpacity>
            </View>
            <Text className="text-zinc-700 mb-2 font-medium">
              {selectedAbsence?.name} (Period {selectedAbsence?.period})
            </Text>
            <Text className="text-zinc-500">{selectedAbsence?.desc}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}