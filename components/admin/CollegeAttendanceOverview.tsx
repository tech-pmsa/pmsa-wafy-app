import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { format } from 'date-fns';
import { BarChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown, Users, Percent, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Search, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';

// Type Definitions
interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { is_leave_day: boolean; [key: string]: any; }
interface StudentFullAttendance { uid: string; name: string; class_id: string; total_present: number; total_days: number; today_attendance: TodaysAttendanceRecord | null; }

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];
const screenWidth = Dimensions.get("window").width;

// 1. Reusable Stat Card
function StatCard({ title, value, icon: Icon, footer, colorClass = 'text-blue-600' }: any) {
  return (
    <View className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex-1 mb-4">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-zinc-600">{title}</Text>
        <Icon size={18} color={colorClass === 'text-red-600' ? '#dc2626' : colorClass === 'text-green-600' ? '#16a34a' : '#2563eb'} />
      </View>
      <Text className="text-2xl font-bold text-zinc-900">{value}</Text>
      <Text className="text-xs text-zinc-500 mt-1">{footer}</Text>
    </View>
  );
}

// 2. Custom Progress Bar
function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <View className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden flex-row">
      <View style={{ width: `${percentage}%` }} className={`h-full ${percentage < 75 ? 'bg-red-500' : 'bg-green-500'}`} />
    </View>
  );
}

