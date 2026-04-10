import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { format } from "date-fns";
import Svg, { Circle } from "react-native-svg";
import {
  CalendarCheck2,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

interface AttendanceSummary {
  total_present: number;
  total_days: number;
}
interface PeriodDetail {
  status: "Present" | "Absent";
  reason?: string;
  description?: string;
}
interface TodaysAttendanceRecord {
  date: string;
  is_leave_day: boolean;
  [key: string]: any;
}

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ["Cic Related", "Wsf Related", "Exam Related"];

function RadialProgress({
  percentage,
  colorHex,
}: {
  percentage: number;
  colorHex: string;
}) {
  const radius = 56;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.radialWrap}>
      <Svg
        height="100%"
        width="100%"
        viewBox="0 0 120 120"
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx="60"
          cy="60"
          r={normalizedRadius}
          stroke={theme.colors.surfaceMuted}
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx="60"
          cy="60"
          r={normalizedRadius}
          stroke={colorHex}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>

      <View style={styles.radialCenter}>
        <Text style={styles.radialValue}>{percentage.toFixed(0)}%</Text>
        <Text style={styles.radialLabel}>Overall</Text>
      </View>
    </View>
  );
}

function toneForPeriod(detail?: PeriodDetail) {
  const isPresent = detail?.status === "Present";
  const isExcused = excusedAbsences.includes(detail?.reason || "");

  if (isPresent) {
    return {
      bg: theme.colors.successSoft,
      border: "rgba(22,163,74,0.14)",
      icon: <CheckCircle2 size={15} color={theme.colors.success} />,
    };
  }

  if (isExcused) {
    return {
      bg: theme.colors.primarySoft,
      border: theme.colors.primaryTint,
      icon: <AlertCircle size={15} color={theme.colors.primary} />,
    };
  }

  return {
    bg: theme.colors.errorSoft,
    border: "rgba(220,38,38,0.14)",
    icon: <XCircle size={15} color={theme.colors.error} />,
  };
}

