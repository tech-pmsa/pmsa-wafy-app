import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { format } from 'date-fns';
import Svg, { Circle } from 'react-native-svg';
import { CalendarCheck2, CalendarDays, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react-native';

interface AttendanceSummary { total_present: number; total_days: number; }
interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { date: string; is_leave_day: boolean; [key: string]: any; }

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ['Cic Related', 'Wsf Related', 'Exam Related'];

function RadialProgress({ percentage, colorHex }: { percentage: number; colorHex: string }) {
  const radius = 52;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View className="items-center justify-center h-36 w-36 mb-4">
      <Svg height="100%" width="100%" viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="60" cy="60" r={normalizedRadius} stroke="#f4f4f5" strokeWidth={stroke} fill="transparent" />
        <Circle
          cx="60" cy="60" r={normalizedRadius}
          stroke={colorHex} strokeWidth={stroke} fill="transparent"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-3xl font-bold text-zinc-900">{percentage.toFixed(0)}%</Text>
        <Text className="text-xs text-zinc-500 font-medium">Overall</Text>
      </View>
    </View>
  );
}

export default function StudentAttendanceCard() {
  const { user, loading: userLoading } = useUserData();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<AttendanceSummary | null>(null);
  const [todayData, setTodayData] = useState<TodaysAttendanceRecord | null>(null);
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null);

  const todayString = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (userLoading || !user) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      const [{ data: summary }, { data: todayRecord }] = await Promise.all([
        supabase.from('students_with_attendance').select('total_present, total_days').eq('uid', user.id).single(),
        supabase.from('attendance').select('*').eq('student_uid', user.id).eq('date', todayString).single()
      ]);

      if (summary) setSummaryData(summary);
      if (todayRecord) setTodayData(todayRecord as TodaysAttendanceRecord);
      setLoading(false);
    };
    fetchInitialData();

    const channel = supabase.channel(`attendance-channel-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_uid=eq.${user.id}` },
        (payload) => {
          const newRecord = payload.new as TodaysAttendanceRecord;
          if (newRecord.date === todayString) setTodayData(newRecord);
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, userLoading, todayString]);

  const info = useMemo(() => {
    if (!summaryData) return null;
    const { total_present, total_days } = summaryData;
    const percentage = total_days > 0 ? (total_present / total_days) * 100 : 0;

    let status = 'Poor'; let hex = '#dc2626'; let desc = 'Attendance is critically low.'; let Icon = TrendingDown;
    if (percentage >= 75) { status = 'Good'; hex = '#16a34a'; desc = "Excellent work! You're on track."; Icon = TrendingUp; }
    else if (percentage >= 50) { status = 'Average'; hex = '#ca8a04'; desc = 'Room for improvement.'; Icon = TrendingUp; }

    return { total_present, total_days, percentage, status, hex, desc, Icon };
  }, [summaryData]);

  if (loading || userLoading) return <ActivityIndicator size="large" color="#09090b" className="my-6" />;
  if (!info) return <View className="bg-white p-6 rounded-3xl"><Text className="text-zinc-500 text-center">No attendance record found.</Text></View>;

  return (
    <View className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-5">
      <Text className="text-xl font-bold text-zinc-900 mb-1">My Attendance</Text>
      <Text className="text-sm text-zinc-500 mb-6">Your overall summary and today's live status.</Text>

      <View className="items-center">
        <RadialProgress percentage={info.percentage} colorHex={info.hex} />

        <View className="flex-row bg-zinc-100 rounded-2xl p-4 w-full mb-4">
          <View className="flex-1 items-center border-r border-zinc-200">
            <CalendarCheck2 size={24} color="#71717a" />
            <Text className="text-xl font-bold text-zinc-900 mt-1">{info.total_present}</Text>
            <Text className="text-xs text-zinc-500">Days Present</Text>
          </View>
          <View className="flex-1 items-center">
            <CalendarDays size={24} color="#71717a" />
            <Text className="text-xl font-bold text-zinc-900 mt-1">{info.total_days}</Text>
            <Text className="text-xs text-zinc-500">Total Days</Text>
          </View>
        </View>

        <View className="flex-row items-center w-full bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <info.Icon size={20} color={info.hex} />
          <View className="ml-3">
            <Text style={{ color: info.hex }} className="font-bold">{info.status} Standing</Text>
            <Text className="text-xs text-zinc-500">{info.desc}</Text>
          </View>
        </View>
      </View>

      <View className="border-t border-zinc-100 mt-6 pt-4">
        <Text className="font-bold text-zinc-900 text-center mb-4">Today's Status ({format(new Date(), 'PPP')})</Text>

        {!todayData ? (
          <Text className="text-center text-zinc-500 italic bg-zinc-50 p-3 rounded-lg border border-zinc-200">Pending class leader submission...</Text>
        ) : todayData.is_leave_day ? (
          <Text className="text-center text-blue-600 font-medium bg-blue-50 p-3 rounded-lg border border-blue-200">Leave Day - No attendance recorded.</Text>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {periods.map((period, i) => {
              const detail = todayData[period] as PeriodDetail;
              const isPresent = detail?.status === 'Present';
              const isExcused = excusedAbsences.includes(detail?.reason || '');

              let IconComp = XCircle; let color = "#dc2626"; let bg = "bg-red-50";
              if (isPresent) { IconComp = CheckCircle2; color = "#16a34a"; bg = "bg-green-50"; }
              else if (isExcused) { IconComp = AlertCircle; color = "#2563eb"; bg = "bg-blue-50"; }

              return (
                <TouchableOpacity
                  key={period}
                  disabled={isPresent}
                  onPress={() => setSelectedAbsence({ p: i+1, r: detail?.reason, d: detail?.description })}
                  className={`w-[23%] items-center justify-center py-3 rounded-xl border border-zinc-200 ${bg}`}
                >
                  <Text className="text-[10px] font-bold text-zinc-600 mb-1">P{i + 1}</Text>
                  <IconComp size={20} color={color} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Modal for viewing absence reason */}
      <Modal visible={!!selectedAbsence} transparent animationType="fade" onRequestClose={() => setSelectedAbsence(null)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-zinc-900">{selectedAbsence?.r || 'Absent'}</Text>
              <TouchableOpacity onPress={() => setSelectedAbsence(null)}><X size={24} color="#71717a" /></TouchableOpacity>
            </View>
            <Text className="text-zinc-500">{selectedAbsence?.d || "No description provided."}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}