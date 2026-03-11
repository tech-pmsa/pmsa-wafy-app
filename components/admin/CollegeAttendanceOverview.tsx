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
import { COLORS } from '@/constants/theme';

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
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  footer,
  color = COLORS.primary,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  footer: string;
  color?: string;
}) {
  return (
    <View
      className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] mb-3"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-muller font-medium text-[#475569]">{title}</Text>
        <Icon size={18} color={color} />
      </View>
      <Text className="text-2xl font-muller-bold font-bold text-[#0F172A] tracking-tight">{value}</Text>
      <Text className="text-xs font-muller text-[#94A3B8] mt-1">{footer}</Text>
    </View>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const barColor = safePercentage < 75 ? COLORS.danger : COLORS.success;

  return (
    <View className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
      <View
        style={{
          width: `${safePercentage}%`,
          height: '100%',
          backgroundColor: barColor,
        }}
        className="rounded-full"
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
  const fillColor = safeAverage < 75 ? COLORS.danger : COLORS.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="bg-[#FFFFFF] rounded-[14px] border border-[#E2E8F0] p-4 mb-3"
      style={cardShadow()}
    >
      <View className="flex-row justify-between items-center mb-2.5">
        <Text className="text-base font-muller-bold text-[#0F172A] tracking-tight">{className}</Text>
        <Text className="text-sm font-muller-bold text-[#475569]">
          {safeAverage.toFixed(1)}%
        </Text>
      </View>

      <View className="h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
        <View
          style={{
            width: `${safeAverage}%`,
            height: '100%',
            backgroundColor: fillColor,
          }}
          className="rounded-full"
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
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center mb-6 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Attendance Data...</Text>
      </View>
    );
  }

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mb-6"
      style={cardShadow()}
    >
      <View className="mb-5">
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">College Attendance</Text>
        <Text className="text-sm font-muller text-[#475569] mt-0.5">Summary across all classes.</Text>
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
        color={COLORS.success}
      />

      <StatCard
        title="Needs Focus"
        value={collegeData.bottomClass?.name || 'N/A'}
        icon={TrendingDown}
        footer={`${collegeData.bottomClass?.average_attendance?.toFixed(1) || '0.0'}% Avg`}
        color={COLORS.danger}
      />

      <Text className="text-base font-muller-bold text-[#0F172A] tracking-tight mt-5 mb-3">
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
        <View className="bg-[#F1F5F9] rounded-[14px] p-4 border border-[#E2E8F0]">
          <Text className="text-[#475569] font-muller">No attendance data found.</Text>
        </View>
      )}

      {/* Class Detail Modal */}
      <Modal
        visible={!!selectedClassId}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedClassId(null)}
      >
        <View className="flex-1 bg-[#F8FAFC]">
          <View className="pt-14 px-5 pb-5 bg-[#FFFFFF] border-b border-[#E2E8F0]">
            <View className="flex-row justify-between items-center">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">
                  {selectedClassId || 'Class'} Overview
                </Text>
                <Text className="text-[#475569] font-muller mt-0.5">Attendance details and today's status</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedClassId(null)}
                className="bg-[#F1F5F9] p-2.5 rounded-full"
                activeOpacity={0.7}
              >
                <X size={22} color="#0F172A" />
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
                  color={COLORS.danger}
                />

                <View className="mb-5 mt-2">
                  <View className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5">
                    <Search size={20} color="#94A3B8" />
                    <TextInput
                      className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
                      placeholder="Search student..."
                      placeholderTextColor="#94A3B8"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </View>
                </View>

                {/* Tab Switcher */}
                <View className="flex-row bg-[#E2E8F0]/60 p-1.5 rounded-[16px] mb-5">
                  <TouchableOpacity
                    onPress={() => setActiveTab('details')}
                    activeOpacity={0.7}
                    className={`flex-1 py-3 rounded-[14px] items-center justify-center ${
                      activeTab === 'details' ? 'bg-[#FFFFFF] border border-[#E2E8F0]' : 'border border-transparent'
                    }`}
                    style={activeTab === 'details' ? cardShadow() : undefined}
                  >
                    <Text
                      className={`font-muller-bold tracking-tight text-[15px] ${
                        activeTab === 'details' ? 'text-[#1E40AF]' : 'text-[#475569]'
                      }`}
                    >
                      Detailed List
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setActiveTab('status')}
                    activeOpacity={0.7}
                    className={`flex-1 py-3 rounded-[14px] items-center justify-center ${
                      activeTab === 'status' ? 'bg-[#FFFFFF] border border-[#E2E8F0]' : 'border border-transparent'
                    }`}
                    style={activeTab === 'status' ? cardShadow() : undefined}
                  >
                    <Text
                      className={`font-muller-bold tracking-tight text-[15px] ${
                        activeTab === 'status' ? 'text-[#1E40AF]' : 'text-[#475569]'
                      }`}
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
                        className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] mb-3 flex-row items-center justify-between"
                      >
                        <View className="flex-1 pr-4">
                          <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-2.5">
                            {student.name}
                          </Text>
                          <ProgressBar percentage={student.percentage} />
                          <Text className="text-xs font-muller-bold text-[#475569] mt-2">
                            {student.percentage.toFixed(1)}%
                          </Text>
                        </View>

                        <View className="items-end bg-[#F8FAFC] px-3 py-2 rounded-[12px] border border-[#E2E8F0]">
                          <Text
                            className={`font-muller-bold text-xl ${
                              student.points < 10 ? 'text-[#DC2626]' : 'text-[#1E40AF]'
                            }`}
                          >
                            {student.points}
                          </Text>
                          <Text className="text-[11px] font-muller text-[#94A3B8]">/ 20 Pts</Text>
                          <Text className="text-xs font-muller-bold text-[#475569] mt-1.5 pt-1.5 border-t border-[#E2E8F0]">
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
                        className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] mb-3"
                      >
                        <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-3">{student.name}</Text>

                        {student.today_attendance?.is_leave_day ? (
                          <View className="bg-[#1E40AF]/10 self-start px-3 py-1.5 rounded-lg border border-[#1E40AF]/20">
                            <Text className="text-sm font-muller-bold text-[#1E40AF]">
                              Leave Day
                            </Text>
                          </View>
                        ) : student.today_attendance ? (
                          <View className="flex-row flex-wrap">
                            {periods.map((period, i) => {
                              const detail = student.today_attendance?.[period] as
                                | PeriodDetail
                                | undefined;

                              const isPresent = detail?.status === 'Present';
                              const isExcused = excusedAbsences.includes(detail?.reason || '');

                              let bgClass = 'bg-[#DC2626]/10 border-[#DC2626]/20';
                              let icon = <XCircle size={16} color={COLORS.danger} />;

                              if (isPresent) {
                                bgClass = 'bg-[#16A34A]/10 border-[#16A34A]/20';
                                icon = <CheckCircle2 size={16} color={COLORS.success} />;
                              } else if (isExcused) {
                                bgClass = 'bg-[#1E40AF]/10 border-[#1E40AF]/20';
                                icon = <AlertCircle size={16} color={COLORS.primary} />;
                              }

                              return (
                                <View
                                  key={period}
                                  style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}
                                  className={`items-center justify-center py-2 rounded-[10px] border ${bgClass}`}
                                >
                                  <Text className="text-[11px] font-muller-bold text-[#475569] mb-1">
                                    P{i + 1}
                                  </Text>
                                  {icon}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text className="text-sm font-muller text-[#94A3B8] italic">
                            Attendance not submitted yet.
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
              <Text className="text-[#475569] font-muller">No class data available.</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}