export default function StudentAttendanceCard() {
  const { user, loading: userLoading } = useUserData();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<AttendanceSummary | null>(null);
  const [todayData, setTodayData] = useState<TodaysAttendanceRecord | null>(null);
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null);

  const todayString = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (userLoading || !user) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);

      const [{ data: summary }, { data: todayRecord }] = await Promise.all([
        supabase
          .from("students_with_attendance")
          .select("total_present, total_days")
          .eq("uid", user.id)
          .single(),
        supabase
          .from("attendance")
          .select("*")
          .eq("student_uid", user.id)
          .eq("date", todayString)
          .single(),
      ]);

      if (summary) setSummaryData(summary);
      if (todayRecord) setTodayData(todayRecord as TodaysAttendanceRecord);

      setLoading(false);
    };

    fetchInitialData();

    const channel = supabase
      .channel(`attendance-channel-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `student_uid=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as TodaysAttendanceRecord;
          if (newRecord?.date === todayString) setTodayData(newRecord);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userLoading, todayString]);

  const info = useMemo(() => {
    if (!summaryData) return null;

    const { total_present, total_days } = summaryData;
    const percentage = total_days > 0 ? (total_present / total_days) * 100 : 0;

    let status = "Poor";
    let hex = theme.colors.error;
    let desc = "Attendance is critically low.";

    if (percentage >= 90) {
      status = "Excellent";
      hex = theme.colors.success;
      desc = "Your attendance is excellent.";
    } else if (percentage >= 75) {
      status = "Good";
      hex = theme.colors.primary;
      desc = "You are maintaining a safe attendance range.";
    } else if (percentage >= 60) {
      status = "Needs Focus";
      hex = theme.colors.accent;
      desc = "Your attendance is dropping and needs attention.";
    }

    return {
      percentage,
      status,
      hex,
      desc,
      total_present,
      total_days,
    };
  }, [summaryData]);

  if (loading || userLoading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  if (!info) {
    return (
      <View style={styles.rootCard}>
        <Text style={styles.title}>Attendance Overview</Text>
        <Text style={styles.subtitle}>No attendance data available yet.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.rootCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <CalendarCheck2 size={22} color={theme.colors.primary} />
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  info.status === "Excellent"
                    ? theme.colors.successSoft
                    : info.status === "Good"
                    ? theme.colors.primarySoft
                    : info.status === "Needs Focus"
                    ? theme.colors.accentSoft
                    : theme.colors.errorSoft,
              },
            ]}
          >
            {info.status === "Excellent" || info.status === "Good" ? (
              <TrendingUp
                size={14}
                color={
                  info.status === "Excellent"
                    ? theme.colors.success
                    : theme.colors.primary
                }
              />
            ) : (
              <TrendingDown
                size={14}
                color={
                  info.status === "Needs Focus"
                    ? theme.colors.accent
                    : theme.colors.error
                }
              />
            )}
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    info.status === "Excellent"
                      ? theme.colors.success
                      : info.status === "Good"
                      ? theme.colors.primary
                      : info.status === "Needs Focus"
                      ? theme.colors.accent
                      : theme.colors.error,
                },
              ]}
            >
              {info.status}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Attendance Overview</Text>
        <Text style={styles.subtitle}>{info.desc}</Text>

        <View style={styles.radialSection}>
          <RadialProgress percentage={info.percentage} colorHex={info.hex} />
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Present Days</Text>
            <Text style={styles.metricValue}>{info.total_present}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Days</Text>
            <Text style={styles.metricValue}>{info.total_days}</Text>
          </View>
        </View>

        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={styles.todayHeaderLeft}>
              <View style={styles.todayIconWrap}>
                <CalendarDays size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.todayTitle}>Today’s Attendance</Text>
                <Text style={styles.todaySubtitle}>{format(new Date(), "PPP")}</Text>
              </View>
            </View>
          </View>

          {todayData?.is_leave_day ? (
            <View style={styles.leaveDayBadge}>
              <Text style={styles.leaveDayText}>Leave Day</Text>
            </View>
          ) : todayData ? (
            <View style={styles.periodGrid}>
              {periods.map((period, i) => {
                const detail = todayData?.[period] as PeriodDetail | undefined;
                const tone = toneForPeriod(detail);

                return (
                  <TouchableOpacity
                    key={period}
                    activeOpacity={0.84}
                    onPress={() =>
                      detail?.status !== "Present" &&
                      setSelectedAbsence({
                        period: i + 1,
                        reason: detail?.reason || "Absent",
                        desc: detail?.description || "No description provided.",
                      })
                    }
                    disabled={detail?.status === "Present"}
                    style={[
                      styles.periodBox,
                      {
                        backgroundColor: tone.bg,
                        borderColor: tone.border,
                      },
                    ]}
                  >
                    <Text style={styles.periodBoxLabel}>P{i + 1}</Text>
                    {tone.icon}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.pendingText}>Attendance not submitted yet.</Text>
          )}
        </View>
      </View>

      <Modal
        visible={!!selectedAbsence}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAbsence(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>{selectedAbsence?.reason}</Text>
              <TouchableOpacity
                onPress={() => setSelectedAbsence(null)}
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoLabel}>Missed</Text>
              <Text style={styles.modalInfoValue}>Period {selectedAbsence?.period}</Text>
            </View>

            <Text style={styles.modalSectionTitle}>Description / Note</Text>
            <Text style={styles.modalDescription}>{selectedAbsence?.desc}</Text>

            <TouchableOpacity
              onPress={() => setSelectedAbsence(null)}
              activeOpacity={0.86}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  radialSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  radialWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 144,
    height: 144,
    marginVertical: 8,
  },
  radialCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  radialValue: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  radialLabel: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    alignItems: "center",
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  metricValue: {
    marginTop: 8,
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  todayCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  todayHeader: {
    marginBottom: 14,
  },
  todayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginRight: 12,
  },
  todayTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  todaySubtitle: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  leaveDayBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leaveDayText: {
    color: theme.colors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  periodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  periodBox: {
    width: "23.5%",
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  periodBoxLabel: {
    marginBottom: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },
  pendingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    fontStyle: "italic",
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
    marginRight: 12,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalInfoCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 16,
  },
  modalInfoLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  modalInfoValue: {
    marginTop: 5,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  modalSectionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  modalDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },
  primaryButton: {
    marginTop: 20,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
});