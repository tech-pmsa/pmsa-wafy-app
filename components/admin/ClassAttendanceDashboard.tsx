import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Dimensions, Modal } from 'react-native';
import { format } from 'date-fns';
import { BarChart } from 'react-native-chart-kit';
import { TrendingUp, Users, AlertTriangle, List, BarChart2, Clock, CheckCircle2, XCircle, AlertCircle, Search, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';

const screenWidth = Dimensions.get("window").width;
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

// --- Sub-components ---
function StatCard({ title, value, icon: Icon, footer, colorClass = 'text-blue-600' }: any) {
  return (
    <View className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex-1 min-w-[140px] m-1">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-zinc-600">{title}</Text>
        <Icon size={18} color={colorClass === 'text-red-600' ? '#dc2626' : colorClass === 'text-green-600' ? '#16a34a' : '#2563eb'} />
      </View>
      <Text className="text-2xl font-bold text-zinc-900">{value}</Text>
      <Text className="text-xs text-zinc-500 mt-1">{footer}</Text>
    </View>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <View className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden flex-row">
      <View style={{ width: `${percentage}%` }} className={`h-full ${percentage < 75 ? 'bg-red-500' : 'bg-green-500'}`} />
    </View>
  );
}

// --- Main Component ---
export default function ClassAttendanceDashboard() {
  const { details, loading: userLoading } = useUserData();
  const [classAttendance, setClassAttendance] = useState<any[]>([]);
  const [view, setView] = useState<'chart' | 'details' | 'status'>('chart');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state for absence reasons
  const [selectedAbsence, setSelectedAbsence] = useState<{name: string, period: number, reason: string, desc: string} | null>(null);

  useEffect(() => {
    const classId = details?.designation?.replace(' Class', '');
    if (userLoading || !classId) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const todayString = format(new Date(), 'yyyy-MM-dd');

      const [{ data: summaryData }, { data: todayData }] = await Promise.all([
        supabase.from('students_with_attendance').select('uid, name, total_present, total_days').eq('class_id', classId),
        supabase.from('attendance').select('*').eq('class_id', classId).eq('date', todayString)
      ]);

      if (summaryData) {
        const todayAttendanceMap = new Map();
        if (todayData) {
          todayData.forEach(rec => { todayAttendanceMap.set(rec.student_uid, rec); });
        }
        const combinedData = summaryData.map(student => ({
          ...student,
          today_attendance: todayAttendanceMap.get(student.uid) || null
        }));
        setClassAttendance(combinedData);
      }
      setLoading(false);
    };

    fetchData();

    const todayString = format(new Date(), 'yyyy-MM-dd');
    const channel = supabase.channel(`class-attendance-${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `class_id=eq.${classId}` },
        (payload) => {
          const updatedRecord = payload.new as any;
          if (updatedRecord.date === todayString) {
            setClassAttendance(prev => prev.map(student =>
              student.uid === updatedRecord.student_uid ? { ...student, today_attendance: updatedRecord } : student
            ));
          }
        }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [details, userLoading]);

  const filteredStudents = useMemo(() => {
    return classAttendance.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [classAttendance, searchTerm]);

  const classData = useMemo(() => {
    const processed = filteredStudents.map(s => {
      const total_absent = s.total_days - s.total_present;
      const points_deducted = Math.floor(total_absent / 2) * 2;
      const points = Math.max(0, 20 - points_deducted);
      return {
        ...s,
        percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
        total: `${s.total_present} / ${s.total_days}`,
        points,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0);
    const average = processed.length > 0 ? totalPercentage / processed.length : 0;
    const belowThreshold = processed.filter(s => s.percentage < 75).length;

    return { students: processed, average, topPerformer: processed[0], belowThreshold };
  }, [filteredStudents]);

  if (loading || userLoading) {
    return (
      <View className="bg-white p-6 rounded-3xl h-64 justify-center items-center shadow-sm border border-zinc-200">
        <Text className="text-zinc-500 font-medium">Loading class attendance...</Text>
      </View>
    );
  }

  if (classAttendance.length === 0) {
    return (
      <View className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-200">
        <Text className="text-lg font-bold text-zinc-900">Class Attendance</Text>
        <Text className="text-zinc-500 mt-2">No attendance data is available for your class yet.</Text>
      </View>
    );
  }

  return (
    <View className="space-y-6">
      <View className="flex-row flex-wrap justify-between -mx-1">
        <StatCard title="Class Average" value={`${classData.average.toFixed(1)}%`} icon={Users} footer="Overall" />
        <StatCard title="Below 75%" value={classData.belowThreshold.toString()} icon={AlertTriangle} footer="Need attention" colorClass="text-red-600" />
        <StatCard title="Top Performer" value={classData.topPerformer?.name?.split(' ')[0] || 'N/A'} icon={TrendingUp} footer={`${classData.topPerformer?.percentage.toFixed(1)}%`} colorClass="text-green-600" />
      </View>

      <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
        <Text className="text-xl font-bold text-zinc-900 mb-4">Student Performance</Text>

        {/* Mobile View Toggle */}
        <View className="flex-row bg-zinc-100 p-1 rounded-xl mb-4">
          <TouchableOpacity onPress={() => setView('chart')} className={`flex-1 py-2 rounded-lg items-center flex-row justify-center ${view === 'chart' ? 'bg-white shadow-sm' : ''}`}>
            <BarChart2 size={16} color={view === 'chart' ? '#09090b' : '#71717a'} />
            <Text className={`ml-2 font-semibold ${view === 'chart' ? 'text-zinc-900' : 'text-zinc-500'}`}>Chart</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('details')} className={`flex-1 py-2 rounded-lg items-center flex-row justify-center ${view === 'details' ? 'bg-white shadow-sm' : ''}`}>
            <List size={16} color={view === 'details' ? '#09090b' : '#71717a'} />
            <Text className={`ml-2 font-semibold ${view === 'details' ? 'text-zinc-900' : 'text-zinc-500'}`}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('status')} className={`flex-1 py-2 rounded-lg items-center flex-row justify-center ${view === 'status' ? 'bg-white shadow-sm' : ''}`}>
            <Clock size={16} color={view === 'status' ? '#09090b' : '#71717a'} />
            <Text className={`ml-2 font-semibold ${view === 'status' ? 'text-zinc-900' : 'text-zinc-500'}`}>Live</Text>
          </TouchableOpacity>
        </View>

        {(view === 'details' || view === 'status') && (
          <View className="flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4">
            <Search size={20} color="#a1a1aa" />
            <TextInput
              className="flex-1 ml-2 text-base" placeholder="Search student..."
              value={searchTerm} onChangeText={setSearchTerm}
            />
          </View>
        )}

        {view === 'chart' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 -mx-2">
            <BarChart
              data={{
                labels: classData.students.map(s => s.name.split(' ')[0]),
                datasets: [{ data: classData.students.map(s => s.percentage) }]
              }}
              width={Math.max(screenWidth - 48, classData.students.length * 45)}
              height={220}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`,
                barPercentage: 0.5,
              }}
              verticalLabelRotation={30}
              fromZero
            />
          </ScrollView>
        )}

        {view === 'details' && (
          <View className="space-y-3">
            {classData.students.map((student) => (
              <View key={student.uid} className="bg-white p-4 rounded-xl border border-zinc-200 flex-row items-center justify-between">
                <View className="flex-1 pr-4">
                  <Text className="font-bold text-zinc-900 text-base">{student.name}</Text>
                  <View className="flex-row items-center mt-2">
                    <View className="w-24 mr-3"><ProgressBar percentage={student.percentage} /></View>
                    <Text className="text-xs font-semibold text-zinc-500">{student.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className={`font-bold text-xl ${student.points < 10 ? 'text-red-600' : 'text-blue-600'}`}>{student.points}</Text>
                  <Text className="text-xs text-zinc-400 font-medium">/ 20 Pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {view === 'status' && (
          <View className="space-y-3">
            {classData.students.map((student) => (
              <View key={student.uid} className="bg-white p-4 rounded-xl border border-zinc-200">
                <Text className="font-bold text-zinc-900 mb-3">{student.name}</Text>
                {student.today_attendance?.is_leave_day ? (
                  <Text className="text-sm font-semibold text-blue-600">Leave Day</Text>
                ) : student.today_attendance ? (
                  <View className="flex-row flex-wrap gap-2">
                    {periods.map((period, i) => {
                      const detail = (student.today_attendance as any)[period];
                      const isPresent = detail?.status === 'Present';
                      const isExcused = excusedAbsences.includes(detail?.reason || '');

                      let IconComp = XCircle; let color = "#dc2626"; let bg = "bg-red-50"; let border = "border-red-200";
                      if (isPresent) { IconComp = CheckCircle2; color = "#16a34a"; bg = "bg-green-50"; border = "border-green-200"; }
                      else if (isExcused) { IconComp = AlertCircle; color = "#3b82f6"; bg = "bg-blue-50"; border = "border-blue-200"; }

                      return (
                        <TouchableOpacity
                          key={period}
                          onPress={() => !isPresent && setSelectedAbsence({ name: student.name, period: i+1, reason: detail?.reason || 'Absent', desc: detail?.description || 'No description provided.' })}
                          disabled={isPresent}
                          className={`w-[23%] items-center justify-center py-2 rounded-lg border ${bg} ${border}`}
                        >
                          <Text className="text-[10px] font-bold text-zinc-600 mb-1">P{i + 1}</Text>
                          <IconComp size={16} color={color} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-sm text-zinc-400 italic">Attendance pending...</Text>
                )}
              </View>
            ))}
          </View>
        )}
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