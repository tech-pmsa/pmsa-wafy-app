import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  Activity,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

interface PeriodDetail {
  status: "Present" | "Absent";
  reason?: string;
  description?: string;
}
interface TodaysAttendanceRecord {
  is_leave_day: boolean;
  [key: string]: any;
}
interface StudentFullAttendance {
  uid: string;
  name: string;
  class_id: string;
  today_attendance: TodaysAttendanceRecord | null;
}

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const excusedAbsences = ["Cic Related", "Wsf Related", "Exam Related"];

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
      border: "rgba(59,130,246,0.14)",
      icon: <AlertCircle size={15} color={theme.colors.primary} />,
    };
  }

  return {
    bg: theme.colors.errorSoft,
    border: "rgba(220,38,38,0.14)",
    icon: <XCircle size={15} color={theme.colors.error} />,
  };
}

function FilterChip({
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
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CollegeLiveAttendance() {
  const [allAttendance, setAllAttendance] = useState<StudentFullAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>(
    {}
  );
  const [periodFilters, setPeriodFilters] = useState<Record<string, string>>({});
  const [selectedAbsence, setSelectedAbsence] = useState<{
    name: string;
    period: number;
    reason: string;
    desc: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const todayString = format(new Date(), "yyyy-MM-dd");

      const [{ data: studentsData }, { data: todayData }] = await Promise.all([
        supabase.from("students").select("uid, name, class_id"),
        supabase.from("attendance").select("*").eq("date", todayString),
      ]);

      if (studentsData) {
        const todayAttendanceMap = new Map<string, any>();
        if (todayData) {
          todayData.forEach((rec: any) => {
            todayAttendanceMap.set(rec.student_uid, rec);
          });
        }

        const combinedData = studentsData.map((student: any) => ({
          ...student,
          today_attendance: todayAttendanceMap.get(student.uid) || null,
        }));

        setAllAttendance(combinedData);
      } else {
        setAllAttendance([]);
      }

      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("college-live-attendance")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        (payload) => {
          const updatedRecord = payload.new as any;
          if (updatedRecord?.date === format(new Date(), "yyyy-MM-dd")) {
            setAllAttendance((prev) =>
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
  }, []);

  const groupedAndFilteredStudents = useMemo(() => {
    const filtered = allAttendance.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = filtered.reduce((acc, student) => {
      const key = student.class_id || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {} as Record<string, StudentFullAttendance[]>);

    return Object.keys(grouped)
      .sort()
      .reduce((obj, key) => {
        obj[key] = grouped[key];
        return obj;
      }, {} as Record<string, StudentFullAttendance[]>);
  }, [allAttendance, searchTerm]);

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  if (loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading live attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students across all classes..."
          placeholderTextColor={
            theme.colors.inputPlaceholder ?? theme.colors.textMuted
          }
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.stack}>
        {Object.entries(groupedAndFilteredStudents).map(([classId, students]) => {
          const isExpanded = !!expandedClasses[classId];
          const activeFilter = periodFilters[classId] || "all";

          const studentsToDisplay =
            activeFilter === "all"
              ? students
              : students.filter((student) => {
                  const detail = student.today_attendance?.[
                    activeFilter
                  ] as PeriodDetail;
                  return detail?.status !== "Present";
                });

          return (
            <View key={classId} style={styles.classCard}>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => toggleClass(classId)}
                style={styles.classHeader}
              >
                <View style={styles.classHeaderLeft}>
                  <View style={styles.classIconWrap}>
                    <Users size={18} color={theme.colors.primary} />
                  </View>

                  <View>
                    <Text style={styles.classTitle}>{classId}</Text>
                    <Text style={styles.classSubtitle}>
                      {students.length} students
                    </Text>
                  </View>
                </View>

                {isExpanded ? (
                  <ChevronUp size={22} color={theme.colors.textMuted} />
                ) : (
                  <ChevronDown size={22} color={theme.colors.textMuted} />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.classBody}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                  >
                    <FilterChip
                      label="All"
                      active={activeFilter === "all"}
                      onPress={() =>
                        setPeriodFilters((prev) => ({ ...prev, [classId]: "all" }))
                      }
                    />
                    {periods.map((period, i) => (
                      <FilterChip
                        key={period}
                        label={`P${i + 1}`}
                        active={activeFilter === period}
                        onPress={() =>
                          setPeriodFilters((prev) => ({ ...prev, [classId]: period }))
                        }
                      />
                    ))}
                  </ScrollView>

                  <View style={styles.stack}>
                    {studentsToDisplay.map((student) => {
                      const detailForFilter =
                        activeFilter !== "all"
                          ? (student.today_attendance?.[activeFilter] as PeriodDetail)
                          : null;

                      return (
                        <View key={student.uid} style={styles.studentCard}>
                          <View style={styles.studentHeader}>
                            <Text style={styles.studentName}>{student.name}</Text>

                            {activeFilter !== "all" && detailForFilter && (
                              <View
                                style={[
                                  styles.reasonBadge,
                                  excusedAbsences.includes(
                                    detailForFilter.reason || ""
                                  )
                                    ? styles.reasonBadgeExcused
                                    : styles.reasonBadgeAbsent,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.reasonBadgeText,
                                    excusedAbsences.includes(
                                      detailForFilter.reason || ""
                                    )
                                      ? styles.reasonBadgeTextExcused
                                      : styles.reasonBadgeTextAbsent,
                                  ]}
                                >
                                  {detailForFilter.reason || "Absent"}
                                </Text>
                              </View>
                            )}
                          </View>

                          {activeFilter === "all" ? (
                            student.today_attendance?.is_leave_day ? (
                              <View style={styles.leaveDayBadge}>
                                <Text style={styles.leaveDayText}>Leave Day</Text>
                              </View>
                            ) : student.today_attendance ? (
                              <View style={styles.periodGrid}>
                                {periods.map((period, i) => {
                                  const pDetail =
                                    student.today_attendance?.[period] as
                                      | PeriodDetail
                                      | undefined;

                                  const tone = toneForPeriod(pDetail);

                                  return (
                                    <TouchableOpacity
                                      key={period}
                                      activeOpacity={0.84}
                                      onPress={() =>
                                        setSelectedAbsence({
                                          name: student.name,
                                          period: i + 1,
                                          reason: pDetail?.reason || "Absent",
                                          desc:
                                            pDetail?.description ||
                                            "No description provided.",
                                        })
                                      }
                                      disabled={pDetail?.status === "Present"}
                                      style={[
                                        styles.periodBox,
                                        {
                                          backgroundColor: tone.bg,
                                          borderColor: tone.border,
                                        },
                                      ]}
                                    >
                                      <Text style={styles.periodBoxLabel}>
                                        P{i + 1}
                                      </Text>
                                      {tone.icon}
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            ) : (
                              <Text style={styles.pendingText}>
                                Pending submission...
                              </Text>
                            )
                          ) : (
                            <Text style={styles.descriptionText}>
                              {detailForFilter?.description ||
                                "No description provided."}
                            </Text>
                          )}
                        </View>
                      );
                    })}

                    {studentsToDisplay.length === 0 && (
                      <View style={styles.emptyState}>
                        <Activity size={18} color={theme.colors.textMuted} />
                        <Text style={styles.emptyStateText}>
                          No absentees for this period.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
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

            <View style={styles.modalStudentCard}>
              <Text style={styles.modalStudentName}>{selectedAbsence?.name}</Text>
              <Text style={styles.modalStudentSub}>
                Missed: <Text style={styles.modalStudentSubStrong}>Period {selectedAbsence?.period}</Text>
              </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
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
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
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
  stack: { gap: 12 },
  classCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  classHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  classHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  classIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginRight: 12,
  },
  classTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  classSubtitle: {
    marginTop: 2,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  classBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  filterRow: {
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  filterChipTextActive: {
    color: theme.colors.textOnDark,
  },
  studentCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  studentName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  reasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonBadgeExcused: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primaryTint,
  },
  reasonBadgeAbsent: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  reasonBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },
  reasonBadgeTextExcused: { color: theme.colors.primary },
  reasonBadgeTextAbsent: { color: theme.colors.error },
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
  descriptionText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  emptyState: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
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
  modalStudentCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 16,
  },
  modalStudentName: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  modalStudentSub: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  modalStudentSubStrong: {
    color: theme.colors.text,
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