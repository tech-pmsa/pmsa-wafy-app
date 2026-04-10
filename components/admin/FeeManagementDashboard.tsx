import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Search,
  Inbox,
  ChevronDown,
  ChevronUp,
  Wallet,
  BarChart3,
  Users,
} from "lucide-react-native";
import { BarChart } from "react-native-chart-kit";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";

const screenWidth = Dimensions.get("window").width;

type SheetData = Record<string, { headers: string[]; rows: string[][] }>;

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<any>;
  tone?: "primary" | "success" | "accent";
}) {
  const toneMap = {
    primary: {
      bg: theme.colors.primarySoft,
      color: theme.colors.primary,
    },
    success: {
      bg: theme.colors.successSoft,
      color: theme.colors.success,
    },
    accent: {
      bg: theme.colors.accentSoft,
      color: theme.colors.accent,
    },
  } as const;

  const current = toneMap[tone];

  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <Text style={styles.statLabel}>{title}</Text>
        <View style={[styles.statIconWrap, { backgroundColor: current.bg }]}>
          <Icon size={17} color={current.color} />
        </View>
      </View>

      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statDescription}>{description}</Text>
    </View>
  );
}

function PaymentBadge({
  status,
  amount,
}: {
  status: "paid" | "unpaid" | "not_applicable";
  amount: number;
}) {
  if (status === "paid") {
    return (
      <View style={styles.paymentRow}>
        <CheckCircle2 size={18} color={theme.colors.success} />
        <Text style={styles.paymentMeta}>₹{amount.toLocaleString("en-IN")}</Text>
      </View>
    );
  }

  if (status === "not_applicable") {
    return (
      <View style={styles.paymentRow}>
        <MinusCircle size={18} color={theme.colors.textMuted} />
        <Text style={styles.paymentMeta}>N/A</Text>
      </View>
    );
  }

  return (
    <View style={styles.paymentRow}>
      <XCircle size={18} color={theme.colors.error} />
      <Text style={styles.paymentMeta}>Not Paid</Text>
    </View>
  );
}

