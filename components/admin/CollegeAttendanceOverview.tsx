import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Percent,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  X,
  Sparkles,
  School,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";

interface PeriodDetail {
  status?: "Present" | "Absent";
  reason?: string;
  description?: string;
}

interface TodaysAttendanceRecord {
  is_leave_day?: boolean;
  [key: string]: any;
}

interface StudentFullAttendance {
  uid: string;
  name: string;
  class_id: string;
  total_present: number;
  total_days: number;
  today_attendance: TodaysAttendanceRecord | null;
}

interface ProcessedStudent extends StudentFullAttendance {
  percentage: number;
  total: string;
  points: number;
}

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ["Cic Related", "Wsf Related", "Exam Related"];

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
  icon: Icon,
  footer,
  tone = "primary",
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  footer: string;
  tone?: "primary" | "success" | "danger" | "accent";
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
    accent: {
      iconBg: theme.colors.accentSoft,
      iconColor: theme.colors.accent,
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

function ClassRow({
  className,
  average,
  count,
  onPress,
}: {
  className: string;
  average: number;
  count: number;
  onPress: () => void;
}) {
  const safeAverage = Math.max(0, Math.min(100, average));
  const tone = getStatusTone(safeAverage);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={styles.classRowCard}
    >
      <View style={styles.classRowHeader}>
        <View style={styles.classRowLeft}>
          <View style={[styles.classRowIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
            <School size={18} color={theme.colors.primary} />
          </View>

          <View>
            <Text style={styles.classRowTitle}>{className}</Text>
            <Text style={styles.classRowSubtitle}>{count} students</Text>
          </View>
        </View>

        <View style={[styles.classRowBadge, { backgroundColor: tone.soft, borderColor: tone.border }]}>
          <Text style={[styles.classRowBadgeText, { color: tone.text }]}>
            {safeAverage.toFixed(1)}%
          </Text>
        </View>
      </View>

      <ProgressBar percentage={safeAverage} />
    </TouchableOpacity>
  );
}

function SegmentedTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
    >
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PeriodBadge({
  index,
  detail,
}: {
  index: number;
  detail?: PeriodDetail;
}) {
  const isPresent = detail?.status === "Present";
  const isExcused = excusedAbsences.includes(detail?.reason || "");

  let bg = theme.colors.errorSoft;
  let border = "rgba(220,38,38,0.14)";
  let icon = <XCircle size={15} color={theme.colors.error} />;

  if (isPresent) {
    bg = theme.colors.successSoft;
    border = "rgba(22,163,74,0.14)";
    icon = <CheckCircle2 size={15} color={theme.colors.success} />;
  } else if (isExcused) {
    bg = theme.colors.primarySoft;
    border = "rgba(59,130,246,0.14)";
    icon = <AlertCircle size={15} color={theme.colors.primary} />;
  }

  return (
    <View style={[styles.periodBadge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={styles.periodBadgeLabel}>P{index + 1}</Text>
      {icon}
    </View>
  );
}

export default function CollegeAttendanceOverview() {
  const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "status">("details");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const todayString = format(new Date(), "yyyy-MM-dd");

        const { data: summaryData, error: summaryError } = await supabase
          .from("students_with_attendance")
          .select("uid, name, class_id, total_present, total_days");

        const { data: todayData, error: todayError } = await supabase
          .from("attendance")
          .select("*")
          .eq("date", todayString);

        if (summaryError || todayError) {
          console.log("Attendance fetch error:", summaryError || todayError);
          setAllAttendance([]);
          setLoading(false);
          return;
        }

        const safeSummary = Array.isArray(summaryData) ? summaryData : [];
        const safeToday = Array.isArray(todayData) ? todayData : [];

        const todayAttendanceMap = new Map(
          safeToday.map((rec: any) => [rec.student_uid, rec])
        );

        const combinedData: StudentFullAttendance[] = safeSummary.map((student: any) => ({
          uid: String(student.uid ?? ""),
          name: String(student.name ?? "Unknown"),
          class_id: String(student.class_id ?? ""),
          total_present: Number(student.total_present ?? 0),
          total_days: Number(student.total_days ?? 0),
          today_attendance: todayAttendanceMap.get(student.uid) || null,
        }));

        setAllAttendance(combinedData);
      } catch (error) {
        console.log("Unexpected attendance error:", error);
        setAllAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const collegeData = useMemo(() => {
    const classMap = new Map<
      string,
      {
        totalPercentage: number;
        studentCount: number;
        students: StudentFullAttendance[];
      }
    >();

    allAttendance.forEach((student) => {
      if (!student.class_id) return;

      const percentage =
        student.total_days > 0
          ? (student.total_present / student.total_days) * 100
          : 0;

      if (!classMap.has(student.class_id)) {
        classMap.set(student.class_id, {
          totalPercentage: 0,
          studentCount: 0,
          students: [],
        });
      }

      const current = classMap.get(student.class_id)!;
      current.totalPercentage += percentage;
      current.studentCount += 1;
      current.students.push(student);
    });

    const chartData = Array.from(classMap.entries())
      .map(([class_id, data]) => ({
        name: class_id,
        average_attendance:
          data.studentCount > 0 ? data.totalPercentage / data.studentCount : 0,
        students: data.students,
      }))
      .sort((a, b) => b.average_attendance - a.average_attendance);

    const overallAverage =
      chartData.length > 0
        ? chartData.reduce((sum, item) => sum + item.average_attendance, 0) /
          chartData.length
        : 0;

    return {
      chartData,
      overallAverage,
      topClass: chartData[0],
      bottomClass: chartData[chartData.length - 1],
    };
  }, [allAttendance]);

  const modalClassData = useMemo(() => {
    if (!selectedClassId) return null;

    const selectedClass = collegeData.chartData.find(
      (item) => item.name === selectedClassId
    );

    const students = selectedClass?.students ?? [];

    const filtered = students.filter((student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const processed: ProcessedStudent[] = filtered
      .map((student) => {
        const percentage =
          student.total_days > 0
            ? (student.total_present / student.total_days) * 100
            : 0;

        const totalAbsent = Math.max(0, student.total_days - student.total_present);
        const pointsDeducted = Math.floor(totalAbsent / 2) * 2;
        const points = Math.max(0, 20 - pointsDeducted);

        return {
          ...student,
          percentage,
          total: `${student.total_present}/${student.total_days}`,
          points,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const totalPercentage = processed.reduce((sum, student) => sum + student.percentage, 0);
    const average = processed.length > 0 ? totalPercentage / processed.length : 0;
    const belowThreshold = processed.filter((student) => student.percentage < 75).length;

    return {
      students: processed,
      average,
      belowThreshold,
    };
  }, [selectedClassId, searchTerm, collegeData]);

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading attendance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootCard}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerIconWrap}>
            <Users size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.headerPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.headerPillText}>Attendance Insights</Text>
          </View>
        </View>

        <Text style={styles.title}>College Attendance</Text>
        <Text style={styles.subtitle}>A college-wide summary across all classes.</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          title="Overall Average"
          value={`${collegeData.overallAverage.toFixed(1)}%`}
          icon={Percent}
          footer="College wide"
          tone="primary"
        />

        <MetricCard
          title="Top Class"
          value={collegeData.topClass?.name || "N/A"}
          icon={TrendingUp}
          footer={`${collegeData.topClass?.average_attendance?.toFixed(1) || "0.0"}% average`}
          tone="success"
        />

        <MetricCard
          title="Needs Focus"
          value={collegeData.bottomClass?.name || "N/A"}
          icon={TrendingDown}
          footer={`${collegeData.bottomClass?.average_attendance?.toFixed(1) || "0.0"}% average`}
          tone="danger"
        />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Class Performance</Text>
        <Text style={styles.sectionHelper}>Tap a class to open details</Text>
      </View>

      {collegeData.chartData.length > 0 ? (
        <View style={styles.stack}>
          {collegeData.chartData.map((cls) => (
            <ClassRow
              key={cls.name}
              className={cls.name}
              average={cls.average_attendance}
              count={cls.students.length}
              onPress={() => {
                setSearchTerm("");
                setActiveTab("details");
                setSelectedClassId(cls.name);
              }}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No attendance data found.</Text>
        </View>
      )}

      <Modal
        visible={!!selectedClassId}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedClassId(null)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTextWrap}>
              <Text style={styles.modalTitle}>
                {selectedClassId || "Class"} Overview
              </Text>
              <Text style={styles.modalSubtitle}>
                Attendance details and today's status
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedClassId(null)}
              activeOpacity={0.84}
              style={styles.closeButton}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {modalClassData ? (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.metricsGrid}>
                <MetricCard
                  title="Class Average"
                  value={`${modalClassData.average.toFixed(1)}%`}
                  icon={Users}
                  footer={`${modalClassData.students.length} students`}
                  tone="primary"
                />
                <MetricCard
                  title="Below 75%"
                  value={String(modalClassData.belowThreshold)}
                  icon={AlertTriangle}
                  footer="Need attention"
                  tone="danger"
                />
              </View>

              <View style={styles.searchWrap}>
                <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search student..."
                  placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>

              <View style={styles.segmentWrap}>
                <SegmentedTab
                  label="Detailed List"
                  active={activeTab === "details"}
                  onPress={() => setActiveTab("details")}
                />
                <SegmentedTab
                  label="Live Status"
                  active={activeTab === "status"}
                  onPress={() => setActiveTab("status")}
                />
              </View>

              {activeTab === "details" ? (
                <View style={styles.stack}>
                  {modalClassData.students.map((student) => (
                    <View key={student.uid} style={styles.studentDetailCard}>
                      <View style={styles.studentDetailMain}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <ProgressBar percentage={student.percentage} />
                        <Text style={styles.studentPercentText}>
                          {student.percentage.toFixed(1)}%
                        </Text>
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
                        <Text style={styles.pointsDays}>{student.total} days</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.stack}>
                  {modalClassData.students.map((student) => (
                    <View key={student.uid} style={styles.studentStatusCard}>
                      <Text style={styles.studentName}>{student.name}</Text>

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

                            return (
                              <PeriodBadge
                                key={period}
                                index={i}
                                detail={detail}
                              />
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.pendingText}>
                          Attendance not submitted yet.
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.modalEmpty}>
              <Text style={styles.emptyStateText}>No class data available.</Text>
            </View>
          )}
        </View>
      </Modal>
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 36,
    paddingHorizontal: 20,
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
  headerWrap: {
    marginBottom: 16,
  },
  headerTopRow: {
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
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.accentSoft,
  },
  headerPillText: {
    color: theme.colors.warningText ?? theme.colors.accent,
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
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
  },
  sectionHelper: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  stack: {
    gap: 12,
  },
  classRowCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  classRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  classRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  classRowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  classRowTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  classRowSubtitle: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  classRowBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  classRowBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
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
  emptyState: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  modalSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
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
  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    ...theme.shadows.soft,
  },
  segmentButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  segmentButtonTextActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
  studentDetailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  studentDetailMain: {
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  studentPercentText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  pointsCard: {
    minWidth: 84,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
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
  pointsDays: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    marginTop: 8,
  },
  studentStatusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
  },
  leaveDayBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
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
  },
  modalEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});