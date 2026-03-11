import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { CheckCircle2, XCircle, MinusCircle, Search, Inbox, ChevronDown, ChevronUp } from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';
import { COLORS } from '@/constants/theme';

const screenWidth = Dimensions.get("window").width;

type SheetData = Record<string, { headers: string[]; rows: string[][] }>;

function cardShadow() {
  return {
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}

// --- Reusable Stat Card ---
function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <View
      className="bg-[#FFFFFF] p-4 rounded-[14px] border border-[#E2E8F0] flex-1 min-w-[140px] m-1"
      style={cardShadow()}
    >
      <Text className="text-[13px] font-muller-bold text-[#475569] mb-1">{title}</Text>
      <Text className="text-2xl font-muller-bold text-[#0F172A] tracking-tight">{value}</Text>
      <Text className="text-[11px] font-muller text-[#94A3B8] mt-1 uppercase tracking-wider">{description}</Text>
    </View>
  );
}

// --- Custom Native Accordion List ---
function StudentFeeList({ rows, monthHeaders }: { rows: string[][]; monthHeaders: string[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (rows.length === 0) {
    return (
      <View className="items-center justify-center py-10 border border-dashed border-[#E2E8F0] rounded-[16px] bg-[#F8FAFC] mt-2">
        <Search size={32} color="#94A3B8" />
        <Text className="mt-3 font-muller-bold text-[#0F172A]">No Students Found</Text>
        <Text className="text-sm font-muller text-[#475569] mt-1">Your search returned no results.</Text>
      </View>
    );
  }

  return (
    <View className="mt-2 space-y-3 gap-1 pb-10">
      {rows.map((row, idx) => {
        const studentCIC = row[1];
        const studentName = row[2];
        const monthStartIndex = 3;

        const payments = monthHeaders.map((header, i) => {
          const rawValue = (row[monthStartIndex + i] || '').trim().toLowerCase();
          const amount = parseFloat(rawValue);
          let status: 'paid' | 'unpaid' | 'not_applicable';
          if (rawValue === 'a' || rawValue === 'yk') { status = 'not_applicable'; }
          else if (!isNaN(amount) && amount > 0) { status = 'paid'; }
          else { status = 'unpaid'; }
          return { month: header, status, amount: status === 'paid' ? amount : 0 };
        });

        const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const isExpanded = expandedId === idx;

        return (
          <View
            key={idx}
            className="bg-[#FFFFFF] rounded-[16px] border border-[#E2E8F0] overflow-hidden"
            style={cardShadow()}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedId(isExpanded ? null : idx)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-1 pr-2">
                <Text className="font-muller-bold text-[#0F172A] text-[16px] tracking-tight mb-0.5">{studentName}</Text>
                <Text className="text-[13px] font-muller text-[#475569]">CIC: {studentCIC}</Text>
              </View>
              <View className="items-end flex-row">
                <View className="items-end mr-3.5">
                  <Text className="text-[11px] font-muller-bold text-[#94A3B8] mb-1 uppercase tracking-wider">Total Paid</Text>
                  <View className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-[8px]">
                    <Text className="font-muller-bold text-[#0F172A] text-xs">
                      ₹{totalAmountPaid.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp size={22} color="#94A3B8" /> : <ChevronDown size={22} color="#94A3B8" />}
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View className="px-4 pb-4 border-t border-[#E2E8F0] pt-4">
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {payments.map((payment) => (
                    <View key={payment.month} className="w-[48%] flex-row items-center">
                      {payment.status === 'paid' && <CheckCircle2 size={18} color={COLORS.success} />}
                      {payment.status === 'unpaid' && <XCircle size={18} color={COLORS.danger} />}
                      {payment.status === 'not_applicable' && <MinusCircle size={18} color="#94A3B8" />}
                      <View className="ml-2.5 flex-1">
                        <Text className="text-[13px] font-muller-bold text-[#0F172A] mb-0.5">{payment.month}</Text>
                        <Text className="text-[11px] font-muller-bold text-[#475569]">
                          {payment.status === 'paid' ? `₹${payment.amount.toLocaleString('en-IN')}` :
                           payment.status === 'unpaid' ? 'Not Paid' : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// --- Main Fee Sheet Content ---
function FeeSheetContent({ sheetName, sheetData, role, cic }: { sheetName: string; sheetData: { headers: string[]; rows: string[][] }; role: string | null; cic: string | null | undefined; }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { headers, rows } = sheetData;

  const filteredRows = useMemo(() => {
    let baseRows = rows;
    if (role === 'student' && cic) {
      baseRows = rows.filter(row => row[1] === cic);
    }
    if (!searchTerm.trim()) return baseRows;
    const lower = searchTerm.toLowerCase();
    return baseRows.filter(row => row[1]?.toLowerCase().includes(lower) || row[2]?.toLowerCase().includes(lower));
  }, [rows, searchTerm, role, cic]);

  const summary = useMemo(() => {
    let totalCollected = 0;
    rows.forEach(row => {
      totalCollected += row.slice(3).reduce((sum, cell) => {
        const val = parseFloat(cell || '0');
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    });
    const averagePaid = rows.length > 0 ? totalCollected / rows.length : 0;
    return {
      totalStudents: rows.length.toString(),
      totalCollected: `₹${totalCollected.toLocaleString('en-IN')}`,
      averagePaid: `₹${averagePaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    };
  }, [rows]);

  // CRITICAL FIX: Sort by highest payment first, then take top 10, and use CIC!
  const chartData = useMemo(() => {
    // 1. Calculate totals for ALL students
    const allStudentsData = rows.map(row => {
      const totalPaid = row.slice(3).reduce((sum, cell) => {
        const val = parseFloat(cell || '0');
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      // Save the CIC number instead of the name
      return { cic: String(row[1] || 'N/A'), total: totalPaid };
    });

    // 2. Sort descending (highest payers first) and slice the top 10
    return allStudentsData
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [rows]);

  return (
    <View className="mt-4">
      {/* Summary Cards */}
      <View className="flex-row flex-wrap justify-between -mx-1 mb-6">
        <StatCard title="Students" value={summary.totalStudents} description={`In ${sheetName}`} />
        <StatCard title="Collected" value={summary.totalCollected} description="Total sum" />
        <StatCard title="Avg. Paid" value={summary.averagePaid} description="Per student" />
      </View>

      {/* Chart */}
      {role !== 'student' && chartData.length > 0 && (
        <View
          className="bg-[#FFFFFF] p-5 rounded-[18px] border border-[#E2E8F0] mb-6"
          style={cardShadow()}
        >
          <Text className="text-lg font-muller-bold text-[#0F172A] tracking-tight mb-1">Top 10 Payments</Text>
          <Text className="text-[13px] font-muller text-[#475569] mb-6">Ranked by highest amount paid</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-ml-3">
            <BarChart
              data={{
                labels: chartData.map(d => d.cic), // Using CIC here!
                datasets: [{ data: chartData.map(d => d.total) }]
              }}
              width={Math.max(screenWidth - 48, chartData.length * 45)}
              height={300}
              yAxisLabel="₹"
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(30, 64, 175, ${opacity})`, // COLORS.primary
                labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`, // Slate 600
                barPercentage: 0.5,
                decimalPlaces: 0,
                propsForBackgroundLines: { strokeWidth: 0 },
                propsForLabels: { fontFamily: 'System', fontWeight: '600' }
              }}
              verticalLabelRotation={70}
              showValuesOnTopOfBars={false}
              fromZero
            />
          </ScrollView>
        </View>
      )}

      {/* Search & List */}
      <View
        className="flex-row items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-[14px] px-4 py-3.5 mb-2"
        style={cardShadow()}
      >
        <Search size={20} color="#94A3B8" />
        <TextInput
          className="flex-1 ml-3 text-base font-muller text-[#0F172A]"
          placeholder="Search by Student Name or CIC..."
          placeholderTextColor="#94A3B8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <StudentFeeList rows={filteredRows} monthHeaders={headers.slice(3)} />
    </View>
  );
}

// --- Main Dashboard Component ---
export default function FeeManagementDashboard() {
  const { loading: userLoading, role, details } = useUserData();
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    const fetchData = async () => {
      try {
        setIsFetching(true);

        // --- CRITICAL CHANGE: Invoking the Edge Function instead of local API ---
        const { data, error } = await supabase.functions.invoke('fetch-fees');

        if (error || !data) throw new Error('Failed to fetch fee data.');

        const cleanedData: SheetData = {};
        for (const sheetName in data) {
          const { headers, rows } = data[sheetName];
          if (!headers?.length || !rows?.length) continue;
          const validRows = rows.filter((row: any) => Array.isArray(row) && row[1]?.trim() && row[2]?.trim());
          if (validRows.length > 0) { cleanedData[sheetName] = { headers, rows: validRows }; }
        }

        if (Object.keys(cleanedData).length > 0) {
          setSheetData(cleanedData);
          const sheetKeys = Object.keys(cleanedData);
          if (role === 'officer') {
            setActiveTab(sheetKeys[0]);
          } else {
            const batch = details?.batch;
            const matchedTab = batch ? sheetKeys.find(name => name.toLowerCase().trim() === batch.toLowerCase().trim()) : null;
            setActiveTab(matchedTab || null);
          }
        }
      } catch (err: any) {
        console.error("Fee fetch error:", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [role, userLoading, details]);

  if (userLoading || isFetching) {
    return (
      <View
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center my-4 border border-[#E2E8F0]"
        style={cardShadow()}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4 text-[#475569] font-muller font-medium">Loading Fee Dashboard...</Text>
      </View>
    );
  }

  if (!sheetData) {
    return (
      <View
        className="bg-[#FFFFFF] p-8 rounded-[18px] items-center justify-center border border-[#E2E8F0] my-4 py-12"
        style={cardShadow()}
      >
        <Inbox size={44} color="#94A3B8" />
        <Text className="mt-5 text-lg font-muller-bold text-[#0F172A] tracking-tight">No Data Available</Text>
        <Text className="text-[#475569] font-muller mt-1 text-center">There is no fee data to display at this time.</Text>
      </View>
    );
  }

  const sheetNames = Object.keys(sheetData);

  return (
    <View className="pb-6">
      <View className="mb-5 mt-2">
        <Text className="text-xl font-muller-bold text-[#0F172A] tracking-tight mb-0.5">Fee Management</Text>
        <Text className="text-sm font-muller text-[#475569]">
          {role === 'officer' ? "Select a class to view fee details." : "Fee overview for your batch."}
        </Text>
      </View>

      {role === 'officer' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {sheetNames.map(name => (
            <TouchableOpacity
              key={name}
              onPress={() => setActiveTab(name)}
              activeOpacity={0.7}
              className={`mr-2.5 px-5 py-2.5 rounded-[14px] border ${
                activeTab === name
                  ? 'bg-[#1E40AF] border-[#1E40AF]'
                  : 'bg-[#FFFFFF] border-[#E2E8F0]'
              }`}
            >
              <Text className={`font-muller-bold text-[13px] tracking-wide ${
                activeTab === name ? 'text-white' : 'text-[#475569]'
              }`}>{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab && sheetData[activeTab] ? (
        <FeeSheetContent sheetName={activeTab} sheetData={sheetData[activeTab]} role={role} cic={details?.cic} />
      ) : (
        <View className="items-center mt-10">
          <Text className="text-[#475569] font-muller">Select a valid sheet.</Text>
        </View>
      )}
    </View>
  );
}