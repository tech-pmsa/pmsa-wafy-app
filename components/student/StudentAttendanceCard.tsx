import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { useUserData } from '@/hooks/useUserData';
import { format } from 'date-fns';
import Svg, { Circle } from 'react-native-svg';
import { CalendarCheck2, CalendarDays, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

interface AttendanceSummary { total_present: number; total_days: number; }
interface PeriodDetail { status: 'Present' | 'Absent'; reason?: string; description?: string; }
interface TodaysAttendanceRecord { date: string; is_leave_day: boolean; [key: string]: any; }

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

function RadialProgress({ percentage, colorHex }: { percentage: number; colorHex: string }) {
  const radius = 56;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View className="items-center justify-center h-36 w-36 mb-6 mt-2">
      <Svg height="100%" width="100%" viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx="60" cy="60" r={normalizedRadius} stroke="#F1F5F9" strokeWidth={stroke} fill="transparent" />
        <Circle
          cx="60" cy="60" r={normalizedRadius}
          stroke={colorHex} strokeWidth={stroke} fill="transparent"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-3xl font-muller-bold text-[#0F172A] tracking-tight">{percentage.toFixed(0)}%</Text>
        <Text className="text-[11px] text-[#94A3B8] font-muller-bold mt-1 uppercase tracking-wider">Overall</Text>
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

    let status = 'Poor';
    let hex = COLORS.danger;
    let desc = 'Attendance is critically low.';
    let Icon = TrendingDown;
    let bgClass = 'bg-[#DC2626]/10';
    let borderClass = 'border-[#DC2626]/20';

    if (percentage >= 75) {
      status = 'Good';
      hex = COLORS.success;
      desc = "Excellent work! You're on track.";
      Icon = TrendingUp;
      bgClass = 'bg-[#16A34A]/10';
      borderClass = 'border-[#16A34A]/20';
    } else if (percentage >= 50) {
      status = 'Average';
      hex = COLORS.warning;
      desc = 'Room for improvement.';
      Icon = TrendingUp;
      bgClass = 'bg-[#D97706]/10';
      borderClass = 'border-[#D97706]/20';
    }

    return { total_present, total_days, percentage, status, hex, desc, Icon, bgClass, borderClass };
  }, [summaryData]);

  if (loading || userLoading) {
    return (
      <View
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center my-2 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Attendance...</Text>
      </View>
    );
  }

  if (!info) {
    return (
      <View className="bg-[#FFFFFF] p-6 rounded-[18px] border border-[#E2E8F0]" style={cardShadow()}>
        <Text className="text-[#475569] font-muller text-center">No attendance record found.</Text>
      </View>
    );
  }

  return (
    <View className="bg-[#FFFFFF] rounded-[18px] border border-[#E2E8F0] p-5" style={cardShadow()}>
      <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mb-1">My Attendance</Text>
      <Text className="text-sm font-muller text-[#475569] mb-5">Your overall summary and today's live status.</Text>

      <View className="items-center">
        <RadialProgress percentage={info.percentage} colorHex={info.hex} />

        <View className="flex-row bg-[#F8FAFC] rounded-[16px] border border-[#E2E8F0] p-4 w-full mb-4">
          <View className="flex-1 items-center border-r border-[#E2E8F0]">
            <CalendarCheck2 size={24} color="#94A3B8" />
            <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mt-2">{info.total_present}</Text>
            <Text className="text-[11px] font-muller-bold text-[#475569] mt-0.5 uppercase tracking-wider">Present</Text>
          </View>
          <View className="flex-1 items-center">
            <CalendarDays size={24} color="#94A3B8" />
            <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mt-2">{info.total_days}</Text>
            <Text className="text-[11px] font-muller-bold text-[#475569] mt-0.5 uppercase tracking-wider">Total Days</Text>
          </View>
        </View>

        <View className={`flex-row items-center w-full p-4 rounded-[14px] border ${info.borderClass} ${info.bgClass}`}>
          <info.Icon size={22} color={info.hex} />
          <View className="ml-3.5 flex-1">
            <Text style={{ color: info.hex }} className="font-muller-bold text-[15px]">{info.status} Standing</Text>
            <Text className="text-xs font-muller text-[#475569] mt-0.5">{info.desc}</Text>
          </View>
        </View>
      </View>

      <View className="border-t border-[#E2E8F0] mt-6 pt-5">
        <Text className="font-muller-bold text-[#0F172A] tracking-tight text-center mb-4">
          Today's Status ({format(new Date(), 'PPP')})
        </Text>

        {!todayData ? (
          <Text className="text-center font-muller text-[#94A3B8] italic bg-[#F8FAFC] p-4 rounded-[12px] border border-[#E2E8F0]">
            Pending class leader submission...
          </Text>
        ) : todayData.is_leave_day ? (
          <View className="bg-[#1E40AF]/10 p-4 rounded-[12px] border border-[#1E40AF]/20">
            <Text className="text-center text-[#1E40AF] font-muller-bold">Leave Day</Text>
            <Text className="text-center text-[#1E40AF]/70 font-muller text-xs mt-1">No attendance recorded today.</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between gap-y-2.5">
            {periods.map((period, i) => {
              const detail = todayData[period] as PeriodDetail;
              const isPresent = detail?.status === 'Present';
              const isExcused = excusedAbsences.includes(detail?.reason || '');

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
                  onPress={() => setSelectedAbsence({ p: i+1, r: detail?.reason, d: detail?.description })}
                  className={`w-[23%] items-center justify-center py-3 rounded-[12px] border ${border} ${bg}`}
                >
                  <Text className="text-[11px] font-muller-bold text-[#475569] mb-1.5">P{i + 1}</Text>
                  <IconComp size={18} color={color} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Modal for viewing absence reason */}
      <Modal visible={!!selectedAbsence} transparent animationType="fade" onRequestClose={() => setSelectedAbsence(null)}>
        <View className="flex-1 bg-black/40 justify-center items-center p-6">
          <View
            className="bg-[#FFFFFF] rounded-[20px] w-full p-6 border border-[#E2E8F0]"
            style={cardShadow()}
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight">
                {selectedAbsence?.r || 'Absent'}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedAbsence(null)}
                className="bg-[#F1F5F9] p-2 rounded-full"
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View className="bg-[#F8FAFC] p-4 rounded-[14px] border border-[#E2E8F0] mb-5">
              <Text className="text-[#475569] font-muller text-sm">
                Missed: <Text className="font-muller-bold text-[#0F172A]">Period {selectedAbsence?.p}</Text>
              </Text>
            </View>

            <Text className="text-[#0F172A] font-muller-bold mb-2">Description / Note</Text>
            <Text className="text-[#475569] font-muller leading-relaxed">
              {selectedAbsence?.d || "No description provided."}
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