// 3. The Main Component
export default function CollegeAttendanceOverview() {
  const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Modal States
  const [activeTab, setActiveTab] = useState<'details' | 'status'>('details');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Data exactly like your web version
  useEffect(() => {
    const fetchDataAndSubscribe = async () => {
      setLoading(true);
      const todayString = format(new Date(), 'yyyy-MM-dd');

      const { data: summaryData, error: summaryError } = await supabase
        .from('students_with_attendance')
        .select('uid, name, class_id, total_present, total_days');

      const { data: todayData, error: todayError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', todayString);

      if (summaryError || todayError) {
        console.error("Error fetching data:", summaryError || todayError);
        setLoading(false);
        return;
      }

      if (summaryData) {
        const todayAttendanceMap = new Map(todayData?.map(rec => [rec.student_uid, rec]));
        const combinedData = summaryData.map(student => ({
          ...student,
          today_attendance: todayAttendanceMap.get(student.uid) || null
        }));
        setAllAttendance(combinedData);
      }
      setLoading(false);

      const channel = supabase.channel('college-attendance')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, payload => {
          const updatedRecord = payload.new as any;
          if (updatedRecord.date === todayString) {
            setAllAttendance(prev => prev.map(student =>
              student.uid === updatedRecord.student_uid ? { ...student, today_attendance: updatedRecord } : student
            ));
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    fetchDataAndSubscribe();
  }, []);

  // Process Data
  const collegeData = useMemo(() => {
    const classMap = new Map<string, { totalPercentage: number, studentCount: number, students: StudentFullAttendance[] }>();

    allAttendance.forEach(s => {
      if (!s.class_id) return;
      const percentage = s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0;
      if (!classMap.has(s.class_id)) {
        classMap.set(s.class_id, { totalPercentage: 0, studentCount: 0, students: [] });
      }
      const current = classMap.get(s.class_id)!;
      current.totalPercentage += percentage;
      current.studentCount += 1;
      current.students.push(s);
    });

    const chartData = Array.from(classMap.entries()).map(([class_id, data]) => ({
      name: class_id,
      average_attendance: data.studentCount > 0 ? data.totalPercentage / data.studentCount : 0,
      students: data.students
    })).sort((a, b) => b.average_attendance - a.average_attendance);

    const overallAverage = chartData.length > 0 ? chartData.reduce((sum, c) => sum + c.average_attendance, 0) / chartData.length : 0;

    return { chartData, overallAverage, topClass: chartData[0], bottomClass: chartData[chartData.length - 1] };
  }, [allAttendance]);

  // Modal Data Processing
  const modalClassData = useMemo(() => {
    if (!selectedClassId) return null;
    const students = collegeData.chartData.find(c => c.name === selectedClassId)?.students || [];
    const filtered = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const processed = filtered.map(s => {
      const total_absent = s.total_days - s.total_present;
      const points_deducted = Math.floor(total_absent / 2) * 2;
      const points = Math.max(0, 20 - points_deducted);
      return {
        ...s,
        percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
        total: `${s.total_present}/${s.total_days}`,
        points
      };
    }).sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0);
    const average = processed.length > 0 ? totalPercentage / processed.length : 0;
    const belowThreshold = processed.filter(s => s.percentage < 75).length;

    return { students: processed, average, belowThreshold };
  }, [selectedClassId, searchTerm, collegeData]);

  if (loading) {
    return (
      <View className="bg-white p-6 rounded-3xl items-center justify-center">
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="mt-4 text-zinc-500">Loading Attendance Data...</Text>
      </View>
    );
  }

  // Chart Configuration
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Primary blue
    labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`,
    barPercentage: 0.6,
    decimalPlaces: 0,
  };

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200">
      <View className="mb-4">
        <Text className="text-xl font-bold text-zinc-900">College Attendance</Text>
        <Text className="text-sm text-zinc-500">Summary across all classes.</Text>
      </View>

      {/* Top Stats */}
      <View className="flex-row flex-wrap justify-between">
        <StatCard title="Overall Average" value={`${collegeData.overallAverage.toFixed(1)}%`} icon={Percent} footer="College wide" />
      </View>
      <View className="flex-row flex-wrap gap-2">
        <StatCard title="Top Class" value={collegeData.topClass?.name || 'N/A'} icon={TrendingUp} footer={`${collegeData.topClass?.average_attendance.toFixed(1) || 0}% Avg`} colorClass="text-green-600" />
        <StatCard title="Needs Focus" value={collegeData.bottomClass?.name || 'N/A'} icon={TrendingDown} footer={`${collegeData.bottomClass?.average_attendance.toFixed(1) || 0}% Avg`} colorClass="text-red-600" />
      </View>

      {/* Chart */}
      {collegeData.chartData.length > 0 && (
        <View className="mt-4 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 pt-4 pb-2 -mx-2">
          <BarChart
            data={{
              labels: collegeData.chartData.map(c => c.name),
              datasets: [{ data: collegeData.chartData.map(c => c.average_attendance) }]
            }}
            width={screenWidth - 48}
            height={220}
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            showValuesOnTopOfBars={true}
            fromZero
          />
        </View>
      )}

      {/* Class List to trigger Modal */}
      <Text className="text-base font-bold text-zinc-900 mt-6 mb-3">View Class Details</Text>
      <View className="flex-row flex-wrap">
        {collegeData.chartData.map((cls) => (
          <TouchableOpacity
            key={cls.name}
            onPress={() => setSelectedClassId(cls.name)}
            className="bg-zinc-100 px-4 py-3 rounded-xl mr-2 mb-2 flex-row items-center border border-zinc-200"
          >
            <Users size={16} color="#3f3f46" />
            <Text className="ml-2 font-semibold text-zinc-800">{cls.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ================= MODAL ================= */}
      <Modal visible={!!selectedClassId} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedClassId(null)}>
        <View className="flex-1 bg-zinc-100 pt-6">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-6 mb-4">
            <View>
              <Text className="text-2xl font-bold text-zinc-900">{selectedClassId} Overview</Text>
              <Text className="text-zinc-500">Live metrics & history</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedClassId(null)} className="bg-zinc-200 p-2 rounded-full">
              <X size={24} color="#09090b" />
            </TouchableOpacity>
          </View>

          {modalClassData && (
            <>
              {/* Modal Stats & Search */}
              <View className="px-6 mb-4 flex-row gap-2">
                <StatCard title="Class Average" value={`${modalClassData.average.toFixed(1)}%`} icon={Users} footer={`${modalClassData.students.length} students`} />
                <StatCard title="Below 75%" value={modalClassData.belowThreshold.toString()} icon={AlertTriangle} footer="Need attention" colorClass="text-red-600" />
              </View>

              <View className="px-6 mb-4">
                <View className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3">
                  <Search size={20} color="#a1a1aa" />
                  <TextInput
                    className="flex-1 ml-2 text-base" placeholder="Search student..."
                    value={searchTerm} onChangeText={setSearchTerm}
                  />
                </View>
              </View>

              {/* Modal Custom Tabs */}
              <View className="px-6 mb-4 flex-row bg-zinc-200 p-1 rounded-xl">
                <TouchableOpacity onPress={() => setActiveTab('details')} className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'details' ? 'bg-white shadow-sm' : ''}`}>
                  <Text className={`font-semibold ${activeTab === 'details' ? 'text-zinc-900' : 'text-zinc-500'}`}>Detailed List</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('status')} className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'status' ? 'bg-white shadow-sm' : ''}`}>
                  <Text className={`font-semibold ${activeTab === 'status' ? 'text-zinc-900' : 'text-zinc-500'}`}>Live Status</Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              <ScrollView className="flex-1 px-6">
                {activeTab === 'details' ? (
                  // DETAILS TAB
                  <View className="pb-10 space-y-3">
                    {modalClassData.students.map((s) => (
                      <View key={s.uid} className="bg-white p-4 rounded-xl border border-zinc-200 flex-row items-center justify-between">
                        <View className="flex-1 pr-4">
                          <Text className="font-bold text-zinc-900 text-base">{s.name}</Text>
                          <View className="flex-row items-center mt-2">
                            <View className="w-24 mr-3"><ProgressBar percentage={s.percentage} /></View>
                            <Text className="text-xs font-semibold text-zinc-500">{s.percentage.toFixed(1)}%</Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <Text className={`font-bold text-xl ${s.points < 10 ? 'text-red-600' : 'text-blue-600'}`}>{s.points}</Text>
                          <Text className="text-xs text-zinc-400 font-medium">/ 20 Pts</Text>
                          <Text className="text-xs text-zinc-500 mt-1">{s.total} Days</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  // STATUS TAB
                  <View className="pb-10 space-y-3">
                    {modalClassData.students.map((student) => (
                      <View key={student.uid} className="bg-white p-4 rounded-xl border border-zinc-200">
                        <Text className="font-bold text-zinc-900 mb-3">{student.name}</Text>

                        {student.today_attendance?.is_leave_day ? (
                          <Text className="text-sm font-semibold text-blue-600">Leave Day</Text>
                        ) : student.today_attendance ? (
                          <View className="flex-row flex-wrap gap-2">
                            {periods.map((period, i) => {
                              const detail = (student.today_attendance as any)[period] as PeriodDetail;
                              const isPresent = detail?.status === 'Present';
                              const isExcused = excusedAbsences.includes(detail?.reason || '');

                              let IconComp = XCircle; let color = "#dc2626"; let bg = "bg-red-50"; let border = "border-red-200";
                              if (isPresent) { IconComp = CheckCircle2; color = "#16a34a"; bg = "bg-green-50"; border = "border-green-200"; }
                              else if (isExcused) { IconComp = AlertCircle; color = "#3b82f6"; bg = "bg-blue-50"; border = "border-blue-200"; }

                              return (
                                <View key={period} className={`w-[23%] items-center justify-center py-2 rounded-lg border ${bg} ${border}`}>
                                  <Text className="text-[10px] font-bold text-zinc-600 mb-1">P{i + 1}</Text>
                                  <IconComp size={16} color={color} />
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text className="text-sm text-zinc-400 italic">Attendance not submitted.</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}