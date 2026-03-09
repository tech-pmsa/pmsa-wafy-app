import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Percent,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';

interface PeriodDetail {
  status?: 'Present' | 'Absent';
  reason?: string;
  description?: string;
}

interface TodaysAttendanceRecord {
  is_leave_day?: boolean;
  [key: string]: any;
}

interface StudentFullAttendance {
  uid: string;
  name: string;
  class_id: string;
  total_present: number;
  total_days: number;
  today_attendance: TodaysAttendanceRecord | null;
}

interface ProcessedStudent extends StudentFullAttendance {
  percentage: number;
  total: string;
  points: number;
}

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

function cardShadow() {
  return {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  footer,
  color = '#2563eb',
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  footer: string;
  color?: string;
}) {
  return (
    <View
      className="bg-white p-4 rounded-2xl border border-zinc-200 mb-3"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-medium text-zinc-600">{title}</Text>
        <Icon size={18} color={color} />
      </View>
      <Text className="text-2xl font-bold text-zinc-900">{value}</Text>
      <Text className="text-xs text-zinc-500 mt-1">{footer}</Text>
    </View>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const barColor = safePercentage < 75 ? '#ef4444' : '#22c55e';

  return (
    <View className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
      <View
        style={{
          width: `${safePercentage}%`,
          height: '100%',
          backgroundColor: barColor,
        }}
      />
    </View>
  );
}

function ClassAverageBar({
  className,
  average,
  onPress,
}: {
  className: string;
  average: number;
  onPress: () => void;
}) {
  const safeAverage = Math.max(0, Math.min(100, average));
  const fillColor = safeAverage < 75 ? '#ef4444' : '#2563eb';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-2xl border border-zinc-200 p-4 mb-3"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-base font-bold text-zinc-900">{className}</Text>
        <Text className="text-sm font-semibold text-zinc-600">
          {safeAverage.toFixed(1)}%
        </Text>
      </View>

      <View className="h-3 bg-zinc-200 rounded-full overflow-hidden">
        <View
          style={{
            width: `${safeAverage}%`,
            height: '100%',
            backgroundColor: fillColor,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function CollegeAttendanceOverview() {
  const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'status'>('details');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
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
          console.log('Attendance fetch error:', summaryError || todayError);
          setAllAttendance([]);
          setLoading(false);
          return;
        }

        const safeSummary = Array.isArray(summaryData) ? summaryData : [];
        const safeToday = Array.isArray(todayData) ? todayData : [];

        const todayAttendanceMap = new Map(
          safeToday.map((rec: any) => [rec.student_uid, rec])
        );

        const combinedData: StudentFullAttendance[] = safeSummary.map((student: any) => ({
          uid: String(student.uid ?? ''),
          name: String(student.name ?? 'Unknown'),
          class_id: String(student.class_id ?? ''),
          total_present: Number(student.total_present ?? 0),
          total_days: Number(student.total_days ?? 0),
          today_attendance: todayAttendanceMap.get(student.uid) || null,
        }));

        setAllAttendance(combinedData);
      } catch (error) {
        console.log('Unexpected attendance error:', error);
        setAllAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const collegeData = useMemo(() => {
    const classMap = new Map<
      string,
      {
        totalPercentage: number;
        studentCount: number;
        students: StudentFullAttendance[];
      }
    >();

    allAttendance.forEach((student) => {
      if (!student.class_id) return;

      const percentage =
        student.total_days > 0
          ? (student.total_present / student.total_days) * 100
          : 0;

      if (!classMap.has(student.class_id)) {
        classMap.set(student.class_id, {
          totalPercentage: 0,
          studentCount: 0,
          students: [],
        });
      }

      const current = classMap.get(student.class_id)!;
      current.totalPercentage += percentage;
      current.studentCount += 1;
      current.students.push(student);
    });

    const chartData = Array.from(classMap.entries())
      .map(([class_id, data]) => ({
        name: class_id,
        average_attendance:
          data.studentCount > 0 ? data.totalPercentage / data.studentCount : 0,
        students: data.students,
      }))
      .sort((a, b) => b.average_attendance - a.average_attendance);

    const overallAverage =
      chartData.length > 0
        ? chartData.reduce((sum, item) => sum + item.average_attendance, 0) /
          chartData.length
        : 0;

    return {
      chartData,
      overallAverage,
      topClass: chartData[0],
      bottomClass: chartData[chartData.length - 1],
    };
  }, [allAttendance]);

  const modalClassData = useMemo(() => {
    if (!selectedClassId) return null;

    const selectedClass = collegeData.chartData.find(
      (item) => item.name === selectedClassId
    );

    const students = selectedClass?.students ?? [];

    const filtered = students.filter((student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const processed: ProcessedStudent[] = filtered
      .map((student) => {
        const percentage =
          student.total_days > 0
            ? (student.total_present / student.total_days) * 100
            : 0;

        const total_absent = Math.max(0, student.total_days - student.total_present);
        const points_deducted = Math.floor(total_absent / 2) * 2;
        const points = Math.max(0, 20 - points_deducted);

        return {
          ...student,
          percentage,
          total: `${student.total_present}/${student.total_days}`,
          points,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = processed.reduce((sum, student) => sum + student.percentage, 0);
    const average = processed.length > 0 ? totalPercentage / processed.length : 0;
    const belowThreshold = processed.filter((student) => student.percentage < 75).length;

    return {
      students: processed,
      average,
      belowThreshold,
    };
  }, [selectedClassId, searchTerm, collegeData]);

  if (loading) {
    return (
      <View
        className="bg-white p-6 rounded-3xl items-center justify-center mb-6 border border-zinc-200"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="mt-4 text-zinc-500 font-medium">Loading Attendance Data...</Text>
      </View>
    );
  }

  return (
    <View
      className="bg-white rounded-3xl p-5 border border-zinc-200 mb-6"
      style={cardShadow()}
    >
      <View className="mb-4">
        <Text className="text-xl font-bold text-zinc-900">College Attendance</Text>
        <Text className="text-sm text-zinc-500">Summary across all classes.</Text>
      </View>

      <StatCard
        title="Overall Average"
        value={`${collegeData.overallAverage.toFixed(1)}%`}
        icon={Percent}
        footer="College wide"
      />

      <StatCard
        title="Top Class"
        value={collegeData.topClass?.name || 'N/A'}
        icon={TrendingUp}
        footer={`${collegeData.topClass?.average_attendance?.toFixed(1) || '0.0'}% Avg`}
        color="#16a34a"
      />

      <StatCard
        title="Needs Focus"
        value={collegeData.bottomClass?.name || 'N/A'}
        icon={TrendingDown}
        footer={`${collegeData.bottomClass?.average_attendance?.toFixed(1) || '0.0'}% Avg`}
        color="#dc2626"
      />

      <Text className="text-base font-bold text-zinc-900 mt-3 mb-3">
        Class Performance
      </Text>

      {collegeData.chartData.length > 0 ? (
        <View>
          {collegeData.chartData.map((cls) => (
            <ClassAverageBar
              key={cls.name}
              className={cls.name}
              average={cls.average_attendance}
              onPress={() => setSelectedClassId(cls.name)}
            />
          ))}
        </View>
      ) : (
        <View className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
          <Text className="text-zinc-500">No attendance data found.</Text>
        </View>
      )}

      <Modal
        visible={!!selectedClassId}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedClassId(null)}
      >
        <View className="flex-1 bg-zinc-100">
          <View className="pt-14 px-5 pb-4 bg-white border-b border-zinc-200">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-zinc-900">
                  {selectedClassId || 'Class'} Overview
                </Text>
                <Text className="text-zinc-500">Attendance details and today status</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedClassId(null)}
                className="bg-zinc-200 p-2 rounded-full"
              >
                <X size={22} color="#09090b" />
              </TouchableOpacity>
            </View>
          </View>

          {modalClassData ? (
            <>
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <StatCard
                  title="Class Average"
                  value={`${modalClassData.average.toFixed(1)}%`}
                  icon={Users}
                  footer={`${modalClassData.students.length} students`}
                />

                <StatCard
                  title="Below 75%"
                  value={String(modalClassData.belowThreshold)}
                  icon={AlertTriangle}
                  footer="Need attention"
                  color="#dc2626"
                />

                <View className="mb-4">
                  <View className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3">
                    <Search size={20} color="#a1a1aa" />
                    <TextInput
                      className="flex-1 ml-2 text-base text-zinc-900"
                      placeholder="Search student..."
                      placeholderTextColor="#a1a1aa"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </View>
                </View>

                <View className="flex-row bg-zinc-200 p-1 rounded-xl mb-4">
                  <TouchableOpacity
                    onPress={() => setActiveTab('details')}
                    className={`flex-1 py-3 rounded-lg items-center ${
                      activeTab === 'details' ? 'bg-white' : ''
                    }`}
                    style={activeTab === 'details' ? cardShadow() : undefined}
                  >
                    <Text
                      className={
                        activeTab === 'details'
                          ? 'font-semibold text-zinc-900'
                          : 'font-semibold text-zinc-500'
                      }
                    >
                      Detailed List
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('status')}
                    className={`flex-1 py-3 rounded-lg items-center ${
                      activeTab === 'status' ? 'bg-white' : ''
                    }`}
                    style={activeTab === 'status' ? cardShadow() : undefined}
                  >
                    <Text
                      className={
                        activeTab === 'status'
                          ? 'font-semibold text-zinc-900'
                          : 'font-semibold text-zinc-500'
                      }
                    >
                      Live Status
                    </Text>
                  </TouchableOpacity>
                </View>

                {activeTab === 'details' ? (
                  <View>
                    {modalClassData.students.map((student) => (
                      <View
                        key={student.uid}
                        className="bg-white p-4 rounded-xl border border-zinc-200 mb-3 flex-row items-center justify-between"
                      >
                        <View className="flex-1 pr-4">
                          <Text className="font-bold text-zinc-900 text-base">
                            {student.name}
                          </Text>

                          <View className="mt-2">
                            <ProgressBar percentage={student.percentage} />
                          </View>

                          <Text className="text-xs font-semibold text-zinc-500 mt-2">
                            {student.percentage.toFixed(1)}%
                          </Text>
                        </View>

                        <View className="items-end">
                          <Text
                            className={
                              student.points < 10
                                ? 'font-bold text-xl text-red-600'
                                : 'font-bold text-xl text-blue-600'
                            }
                          >
                            {student.points}
                          </Text>
                          <Text className="text-xs text-zinc-400 font-medium">/ 20 Pts</Text>
                          <Text className="text-xs text-zinc-500 mt-1">
                            {student.total} Days
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View>
                    {modalClassData.students.map((student) => (
                      <View
                        key={student.uid}
                        className="bg-white p-4 rounded-xl border border-zinc-200 mb-3"
                      >
                        <Text className="font-bold text-zinc-900 mb-3">{student.name}</Text>

                        {student.today_attendance?.is_leave_day ? (
                          <Text className="text-sm font-semibold text-blue-600">
                            Leave Day
                          </Text>
                        ) : student.today_attendance ? (
                          <View className="flex-row flex-wrap">
                            {periods.map((period, i) => {
                              const detail = student.today_attendance?.[period] as
                                | PeriodDetail
                                | undefined;

                              const isPresent = detail?.status === 'Present';
                              const isExcused = excusedAbsences.includes(detail?.reason || '');

                              let bgClass = 'bg-red-50 border-red-200';
                              let icon = <XCircle size={16} color="#dc2626" />;

                              if (isPresent) {
                                bgClass = 'bg-green-50 border-green-200';
                                icon = <CheckCircle2 size={16} color="#16a34a" />;
                              } else if (isExcused) {
                                bgClass = 'bg-blue-50 border-blue-200';
                                icon = <AlertCircle size={16} color="#3b82f6" />;
                              }

                              return (
                                <View
                                  key={period}
                                  style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}
                                  className={`items-center justify-center py-2 rounded-lg border ${bgClass}`}
                                >
                                  <Text className="text-[10px] font-bold text-zinc-600 mb-1">
                                    P{i + 1}
                                  </Text>
                                  {icon}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text className="text-sm text-zinc-400 italic">
                            Attendance not submitted.
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-zinc-500">No class data available.</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}