function StudentFeeList({
  rows,
  monthHeaders,
}: {
  rows: string[][];
  monthHeaders: string[];
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (rows.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Search size={28} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>No Students Found</Text>
        <Text style={styles.emptyText}>Your search returned no results.</Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {rows.map((row, idx) => {
        const studentCIC = row[1];
        const studentName = row[2];
        const monthStartIndex = 3;

        const payments = monthHeaders.map((header, i) => {
          const rawValue = (row[monthStartIndex + i] || "").trim().toLowerCase();
          const amount = parseFloat(rawValue);
          let status: "paid" | "unpaid" | "not_applicable";

          if (rawValue === "a" || rawValue === "yk") status = "not_applicable";
          else if (!isNaN(amount) && amount > 0) status = "paid";
          else status = "unpaid";

          return {
            month: header,
            status,
            amount: status === "paid" ? amount : 0,
          };
        });

        const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const isExpanded = expandedId === idx;

        return (
          <View key={idx} style={styles.studentFeeCard}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setExpandedId(isExpanded ? null : idx)}
              style={styles.studentFeeHeader}
            >
              <View style={styles.studentFeeMain}>
                <Text style={styles.studentName}>{studentName}</Text>
                <Text style={styles.studentMeta}>CIC: {studentCIC}</Text>
              </View>

              <View style={styles.studentFeeRight}>
                <Text style={styles.miniLabel}>Total Paid</Text>
                <View style={styles.totalPaidPill}>
                  <Text style={styles.totalPaidPillText}>
                    ₹{totalAmountPaid.toLocaleString("en-IN")}
                  </Text>
                </View>
                {isExpanded ? (
                  <ChevronUp size={20} color={theme.colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={theme.colors.textMuted} />
                )}
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.studentFeeBody}>
                <View style={styles.monthGrid}>
                  {payments.map((payment) => (
                    <View key={payment.month} style={styles.monthCard}>
                      <Text style={styles.monthTitle}>{payment.month}</Text>
                      <PaymentBadge
                        status={payment.status}
                        amount={payment.amount}
                      />
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

function FeeSheetContent({
  sheetName,
  sheetData,
  role,
  cic,
}: {
  sheetName: string;
  sheetData: { headers: string[]; rows: string[][] };
  role: string | null;
  cic: string | null | undefined;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const { headers, rows } = sheetData;

  const filteredRows = useMemo(() => {
    let baseRows = rows;

    if (role === "student" && cic) {
      baseRows = rows.filter((row) => row[1] === cic);
    }

    if (!searchTerm.trim()) return baseRows;

    const lower = searchTerm.toLowerCase();
    return baseRows.filter(
      (row) =>
        row[1]?.toLowerCase().includes(lower) ||
        row[2]?.toLowerCase().includes(lower)
    );
  }, [rows, searchTerm, role, cic]);

  const summary = useMemo(() => {
    let totalCollected = 0;

    rows.forEach((row) => {
      totalCollected += row.slice(3).reduce((sum, cell) => {
        const val = parseFloat(cell || "0");
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    });

    const averagePaid = rows.length > 0 ? totalCollected / rows.length : 0;

    return {
      totalStudents: rows.length.toString(),
      totalCollected: `₹${totalCollected.toLocaleString("en-IN")}`,
      averagePaid: `₹${averagePaid.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
      })}`,
    };
  }, [rows]);

  const chartData = useMemo(() => {
    const allStudentsData = rows.map((row) => {
      const totalPaid = row.slice(3).reduce((sum, cell) => {
        const val = parseFloat(cell || "0");
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      return { cic: String(row[1] || "N/A"), total: totalPaid };
    });

    return allStudentsData.sort((a, b) => b.total - a.total).slice(0, 10);
  }, [rows]);

  return (
    <View style={styles.sheetWrap}>
      <View style={styles.statsGrid}>
        <StatCard
          title="Students"
          value={summary.totalStudents}
          description={`In ${sheetName}`}
          icon={Users}
          tone="primary"
        />
        <StatCard
          title="Collected"
          value={summary.totalCollected}
          description="Total sum"
          icon={Wallet}
          tone="success"
        />
        <StatCard
          title="Avg. Paid"
          value={summary.averagePaid}
          description="Per student"
          icon={BarChart3}
          tone="accent"
        />
      </View>

      {role !== "student" && chartData.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top 10 Payments</Text>
          <Text style={styles.chartSubtitle}>
            Ranked by highest amount paid
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContent}
          >
            <BarChart
              data={{
                labels: chartData.map((d) => d.cic),
                datasets: [{ data: chartData.map((d) => d.total) }],
              }}
              width={Math.max(screenWidth - 40, chartData.length * 78)}
              height={300}
              yAxisLabel="₹"
              yAxisSuffix=""
              fromZero
              verticalLabelRotation={70}
              showValuesOnTopOfBars={false}
              chartConfig={{
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                labelColor: (opacity = 1) => `rgba(66,82,107,${opacity})`,
                barPercentage: 0.6,
                decimalPlaces: 0,
                propsForBackgroundLines: { strokeWidth: 0 },
                propsForLabels: {
                  fontFamily: "System",
                  fontWeight: "600",
                },
              }}
              style={styles.chart}
            />
          </ScrollView>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Student Name or CIC..."
          placeholderTextColor={
            theme.colors.inputPlaceholder ?? theme.colors.textMuted
          }
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <StudentFeeList rows={filteredRows} monthHeaders={headers.slice(3)} />
    </View>
  );
}

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

        const { data, error } = await supabase.functions.invoke("fetch-fees");

        if (error || !data) throw new Error("Failed to fetch fee data.");

        const cleanedData: SheetData = {};

        for (const sheetName in data) {
          const { headers, rows } = data[sheetName];
          if (!headers?.length || !rows?.length) continue;

          const validRows = rows.filter(
            (row: any) => Array.isArray(row) && row[1]?.trim() && row[2]?.trim()
          );

          if (validRows.length > 0) {
            cleanedData[sheetName] = { headers, rows: validRows };
          }
        }

        if (Object.keys(cleanedData).length > 0) {
          setSheetData(cleanedData);
          const sheetKeys = Object.keys(cleanedData);

          if (role === "officer" || role === "staff") {
            setActiveTab(sheetKeys[0]);
          } else {
            const batch = details?.batch;
            const matchedTab = batch
              ? sheetKeys.find(
                  (name) =>
                    name.toLowerCase().trim() === batch.toLowerCase().trim()
                )
              : null;
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
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading fee dashboard...</Text>
      </View>
    );
  }

  if (!sheetData) {
    return (
      <View style={styles.emptyBigCard}>
        <Inbox size={40} color={theme.colors.textMuted} />
        <Text style={styles.emptyBigTitle}>No Data Available</Text>
        <Text style={styles.emptyBigText}>
          There is no fee data to display at this time.
        </Text>
      </View>
    );
  }

  const sheetNames = Object.keys(sheetData);

  return (
    <View style={styles.root}>
      <View style={styles.headerWrap}>
        <Text style={styles.sectionTitle}>Fee Management</Text>
        <Text style={styles.sectionSubtitle}>
          {role === "officer" || role === "staff"
            ? "Select a class to view fee details."
            : "Fee overview for your batch."}
        </Text>
      </View>

      {(role === "officer" || role === "staff") && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {sheetNames.map((name) => (
            <TouchableOpacity
              key={name}
              onPress={() => setActiveTab(name)}
              activeOpacity={0.84}
              style={[styles.tabChip, activeTab === name && styles.tabChipActive]}
            >
              <Text
                style={[
                  styles.tabChipText,
                  activeTab === name && styles.tabChipTextActive,
                ]}
              >
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab && sheetData[activeTab] ? (
        <FeeSheetContent
          sheetName={activeTab}
          sheetData={sheetData[activeTab]}
          role={role}
          cic={details?.cic}
        />
      ) : (
        <View style={styles.emptyInline}>
          <Text style={styles.emptyInlineText}>Select a valid sheet.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingBottom: 8 },
  headerWrap: { marginBottom: 14, marginTop: 2 },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  tabRow: {
    paddingBottom: 2,
    gap: 8,
    marginBottom: 10,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tabChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  tabChipTextActive: {
    color: theme.colors.textOnDark,
  },
  sheetWrap: { marginTop: 8 },
  statsGrid: { gap: 12, marginBottom: 16 },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.soft,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  statDescription: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "MullerMedium",
    textTransform: "uppercase",
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  chartTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  chartSubtitle: {
    marginTop: 5,
    marginBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  chartScrollContent: { paddingRight: 20, paddingBottom: 4 },
  chart: { borderRadius: 16 },
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 14,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  stack: { gap: 12, paddingBottom: 10 },
  studentFeeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  studentFeeHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentFeeMain: {
    flex: 1,
    paddingRight: 12,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  studentMeta: {
    marginTop: 4,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  studentFeeRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  miniLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  totalPaidPill: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  totalPaidPillText: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },
  studentFeeBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 14,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  monthCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 12,
  },
  monthTitle: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  paymentRow: { flexDirection: "row", alignItems: "center" },
  paymentMeta: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },
  loadingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.medium,
  },
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  emptyBigCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 40,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.medium,
  },
  emptyBigTitle: {
    marginTop: 14,
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "MullerBold",
  },
  emptyBigText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  emptyState: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
  emptyInline: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyInlineText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
});