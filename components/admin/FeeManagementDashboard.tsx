import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { CheckCircle2, XCircle, MinusCircle, Search, Inbox, ChevronDown, ChevronUp } from 'lucide-react-native';
import { BarChart } from 'react-native-chart-kit';
import { useUserData } from '@/hooks/useUserData';
import { supabase } from '@/lib/supabaseClient';

const screenWidth = Dimensions.get("window").width;

type SheetData = Record<string, { headers: string[]; rows: string[][] }>;

// --- Reusable Stat Card ---
function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <View className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex-1 min-w-[140px] m-1">
      <Text className="text-sm font-medium text-zinc-600 mb-1">{title}</Text>
      <Text className="text-2xl font-bold text-zinc-900">{value}</Text>
      <Text className="text-xs text-zinc-500 mt-1">{description}</Text>
    </View>
  );
}

// --- Custom Native Accordion List ---
function StudentFeeList({ rows, monthHeaders }: { rows: string[][]; monthHeaders: string[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (rows.length === 0) {
    return (
      <View className="items-center justify-center py-10 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50 mt-4">
        <Search size={32} color="#a1a1aa" />
        <Text className="mt-2 font-semibold text-zinc-700">No Students Found</Text>
        <Text className="text-sm text-zinc-500">Your search returned no results.</Text>
      </View>
    );
  }

  return (
    <View className="mt-4 space-y-3 pb-10">
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
          <View key={idx} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setExpandedId(isExpanded ? null : idx)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="font-bold text-zinc-900 text-base">{studentName}</Text>
                <Text className="text-sm text-zinc-500">CIC: {studentCIC}</Text>
              </View>
              <View className="items-end flex-row">
                <View className="items-end mr-3">
                  <Text className="text-xs text-zinc-500 mb-0.5">Total Paid</Text>
                  <View className="bg-zinc-100 px-2 py-1 rounded-md">
                    <Text className="font-bold text-zinc-800">
                      ₹{totalAmountPaid.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp size={20} color="#71717a" /> : <ChevronDown size={20} color="#71717a" />}
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View className="px-4 pb-4 border-t border-zinc-100 pt-3">
                <View className="flex-row flex-wrap justify-between">
                  {payments.map((payment) => (
                    <View key={payment.month} className="w-[48%] flex-row items-center mb-3">
                      {payment.status === 'paid' && <CheckCircle2 size={20} color="#16a34a" />}
                      {payment.status === 'unpaid' && <XCircle size={20} color="#dc2626" />}
                      {payment.status === 'not_applicable' && <MinusCircle size={20} color="#a1a1aa" />}
                      <View className="ml-2 flex-1">
                        <Text className="text-sm font-medium text-zinc-900">{payment.month}</Text>
                        <Text className="text-xs text-zinc-500">
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
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 mb-6">
          <Text className="font-bold text-zinc-900 mb-1">Top 10 Payments</Text>
          <Text className="text-xs text-zinc-500 mb-4">Ranked by highest amount paid</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, // Switched to a nice blue
                labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`,
                barPercentage: 0.5,
                decimalPlaces: 0,
                propsForBackgroundLines: { strokeWidth: 0 },
              }}
              verticalLabelRotation={70}
              showValuesOnTopOfBars={false}
              fromZero
            />
          </ScrollView>
        </View>
      )}

      {/* Search & List */}
      <View className="flex-row items-center bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-sm">
        <Search size={20} color="#a1a1aa" />
        <TextInput
          className="flex-1 ml-2 text-base text-zinc-900"
          placeholder="Search by Student Name or CIC..."
          placeholderTextColor="#a1a1aa"
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
      <View className="bg-white p-6 rounded-3xl items-center justify-center h-64 border border-zinc-200 shadow-sm">
        <ActivityIndicator size="large" color="#09090b" />
        <Text className="mt-4 text-zinc-500 font-medium">Loading Fee Dashboard...</Text>
      </View>
    );
  }

  if (!sheetData) {
    return (
      <View className="bg-white p-6 rounded-3xl items-center justify-center border border-zinc-200 shadow-sm py-10">
        <Inbox size={40} color="#a1a1aa" />
        <Text className="mt-4 text-lg font-bold text-zinc-900">No Data Available</Text>
        <Text className="text-zinc-500 mt-1 text-center">There is no fee data to display at this time.</Text>
      </View>
    );
  }

  const sheetNames = Object.keys(sheetData);

  return (
    <View className="bg-zinc-100 rounded-3xl pb-6">
      <View className="mb-4">
        <Text className="text-xl font-bold text-zinc-900">Fee Management</Text>
        <Text className="text-sm text-zinc-500">
          {role === 'officer' ? "Select a class to view fee details." : "Fee overview for your batch."}
        </Text>
      </View>

      {role === 'officer' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {sheetNames.map(name => (
            <TouchableOpacity
              key={name}
              onPress={() => setActiveTab(name)}
              className={`mr-3 px-5 py-2.5 rounded-full border ${activeTab === name ? 'bg-zinc-900 border-zinc-900' : 'bg-white border-zinc-300'}`}
            >
              <Text className={`font-semibold ${activeTab === name ? 'text-white' : 'text-zinc-700'}`}>{name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab && sheetData[activeTab] ? (
        <FeeSheetContent sheetName={activeTab} sheetData={sheetData[activeTab]} role={role} cic={details?.cic} />
      ) : (
        <Text className="text-zinc-500 text-center mt-10">Select a valid sheet.</Text>
      )}
    </View>
  );
}