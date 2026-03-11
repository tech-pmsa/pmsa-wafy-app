import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

export default function StudentFeeDashboard() {
  const { loading: userLoading, details } = useUserData();
  const [feeData, setFeeData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const batch = details?.batch;
    const cic = details?.cic;
    if (userLoading || !batch || !cic) {
      if (!userLoading) setIsFetching(false);
      return;
    }

    const fetchData = async () => {
      setIsFetching(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-fees');
        if (error || !data) throw new Error();

        const sheetName = Object.keys(data).find(name => name.toLowerCase().trim() === batch.toLowerCase().trim());
        if (sheetName) {
          const { headers, rows } = data[sheetName];
          const studentRow = rows.find((r: any) => r[1] === cic);
          if (studentRow) setFeeData({ headers, studentRow });
        }
      } catch (err) {
        console.error("Fee fetch error", err);
      }
      setIsFetching(false);
    };
    fetchData();
  }, [userLoading, details]);

  const processedFees = useMemo(() => {
    if (!feeData) return null;
    const { headers, studentRow } = feeData;
    const monthHeaders = headers.slice(3);

    const payments = monthHeaders.map((month: string, i: number) => {
      const rawValue = (studentRow[3 + i] || '').trim().toLowerCase();
      const amount = parseFloat(rawValue);
      let status: 'paid' | 'unpaid' | 'not_applicable' = 'unpaid';
      if (rawValue === 'a' || rawValue === 'yk') status = 'not_applicable';
      else if (!isNaN(amount) && amount > 0) status = 'paid';

      return { month, status, amount: status === 'paid' ? amount : 0 };
    });

    const applicable = payments.filter((p: any) => p.status !== 'not_applicable');
    const paidCount = applicable.filter((p: any) => p.status === 'paid').length;
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    return { payments, paidCount, total: applicable.length, totalPaid };
  }, [feeData]);

  if (isFetching || userLoading) {
    return (
      <View
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center my-2 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Fee Details...</Text>
      </View>
    );
  }

  if (!processedFees) {
    return (
      <View className="bg-[#FFFFFF] p-6 rounded-[18px] border border-[#E2E8F0] my-2" style={cardShadow()}>
        <Text className="text-[#475569] font-muller text-center">No fee record found.</Text>
      </View>
    );
  }

  const { payments, paidCount, total, totalPaid } = processedFees;
  const isFullyPaid = paidCount >= total && total > 0;

  return (
    <View
      className="bg-[#FFFFFF] rounded-[18px] border border-[#E2E8F0] p-5 my-2"
      style={cardShadow()}
    >
      <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mb-1">My Fee Details</Text>
      <Text className="text-sm font-muller text-[#475569] mb-5">Summary of your monthly payments.</Text>

      <View className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px] p-5 flex-row items-center justify-between mb-5">
        <View>
          <Text className="text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider mb-2">Payment Status</Text>
          <View className={`px-2.5 py-1.5 rounded-[8px] border ${isFullyPaid ? 'bg-[#16A34A]/10 border-[#16A34A]/20' : 'bg-[#DC2626]/10 border-[#DC2626]/20'} self-start`}>
            <Text className={`text-xs font-muller-bold tracking-wide uppercase ${isFullyPaid ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {isFullyPaid ? 'Fully Paid' : 'Pending'}
            </Text>
          </View>
          <Text className="text-[13px] font-muller-bold text-[#0F172A] mt-3">
            {paidCount} of {total} months paid
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[11px] font-muller-bold text-[#94A3B8] uppercase tracking-wider mb-2">Total Paid</Text>
          <Text className="text-3xl font-muller-bold text-[#1E40AF] tracking-tight">₹{totalPaid.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsExpanded(!isExpanded)}
        className="bg-[#F1F5F9] p-4 rounded-[14px] border border-[#E2E8F0] flex-row justify-between items-center"
      >
        <Text className="font-muller-bold text-[#0F172A] text-[15px]">View Monthly Breakdown</Text>
        {isExpanded ? <ChevronUp size={22} color="#94A3B8" /> : <ChevronDown size={22} color="#94A3B8" />}
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-4 flex-row flex-wrap justify-between border-t border-[#E2E8F0] pt-4">
          {payments.map((p: any) => (
            <View key={p.month} className="w-[48%] flex-row items-center mb-3.5">
              {p.status === 'paid' && <CheckCircle2 size={18} color={COLORS.success} />}
              {p.status === 'unpaid' && <XCircle size={18} color={COLORS.danger} />}
              {p.status === 'not_applicable' && <MinusCircle size={18} color="#94A3B8" />}
              <View className="ml-2.5 flex-1">
                <Text className="text-[13px] font-muller-bold text-[#0F172A] mb-0.5">{p.month}</Text>
                <Text className="text-[11px] font-muller-bold text-[#475569]">
                  {p.status === 'paid' ? `₹${p.amount}` : p.status === 'unpaid' ? 'Pending' : 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}