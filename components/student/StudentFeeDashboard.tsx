import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react-native';

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

  if (isFetching || userLoading) return <ActivityIndicator size="large" color="#09090b" className="my-6" />;
  if (!processedFees) return <View className="bg-white p-6 rounded-3xl"><Text className="text-zinc-500 text-center">No fee record found.</Text></View>;

  const { payments, paidCount, total, totalPaid } = processedFees;
  const isFullyPaid = paidCount >= total && total > 0;

  return (
    <View className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-5">
      <Text className="text-xl font-bold text-zinc-900 mb-1">My Fee Details</Text>
      <Text className="text-sm text-zinc-500 mb-6">Summary of your monthly payments.</Text>

      <View className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xs text-zinc-500 font-medium mb-1">Payment Status</Text>
          <View className={`px-2 py-1 rounded-md ${isFullyPaid ? 'bg-green-100' : 'bg-red-100'} self-start`}>
            <Text className={`text-xs font-bold ${isFullyPaid ? 'text-green-700' : 'text-red-700'}`}>
              {isFullyPaid ? 'Fully Paid' : 'Pending'}
            </Text>
          </View>
          <Text className="text-sm font-semibold text-zinc-900 mt-2">{paidCount} of {total} months paid</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-zinc-500 font-medium mb-1">Total Paid</Text>
          <Text className="text-2xl font-bold text-blue-600">₹{totalPaid.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="bg-zinc-100 p-4 rounded-xl flex-row justify-between items-center"
      >
        <Text className="font-semibold text-zinc-900">View Monthly Breakdown</Text>
        {isExpanded ? <ChevronUp size={20} color="#71717a" /> : <ChevronDown size={20} color="#71717a" />}
      </TouchableOpacity>

      {isExpanded && (
        <View className="mt-3 flex-row flex-wrap justify-between border-t border-zinc-100 pt-3">
          {payments.map((p: any) => (
            <View key={p.month} className="w-[48%] flex-row items-center mb-3">
              {p.status === 'paid' && <CheckCircle2 size={20} color="#16a34a" />}
              {p.status === 'unpaid' && <XCircle size={20} color="#dc2626" />}
              {p.status === 'not_applicable' && <MinusCircle size={20} color="#a1a1aa" />}
              <View className="ml-2 flex-1">
                <Text className="text-sm font-medium text-zinc-900">{p.month}</Text>
                <Text className="text-xs text-zinc-500">
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