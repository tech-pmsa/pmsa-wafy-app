import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { BarChart } from 'react-native-chart-kit';
import {
  TrendingUp,
  Users,
  AlertTriangle,
  List,
  BarChart2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { COLORS } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;
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
      className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] flex-1 m-1"
      style={[cardShadow(), { minWidth: 140 }]}
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
        style={{ width: `${safePercentage}%`, height: '100%', backgroundColor: barColor }}
        className="rounded-full"
      />
    </View>
  );
}

function ViewToggleButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className={`flex-1 py-3 rounded-[14px] items-center flex-row justify-center ${
        active ? 'bg-[#FFFFFF] border border-[#E2E8F0]' : 'border border-transparent'
      }`}
      style={active ? cardShadow() : undefined}
    >
      {icon}
      <Text className={`ml-2 font-muller-bold tracking-tight text-[15px] ${active ? 'text-[#1E40AF]' : 'text-[#475569]'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ClassAttendanceDashboard() {
  const { details, loading: userLoading } = useUserData();
  const [classAttendance, setClassAttendance] = useState<any[]>([]);
  const [view, setView] = useState<'chart' | 'details' | 'status'>('chart');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAbsence, setSelectedAbsence] = useState<{
    name: string;
    cic: string;
    period: number;
    reason: string;
    desc: string;
  } | null>(null);

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
        supabase
          .from('students_with_attendance')
          .select('uid, name, cic, total_present, total_days')
          .eq('class_id', classId),
        supabase
          .from('attendance')
          .select('*')
          .eq('class_id', classId)
          .eq('date', todayString),
      ]);

      if (summaryData) {
        const todayAttendanceMap = new Map<string, any>();

        if (todayData) {
          todayData.forEach((rec: any) => {
            todayAttendanceMap.set(rec.student_uid, rec);
          });
        }

        const combinedData = summaryData.map((student: any) => ({
          ...student,
          today_attendance: todayAttendanceMap.get(student.uid) || null,
        }));

        setClassAttendance(combinedData);
      }

      setLoading(false);
    };

    fetchData();

    const todayString = format(new Date(), 'yyyy-MM-dd');

    const channel = supabase
      .channel(`class-attendance-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const updatedRecord = payload.new as any;

          if (updatedRecord?.date === todayString) {
            setClassAttendance((prev) =>
              prev.map((student) =>
                student.uid === updatedRecord.student_uid
                  ? { ...student, today_attendance: updatedRecord }
                  : student
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [details, userLoading]);

  const filteredStudents = useMemo(() => {
    return classAttendance.filter((s) => {
      const nameMatch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const cicMatch = String(s.cic || '').toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || cicMatch;
    });
  }, [classAttendance, searchTerm]);

  const classData = useMemo(() => {
    const processed = filteredStudents
      .map((s) => {
        const total_absent = (s.total_days || 0) - (s.total_present || 0);
        const points_deducted = Math.floor(total_absent / 2) * 2;
        const points = Math.max(0, 20 - points_deducted);

        return {
          ...s,
          percentage: s.total_days > 0 ? (s.total_present / s.total_days) * 100 : 0,
          total: `${s.total_present} / ${s.total_days}`,
          points,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = processed.reduce((sum, s) => sum + s.percentage, 0);
    const average = processed.length > 0 ? totalPercentage / processed.length : 0;
    const belowThreshold = processed.filter((s) => s.percentage < 75).length;

    return {
      students: processed,
      average,
      topPerformer: processed[0],
      belowThreshold,
    };
  }, [filteredStudents]);

  if (loading || userLoading) {
    return (
      <View
        className="bg-[#FFFFFF] p-6 rounded-[18px] h-64 justify-center items-center border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-[#475569] font-muller font-medium mt-4">Loading class attendance...</Text>
      </View>
    );
  }

  if (classAttendance.length === 0) {
    return (
      <View
        className="bg-[#FFFFFF] p-6 rounded-[18px] border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">Class Attendance</Text>
        <Text className="text-[#475569] font-muller mt-2">
          No attendance data is available for your class yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row flex-wrap justify-between -mx-1">
        <StatCard
          title="Class Average"
          value={`${classData.average.toFixed(1)}%`}
          icon={Users}
          footer="Overall"
        />
        <StatCard
          title="Below 75%"
          value={classData.belowThreshold.toString()}
          icon={AlertTriangle}
          footer="Need attention"
          color={COLORS.danger}
        />
        <StatCard
          title="Top Performer"
          value={classData.topPerformer?.cic || 'N/A'}
          icon={TrendingUp}
          footer={`${classData.topPerformer?.percentage?.toFixed(1) || '0.0'}%`}
          color={COLORS.success}
        />
      </View>

      <View
        className="bg-[#FFFFFF] rounded-[18px] p-5 border border-[#E2E8F0] mt-5"
        style={cardShadow()}
      >
        <Text className="text-xl font-muller-bold tracking-tight text-[#0F172A] mb-5">Student Performance</Text>

        <View className="flex-row bg-[#E2E8F0]/60 p-1.5 rounded-[16px] mb-5">
          <ViewToggleButton
            label="Chart"
            active={view === 'chart'}
            onPress={() => setView('chart')}
            icon={<BarChart2 size={18} color={view === 'chart' ? COLORS.primary : '#94A3B8'} />}
          />
          <ViewToggleButton
            label="List"
            active={view === 'details'}
            onPress={() => setView('details')}
            icon={<List size={18} color={view === 'details' ? COLORS.primary : '#94A3B8'} />}
          />
          <ViewToggleButton
            label="Live"
            active={view === 'status'}
            onPress={() => setView('status')}
            icon={<Clock size={18} color={view === 'status' ? COLORS.primary : '#94A3B8'} />}
          />
        </View>

        {(view === 'details' || view === 'status') && (
          <View className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 mb-5">
            <Search size={20} color="#94A3B8" />
            <TextInput
              className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
              placeholder="Search by name or CIC..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        )}

        {view === 'chart' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 -ml-2">
            <BarChart
              data={{
                labels: classData.students.map((s) => String(s.cic || 'N/A')),
                datasets: [{ data: classData.students.map((s) => s.percentage) }],
              }}
              width={Math.max(screenWidth - 48, classData.students.length * 60)}
              height={290}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
                barPercentage: 0.5,
                decimalPlaces: 0,
                propsForLabels: {
                  fontFamily: 'System', // Charts often prefer system fonts for SVG rendering safety
                  fontWeight: '600',
                }
              }}
              verticalLabelRotation={70}
              fromZero
            />
          </ScrollView>
        )}

        {view === 'details' && (
          <View>
            {classData.students.map((student) => (
              <View
                key={student.uid}
                className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] flex-row items-center justify-between mb-3"
              >
                <View className="flex-1 pr-4">
                  <Text className="font-muller-bold text-[#0F172A] text-[15px]">{student.name}</Text>
                  <Text className="text-xs font-muller text-[#475569] mt-1">CIC: {student.cic || 'N/A'}</Text>

                  <View className="flex-row items-center mt-3">
                    <View style={{ width: 96, marginRight: 12 }}>
                      <ProgressBar percentage={student.percentage} />
                    </View>
                    <Text className="text-xs font-muller-bold text-[#475569]">
                      {student.percentage.toFixed(1)}%
                    </Text>
                  </View>
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
                </View>
              </View>
            ))}
          </View>
        )}

        {view === 'status' && (
          <View>
            {classData.students.map((student) => (
              <View
                key={student.uid}
                className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] mb-3"
              >
                <Text className="font-muller-bold text-[#0F172A] text-[15px] mb-1">{student.name}</Text>
                <Text className="text-xs font-muller text-[#475569] mb-4">CIC: {student.cic || 'N/A'}</Text>

                {student.today_attendance?.is_leave_day ? (
                  <View className="bg-[#1E40AF]/10 self-start px-3 py-1.5 rounded-lg border border-[#1E40AF]/20">
                    <Text className="text-sm font-muller-bold text-[#1E40AF]">Leave Day</Text>
                  </View>
                ) : student.today_attendance ? (
                  <View className="flex-row flex-wrap">
                    {periods.map((period, i) => {
                      const detail = (student.today_attendance as any)[period];
                      const isPresent = detail?.status === 'Present';
                      const isExcused = excusedAbsences.includes(detail?.reason || '');

                      if (isPresent) {
                        return (
                          <TouchableOpacity
                            key={period}
                            disabled
                            style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}
                            className="items-center justify-center py-2 rounded-[10px] border bg-[#16A34A]/10 border-[#16A34A]/20"
                          >
                            <Text className="text-[11px] font-muller-bold text-[#475569] mb-1">
                              P{i + 1}
                            </Text>
                            <CheckCircle2 size={16} color={COLORS.success} />
                          </TouchableOpacity>
                        );
                      }

                      if (isExcused) {
                        return (
                          <TouchableOpacity
                            key={period}
                            activeOpacity={0.6}
                            onPress={() =>
                              setSelectedAbsence({
                                name: student.name,
                                cic: student.cic || 'N/A',
                                period: i + 1,
                                reason: detail?.reason || 'Excused',
                                desc: detail?.description || 'No description provided.',
                              })
                            }
                            style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}
                            className="items-center justify-center py-2 rounded-[10px] border bg-[#1E40AF]/10 border-[#1E40AF]/20"
                          >
                            <Text className="text-[11px] font-muller-bold text-[#475569] mb-1">
                              P{i + 1}
                            </Text>
                            <AlertCircle size={16} color={COLORS.primary} />
                          </TouchableOpacity>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={period}
                          activeOpacity={0.6}
                          onPress={() =>
                            setSelectedAbsence({
                              name: student.name,
                              cic: student.cic || 'N/A',
                              period: i + 1,
                              reason: detail?.reason || 'Absent',
                              desc: detail?.description || 'No description provided.',
                            })
                          }
                          style={{ width: '23%', marginRight: '2%', marginBottom: 8 }}
                          className="items-center justify-center py-2 rounded-[10px] border bg-[#DC2626]/10 border-[#DC2626]/20"
                        >
                          <Text className="text-[11px] font-muller-bold text-[#475569] mb-1">
                            P{i + 1}
                          </Text>
                          <XCircle size={16} color={COLORS.danger} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-sm font-muller text-[#94A3B8] italic">Attendance pending...</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={!!selectedAbsence}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedAbsence(null)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View
            className="bg-[#FFFFFF] rounded-[20px] w-full p-6 border border-[#E2E8F0]"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">
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
              <Text className="text-[#475569] font-muller text-sm mb-1.5">
                CIC: <Text className="font-muller-bold">{selectedAbsence?.cic}</Text>
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