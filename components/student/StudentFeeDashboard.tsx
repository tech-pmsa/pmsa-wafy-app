import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Wallet,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

function PaymentRow({
  month,
  status,
  amount,
}: {
  month: string;
  status: "paid" | "unpaid" | "not_applicable";
  amount: number;
}) {
  return (
    <View style={styles.paymentItem}>
      {status === "paid" && <CheckCircle2 size={18} color={theme.colors.success} />}
      {status === "unpaid" && <XCircle size={18} color={theme.colors.error} />}
      {status === "not_applicable" && (
        <MinusCircle size={18} color={theme.colors.textMuted} />
      )}

      <View style={styles.paymentItemTextWrap}>
        <Text style={styles.paymentItemMonth}>{month}</Text>
        <Text style={styles.paymentItemMeta}>
          {status === "paid"
            ? `₹${amount}`
            : status === "unpaid"
            ? "Pending"
            : "N/A"}
        </Text>
      </View>
    </View>
  );
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
        const { data, error } = await supabase.functions.invoke("fetch-fees");
        if (error || !data) throw new Error();

        const sheetName = Object.keys(data).find(
          (name) => name.toLowerCase().trim() === batch.toLowerCase().trim()
        );

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
      const rawValue = (studentRow[3 + i] || "").trim().toLowerCase();
      const amount = parseFloat(rawValue);
      let status: "paid" | "unpaid" | "not_applicable" = "unpaid";

      if (rawValue === "a" || rawValue === "yk") status = "not_applicable";
      else if (!isNaN(amount) && amount > 0) status = "paid";

      return {
        month,
        status,
        amount: status === "paid" ? amount : 0,
      };
    });

    const applicable = payments.filter((p: any) => p.status !== "not_applicable");
    const paidCount = applicable.filter((p: any) => p.status === "paid").length;
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    return { payments, paidCount, total: applicable.length, totalPaid };
  }, [feeData]);

  if (isFetching || userLoading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading fee details...</Text>
      </View>
    );
  }

  if (!processedFees) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No fee record found.</Text>
      </View>
    );
  }

  const { payments, paidCount, total, totalPaid } = processedFees;
  const isFullyPaid = paidCount >= total && total > 0;

  return (
    <View style={styles.rootCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerIconWrap}>
          <Wallet size={22} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={styles.title}>My Fee Details</Text>
      <Text style={styles.subtitle}>Summary of your monthly payments.</Text>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.smallLabel}>Payment Status</Text>
          <View
            style={[
              styles.statusPill,
              isFullyPaid ? styles.statusPillPaid : styles.statusPillPending,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isFullyPaid
                  ? styles.statusPillTextPaid
                  : styles.statusPillTextPending,
              ]}
            >
              {isFullyPaid ? "Fully Paid" : "Pending"}
            </Text>
          </View>

          <Text style={styles.monthCountText}>
            {paidCount} of {total} months paid
          </Text>
        </View>

        <View style={styles.amountWrap}>
          <Text style={styles.smallLabel}>Total Paid</Text>
          <Text style={styles.totalPaidValue}>
            ₹{totalPaid.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.84}
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.breakdownToggle}
      >
        <Text style={styles.breakdownToggleText}>View Monthly Breakdown</Text>
        {isExpanded ? (
          <ChevronUp size={20} color={theme.colors.textMuted} />
        ) : (
          <ChevronDown size={20} color={theme.colors.textMuted} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.breakdownWrap}>
          {payments.map((p: any) => (
            <PaymentRow
              key={p.month}
              month={p.month}
              status={p.status}
              amount={p.amount}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
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
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 26,
    paddingHorizontal: 18,
    ...theme.shadows.soft,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  headerRow: {
    marginBottom: 12,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  summaryCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  smallLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillPaid: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusPillPending: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusPillText: {
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  statusPillTextPaid: {
    color: theme.colors.success,
  },
  statusPillTextPending: {
    color: theme.colors.error,
  },
  monthCountText: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  amountWrap: {
    alignItems: "flex-end",
  },
  totalPaidValue: {
    color: theme.colors.primary,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: "MullerBold",
  },
  breakdownToggle: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownToggleText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  breakdownWrap: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  paymentItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 12,
  },
  paymentItemTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  paymentItemMonth: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  paymentItemMeta: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },
});