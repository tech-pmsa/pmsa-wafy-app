import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { format } from "date-fns";
import { BarChart } from "react-native-chart-kit";
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
  Info,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";

const screenWidth = Dimensions.get("window").width;
const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ["Cic Related", "Wsf Related", "Exam Related"];

type ViewMode = "chart" | "details" | "status";

interface PeriodDetail {
  status?: "Present" | "Absent";
  reason?: string;
  description?: string;
}

function getStatusTone(value: number) {
  if (value < 75) {
    return {
      fill: theme.colors.error,
      soft: theme.colors.errorSoft,
      text: theme.colors.errorText ?? theme.colors.error,
      border: "rgba(220,38,38,0.14)",
    };
  }

  return {
    fill: theme.colors.success,
    soft: theme.colors.successSoft,
    text: theme.colors.successText ?? theme.colors.success,
    border: "rgba(22,163,74,0.14)",
  };
}

function MetricCard({
  title,
  value,
  footer,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string;
  footer: string;
  icon: React.ComponentType<any>;
  tone?: "primary" | "success" | "danger";
}) {
  const toneMap = {
    primary: {
      iconBg: theme.colors.primarySoft,
      iconColor: theme.colors.primary,
    },
    success: {
      iconBg: theme.colors.successSoft,
      iconColor: theme.colors.success,
    },
    danger: {
      iconBg: theme.colors.errorSoft,
      iconColor: theme.colors.error,
    },
  } as const;

  const current = toneMap[tone];

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTopRow}>
        <Text style={styles.metricLabel}>{title}</Text>
        <View style={[styles.metricIconWrap, { backgroundColor: current.iconBg }]}>
          <Icon size={18} color={current.iconColor} />
        </View>
      </View>

      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricFooter}>{footer}</Text>
    </View>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  const safePercentage = Math.max(0, Math.min(100, percentage));
  const tone = getStatusTone(safePercentage);

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${safePercentage}%`,
            backgroundColor: tone.fill,
          },
        ]}
      />
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
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
    >
      {icon}
      <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ClassAttendanceDashboard() {
  const { details, loading: userLoading } = useUserData();
  const [classAttendance, setClassAttendance] = useState<any[]>([]);
  const [view, setView] = useState<ViewMode>("chart");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAbsence, setSelectedAbsence] = useState<{
    name: string;
    cic: string;
    period: number;
    reason: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    const classId = details?.designation?.replace(" Class", "");

    if (userLoading || !classId) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const todayString = format(new Date(), "yyyy-MM-dd");

      const [{ data: summaryData }, { data: todayData }] = await Promise.all([
        supabase
          .from("students_with_attendance")
          .select("uid, name, cic, total_present, total_days")
          .eq("class_id", classId),
        supabase
          .from("attendance")
          .select("*")
          .eq("class_id", classId)
          .eq("date", todayString),
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
      } else {
        setClassAttendance([]);
      }

      setLoading(false);
    };

    fetchData();

    const todayString = format(new Date(), "yyyy-MM-dd");

    const channel = supabase
      .channel(`class-attendance-${classId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
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
      const nameMatch = (s.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const cicMatch = String(s.cic || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return nameMatch || cicMatch;
    });
  }, [classAttendance, searchTerm]);

  const classData = useMemo(() => {
    const processed = filteredStudents
      .map((s) => {
        const totalAbsent = (s.total_days || 0) - (s.total_present || 0);
        const pointsDeducted = Math.floor(totalAbsent / 2) * 2;
        const points = Math.max(0, 20 - pointsDeducted);

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
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading class attendance...</Text>
      </View>
    );
  }

  if (classAttendance.length === 0) {
    return (
      <View style={styles.rootCard}>
        <Text style={styles.title}>Class Attendance</Text>
        <Text style={styles.subtitle}>
          No attendance data is available for your class yet.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Class Average"
          value={`${classData.average.toFixed(1)}%`}
          footer="Overall performance"
          icon={Users}
          tone="primary"
        />
        <MetricCard
          title="Below 75%"
          value={classData.belowThreshold.toString()}
          footer="Need attention"
          icon={AlertTriangle}
          tone="danger"
        />
        <MetricCard
          title="Top Performer"
          value={classData.topPerformer?.cic || "N/A"}
          footer={`${classData.topPerformer?.percentage?.toFixed(1) || "0.0"}%`}
          icon={TrendingUp}
          tone="success"
        />
      </View>

      <View style={styles.rootCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.title}>Student Performance</Text>
          <Text style={styles.subtitle}>
            Chart, detailed list, and today’s live attendance view
          </Text>
        </View>

        <View style={styles.segmentWrap}>
          <ViewToggleButton
            label="Chart"
            active={view === "chart"}
            onPress={() => setView("chart")}
            icon={
              <BarChart2
                size={17}
                color={view === "chart" ? theme.colors.primary : theme.colors.icon ?? theme.colors.textMuted}
              />
            }
          />
          <ViewToggleButton
            label="List"
            active={view === "details"}
            onPress={() => setView("details")}
            icon={
              <List
                size={17}
                color={view === "details" ? theme.colors.primary : theme.colors.icon ?? theme.colors.textMuted}
              />
            }
          />
          <ViewToggleButton
            label="Live"
            active={view === "status"}
            onPress={() => setView("status")}
            icon={
              <Clock
                size={17}
                color={view === "status" ? theme.colors.primary : theme.colors.icon ?? theme.colors.textMuted}
              />
            }
          />
        </View>

        {(view === "details" || view === "status") && (
          <View style={styles.searchWrap}>
            <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or CIC..."
              placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        )}

        {view === "chart" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContent}
          >
            <BarChart
              data={{
                labels: classData.students.map((s) => String(s.cic || "N/A")),
                datasets: [{ data: classData.students.map((s) => s.percentage) }],
              }}
              width={Math.max(screenWidth - 64, classData.students.length * 60)}
              height={290}
              yAxisLabel=""
              yAxisSuffix="%"
              fromZero
              verticalLabelRotation={70}
              chartConfig={{
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(59,130,246,${opacity})`,
                labelColor: (opacity = 1) => `rgba(66,82,107,${opacity})`,
                barPercentage: 0.5,
                decimalPlaces: 0,
                propsForLabels: {
                  fontFamily: "System",
                  fontWeight: "600",
                },
              }}
              style={styles.chart}
            />
          </ScrollView>
        )}

        {view === "details" && (
          <View style={styles.stack}>
            {classData.students.map((student) => (
              <View key={student.uid} style={styles.studentListCard}>
                <View style={styles.studentListMain}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>CIC: {student.cic || "N/A"}</Text>

                  <View style={styles.percentRow}>
                    <View style={styles.percentBarWrap}>
                      <ProgressBar percentage={student.percentage} />
                    </View>
                    <Text style={styles.percentText}>
                      {student.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.pointsCard}>
                  <Text
                    style={[
                      styles.pointsValue,
                      {
                        color:
                          student.points < 10
                            ? theme.colors.error
                            : theme.colors.primary,
                      },
                    ]}
                  >
                    {student.points}
                  </Text>
                  <Text style={styles.pointsSub}>/ 20 pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {view === "status" && (
          <View style={styles.stack}>
            {classData.students.map((student) => (
              <View key={student.uid} style={styles.statusCard}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>CIC: {student.cic || "N/A"}</Text>

                {student.today_attendance?.is_leave_day ? (
                  <View style={styles.leaveDayBadge}>
                    <Text style={styles.leaveDayText}>Leave Day</Text>
                  </View>
                ) : student.today_attendance ? (
                  <View style={styles.periodGrid}>
                    {periods.map((period, i) => {
                      const detail = student.today_attendance?.[period] as
                        | PeriodDetail
                        | undefined;

                      const isPresent = detail?.status === "Present";
                      const isExcused = excusedAbsences.includes(detail?.reason || "");

                      let bg = theme.colors.errorSoft;
                      let border = "rgba(220,38,38,0.14)";
                      let icon = <XCircle size={15} color={theme.colors.error} />;
                      let onPressable = false;

                      if (isPresent) {
                        bg = theme.colors.successSoft;
                        border = "rgba(22,163,74,0.14)";
                        icon = <CheckCircle2 size={15} color={theme.colors.success} />;
                      } else if (isExcused) {
                        bg = theme.colors.primarySoft;
                        border = "rgba(59,130,246,0.14)";
                        icon = <AlertCircle size={15} color={theme.colors.primary} />;
                        onPressable = true;
                      }

                      return (
                        <TouchableOpacity
                          key={period}
                          activeOpacity={onPressable ? 0.82 : 1}
                          disabled={!onPressable}
                          onPress={() =>
                            setSelectedAbsence({
                              name: student.name,
                              cic: String(student.cic || "N/A"),
                              period: i + 1,
                              reason: detail?.reason || "Excused absence",
                              desc: detail?.description || "No description provided.",
                            })
                          }
                          style={[
                            styles.periodBadge,
                            {
                              backgroundColor: bg,
                              borderColor: border,
                            },
                          ]}
                        >
                          <Text style={styles.periodBadgeLabel}>P{i + 1}</Text>
                          {icon}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.pendingText}>Attendance not submitted yet.</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={!!selectedAbsence}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedAbsence(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.absenceModalCard}>
            <View style={styles.absenceHeader}>
              <View style={styles.absenceIconWrap}>
                <Info size={18} color={theme.colors.primary} />
              </View>

              <TouchableOpacity
                onPress={() => setSelectedAbsence(null)}
                activeOpacity={0.84}
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.absenceTitle}>Excused Absence Details</Text>

            {selectedAbsence ? (
              <>
                <Text style={styles.absenceLine}>
                  <Text style={styles.absenceLabel}>Student: </Text>
                  {selectedAbsence.name}
                </Text>
                <Text style={styles.absenceLine}>
                  <Text style={styles.absenceLabel}>CIC: </Text>
                  {selectedAbsence.cic}
                </Text>
                <Text style={styles.absenceLine}>
                  <Text style={styles.absenceLabel}>Period: </Text>P{selectedAbsence.period}
                </Text>
                <Text style={styles.absenceLine}>
                  <Text style={styles.absenceLabel}>Reason: </Text>
                  {selectedAbsence.reason}
                </Text>

                <View style={styles.descBox}>
                  <Text style={styles.absenceLabel}>Description</Text>
                  <Text style={styles.descText}>{selectedAbsence.desc}</Text>
                </View>
              </>
            ) : null}
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    ...theme.shadows.medium,
  },
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.soft,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerMedium",
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  metricFooter: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  sectionHeader: {
    marginBottom: 16,
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
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 6,
    gap: 8,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    ...theme.shadows.soft,
  },
  toggleButtonText: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  toggleButtonTextActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  chartScrollContent: {
    paddingRight: 14,
  },
  chart: {
    marginLeft: -10,
    borderRadius: 16,
  },
  stack: {
    gap: 12,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceMuted,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  studentListCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  studentListMain: {
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
  percentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  percentBarWrap: {
    width: 110,
    marginRight: 12,
  },
  percentText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  pointsCard: {
    minWidth: 82,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "flex-end",
  },
  pointsValue: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: "MullerBold",
  },
  pointsSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerMedium",
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
  },
  leaveDayBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginTop: 4,
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
    marginTop: 2,
  },
  periodBadge: {
    width: "23.5%",
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  periodBadgeLabel: {
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
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  absenceModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  absenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  absenceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  absenceTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
    marginBottom: 12,
  },
  absenceLine: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    marginBottom: 6,
  },
  absenceLabel: {
    color: theme.colors.text,
    fontFamily: "MullerBold",
  },
  descBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: 14,
  },
  descText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
});