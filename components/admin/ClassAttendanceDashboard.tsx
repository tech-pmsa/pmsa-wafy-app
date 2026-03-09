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

const screenWidth = Dimensions.get('window').width;
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
      className="bg-white p-4 rounded-2xl border border-zinc-100 flex-1 m-1"
      style={[cardShadow(), { minWidth: 140 }]}
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

  return (
    <View className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
      {safePercentage < 75 ? (
        <View style={{ width: `${safePercentage}%`, height: '100%', backgroundColor: '#ef4444' }} />
      ) : (
        <View style={{ width: `${safePercentage}%`, height: '100%', backgroundColor: '#22c55e' }} />
      )}
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
      onPress={onPress}
      className={active ? 'flex-1 py-2 rounded-lg items-center flex-row justify-center bg-white' : 'flex-1 py-2 rounded-lg items-center flex-row justify-center'}
      style={active ? cardShadow() : undefined}
    >
      {icon}
      <Text className={active ? 'ml-2 font-semibold text-zinc-900' : 'ml-2 font-semibold text-zinc-500'}>
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
        className="bg-white p-6 rounded-3xl h-64 justify-center items-center border border-zinc-200"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="text-zinc-500 font-medium mt-3">Loading class attendance...</Text>
      </View>
    );
  }

  if (classAttendance.length === 0) {
    return (
      <View
        className="bg-white p-6 rounded-3xl border border-zinc-200"
        style={cardShadow()}
      >
        <Text className="text-lg font-bold text-zinc-900">Class Attendance</Text>
        <Text className="text-zinc-500 mt-2">
          No attendance data is available for your class yet.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row flex-wrap justify-between">
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
          color="#dc2626"
        />
        <StatCard
          title="Top Performer"
          value={classData.topPerformer?.cic || 'N/A'}
          icon={TrendingUp}
          footer={`${classData.topPerformer?.percentage?.toFixed(1) || '0.0'}%`}
          color="#16a34a"
        />
      </View>

      <View
        className="bg-white rounded-3xl p-5 border border-zinc-200 mt-4"
        style={cardShadow()}
      >
        <Text className="text-xl font-bold text-zinc-900 mb-4">Student Performance</Text>

        <View className="flex-row bg-zinc-100 p-1 rounded-xl mb-4">
          <ViewToggleButton
            label="Chart"
            active={view === 'chart'}
            onPress={() => setView('chart')}
            icon={<BarChart2 size={16} color={view === 'chart' ? '#09090b' : '#71717a'} />}
          />
          <ViewToggleButton
            label="List"
            active={view === 'details'}
            onPress={() => setView('details')}
            icon={<List size={16} color={view === 'details' ? '#09090b' : '#71717a'} />}
          />
          <ViewToggleButton
            label="Live"
            active={view === 'status'}
            onPress={() => setView('status')}
            icon={<Clock size={16} color={view === 'status' ? '#09090b' : '#71717a'} />}
          />
        </View>

        {(view === 'details' || view === 'status') && (
          <View className="flex-row items-center bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-4">
            <Search size={20} color="#a1a1aa" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="Search by name or CIC..."
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        )}

        {view === 'chart' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
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
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`,
                barPercentage: 0.5,
                decimalPlaces: 0,
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
                className="bg-white p-4 rounded-xl border border-zinc-200 flex-row items-center justify-between mb-3"
              >
                <View className="flex-1 pr-4">
                  <Text className="font-bold text-zinc-900 text-base">{student.name}</Text>
                  <Text className="text-xs text-zinc-500 mt-1">CIC: {student.cic || 'N/A'}</Text>

                  <View className="flex-row items-center mt-2">
                    <View style={{ width: 96, marginRight: 12 }}>
                      <ProgressBar percentage={student.percentage} />
                    </View>
                    <Text className="text-xs font-semibold text-zinc-500">
                      {student.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  {student.points < 10 ? (
                    <Text className="font-bold text-xl text-red-600">{student.points}</Text>
                  ) : (
                    <Text className="font-bold text-xl text-blue-600">{student.points}</Text>
                  )}
                  <Text className="text-xs text-zinc-400 font-medium">/ 20 Pts</Text>
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
                className="bg-white p-4 rounded-xl border border-zinc-200 mb-3"
              >
                <Text className="font-bold text-zinc-900 mb-1">{student.name}</Text>
                <Text className="text-xs text-zinc-500 mb-3">CIC: {student.cic || 'N/A'}</Text>

                {student.today_attendance?.is_leave_day ? (
                  <Text className="text-sm font-semibold text-blue-600">Leave Day</Text>
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
                            className="items-center justify-center py-2 rounded-lg border bg-green-50 border-green-200"
                          >
                            <Text className="text-[10px] font-bold text-zinc-600 mb-1">
                              P{i + 1}
                            </Text>
                            <CheckCircle2 size={16} color="#16a34a" />
                          </TouchableOpacity>
                        );
                      }

                      if (isExcused) {
                        return (
                          <TouchableOpacity
                            key={period}
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
                            className="items-center justify-center py-2 rounded-lg border bg-blue-50 border-blue-200"
                          >
                            <Text className="text-[10px] font-bold text-zinc-600 mb-1">
                              P{i + 1}
                            </Text>
                            <AlertCircle size={16} color="#3b82f6" />
                          </TouchableOpacity>
                        );
                      }

                      return (
                        <TouchableOpacity
                          key={period}
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
                          className="items-center justify-center py-2 rounded-lg border bg-red-50 border-red-200"
                        >
                          <Text className="text-[10px] font-bold text-zinc-600 mb-1">
                            P{i + 1}
                          </Text>
                          <XCircle size={16} color="#dc2626" />
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

      <Modal
        visible={!!selectedAbsence}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setSelectedAbsence(null)}
      >
        <View className="flex-1 bg-zinc-100 justify-center items-center p-6">
          <View
            className="bg-white rounded-3xl w-full p-6 border border-zinc-200"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-zinc-900">
                {selectedAbsence?.reason}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAbsence(null)}>
                <X size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            <Text className="text-zinc-700 mb-2 font-medium">
              {selectedAbsence?.name}
            </Text>
            <Text className="text-zinc-500 mb-2">
              CIC: {selectedAbsence?.cic}
            </Text>
            <Text className="text-zinc-500 mb-3">
              Period {selectedAbsence?.period}
            </Text>
            <Text className="text-zinc-600">{selectedAbsence?.desc}</Text>

            <TouchableOpacity
              onPress={() => setSelectedAbsence(null)}
              className="mt-6 bg-zinc-900 py-3 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}