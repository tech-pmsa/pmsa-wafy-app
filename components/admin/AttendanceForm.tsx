import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  Alert as NativeAlert,
  ScrollView,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import {
  CalendarIcon,
  Check,
  X,
  UserCheck,
  UserX,
  Lock,
  Save,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

interface Student {
  uid: string;
  name: string;
}
interface PeriodDetail {
  status: "Present" | "Absent";
  reason?: "Home" | "Medical" | "Cic Related" | "Wsf Related" | "Exam Related";
  description?: string;
}
interface AttendanceRecord {
  [period: string]: PeriodDetail;
}

const periods = Array.from({ length: 8 }, (_, i) => `period_${i + 1}`);
const absenceReasons = ["Home", "Medical", "Cic Related", "Wsf Related", "Exam Related"];
const excusedAbsences = ["Cic Related", "Wsf Related", "Exam Related"];

function toneForPeriod(detail?: PeriodDetail) {
  const isPresent = detail?.status === "Present";
  const isExcused = !isPresent && excusedAbsences.includes(detail?.reason || "");

  if (isPresent) {
    return {
      bg: theme.colors.success,
      border: theme.colors.success,
      text: theme.colors.textOnDark,
    };
  }

  if (isExcused) {
    return {
      bg: theme.colors.surface,
      border: theme.colors.primary,
      text: theme.colors.primary,
    };
  }

  return {
    bg: theme.colors.errorSoft,
    border: "rgba(220,38,38,0.14)",
    text: theme.colors.error,
  };
}

export default function AttendanceForm() {
  const { details, loading: userLoading } = useUserData();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<{ [uid: string]: AttendanceRecord }>({});

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLeaveDay, setIsLeaveDay] = useState(false);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    studentUid: string | null;
    period: string | null;
  }>({ isOpen: false, studentUid: null, period: null });

  const [reasonDraft, setReasonDraft] =
    useState<PeriodDetail["reason"]>("Home");
  const [descDraft, setDescDraft] = useState("");
  const [lastReasons, setLastReasons] = useState<{ [uid: string]: PeriodDetail }>({});

  const classId = useMemo(
    () => details?.designation?.replace(" Class", ""),
    [details]
  );

  const fetchDataForDate = useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const [{ data: studentsData }, { data: attendanceData }] = await Promise.all([
      supabase.from("students").select("uid, name").eq("class_id", classId).order("name"),
      supabase.from("attendance").select("*").eq("class_id", classId).eq("date", dateStr),
    ]);

    if (studentsData) {
      setStudents(studentsData);

      const initialAttendance: { [uid: string]: AttendanceRecord } = {};
      const initialLastReasons: { [uid: string]: PeriodDetail } = {};

      setIsLocked(attendanceData?.[0]?.status_locked || false);
      setIsLeaveDay(attendanceData?.[0]?.is_leave_day || false);

      studentsData.forEach((student: any) => {
        const record = attendanceData?.find((att: any) => att.student_uid === student.uid);

        if (record) {
          initialAttendance[student.uid] = periods.reduce(
            (acc, p) => ({
              ...acc,
              [p]: record[p] || { status: "Present" },
            }),
            {} as AttendanceRecord
          );

          const lastReason = periods
            .map((p) => record[p])
            .find((p: PeriodDetail) => p?.status === "Absent");

          if (lastReason) {
            initialLastReasons[student.uid] = lastReason;
          }
        } else {
          initialAttendance[student.uid] = periods.reduce(
            (acc, p) => ({
              ...acc,
              [p]: { status: "Present" },
            }),
            {} as AttendanceRecord
          );
        }
      });

      setAttendance(initialAttendance);
      setLastReasons(initialLastReasons);
    } else {
      setStudents([]);
      setAttendance({});
      setLastReasons({});
    }

    setLoading(false);
  }, [classId, selectedDate]);

  useEffect(() => {
    if (!userLoading && classId) {
      fetchDataForDate();
    }
  }, [userLoading, fetchDataForDate, classId]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [students, searchTerm]
  );

  const attendanceSummary = useMemo(() => {
    const presentCount = students.filter((student) => {
      const studentAttendance = attendance[student.uid];
      return (
        studentAttendance &&
        Object.values(studentAttendance).some(
          (p) =>
            p.status === "Present" || excusedAbsences.includes(p.reason || "")
        )
      );
    }).length;

    return {
      present: presentCount,
      absent: students.length - presentCount,
    };
  }, [attendance, students]);

  const handleDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
    }
  };

  const openReasonModal = (uid: string, period: string | null) => {
    const lastReason = lastReasons[uid];
    setReasonDraft(lastReason?.reason || "Home");
    setDescDraft(lastReason?.description || "");
    setModalState({ isOpen: true, studentUid: uid, period });
  };

  const handlePeriodClick = (uid: string, period: string) => {
    if (isLocked || isLeaveDay) return;

    const currentStatus = attendance[uid][period];
    if (currentStatus.status === "Present") {
      openReasonModal(uid, period);
    } else {
      setAttendance((prev) => ({
        ...prev,
        [uid]: {
          ...prev[uid],
          [period]: { status: "Present" },
        },
      }));
    }
  };

  const markAll = (uid: string, isPresent: boolean) => {
    if (isLocked || isLeaveDay) return;

    if (isPresent) {
      const newRecord: AttendanceRecord = {};
      periods.forEach((p) => {
        newRecord[p] = { status: "Present" };
      });

      setAttendance((prev) => ({
        ...prev,
        [uid]: newRecord,
      }));
    } else {
      openReasonModal(uid, "all");
    }
  };

  const saveAbsence = () => {
    const { studentUid, period } = modalState;
    if (!studentUid) return;

    const newReason: PeriodDetail = {
      status: "Absent",
      reason: reasonDraft,
      description: descDraft,
    };

    if (period === "all") {
      const newRecord: AttendanceRecord = {};
      periods.forEach((p) => {
        newRecord[p] = newReason;
      });

      setAttendance((prev) => ({
        ...prev,
        [studentUid]: newRecord,
      }));
    } else if (period) {
      setAttendance((prev) => ({
        ...prev,
        [studentUid]: {
          ...prev[studentUid],
          [period]: newReason,
        },
      }));
    }

    setLastReasons((prev) => ({
      ...prev,
      [studentUid]: newReason,
    }));

    setModalState({ isOpen: false, studentUid: null, period: null });
  };

  const handleSubmission = async (shouldLock: boolean) => {
    if (!classId) {
      NativeAlert.alert("Error", "Class ID is missing.");
      return;
    }

    if (shouldLock) setIsLocking(true);
    else setIsUpdating(true);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const updates = students.map((student) => {
      const studentAttendance = attendance[student.uid];
      const record: any = {
        student_uid: student.uid,
        date: dateStr,
        class_id: classId,
        is_leave_day: isLeaveDay,
        status_locked: shouldLock,
      };

      for (const p of periods) {
        record[p] = studentAttendance[p];
      }

      return record;
    });

    const { error } = await supabase
      .from("attendance")
      .upsert(updates, { onConflict: "student_uid,date" });

    if (!error) {
      NativeAlert.alert(
        "Success",
        `Attendance has been ${shouldLock ? "locked" : "updated"}.`
      );
      if (shouldLock) setIsLocked(true);
    } else {
      NativeAlert.alert("Error", error.message);
    }

    if (shouldLock) setIsLocking(false);
    else setIsUpdating(false);
  };

  if (userLoading || loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading attendance form...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.controlsCard}>
        <Text style={styles.sectionTitle}>Controls</Text>

        <View style={styles.controlsRow}>
          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Select Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.84}
              style={styles.dateButton}
            >
              <CalendarIcon size={18} color={theme.colors.textSecondary} />
              <Text style={styles.dateButtonText}>
                {format(selectedDate, "PPP")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlBlock}>
            <Text style={styles.controlLabel}>Day Type</Text>
            <TouchableOpacity
              onPress={() => !isLocked && setIsLeaveDay(!isLeaveDay)}
              activeOpacity={0.84}
              disabled={isLocked}
              style={[
                styles.dayTypeButton,
                isLeaveDay && styles.dayTypeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.dayTypeButtonText,
                  isLeaveDay && styles.dayTypeButtonTextActive,
                ]}
              >
                {isLeaveDay ? "Leave Day" : "Working Day"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCardPresent}>
            <UserCheck size={24} color={theme.colors.success} />
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryValuePresent}>{attendanceSummary.present}</Text>
              <Text style={styles.summaryLabelPresent}>Present</Text>
            </View>
          </View>

          <View style={styles.summaryCardAbsent}>
            <UserX size={24} color={theme.colors.error} />
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryValueAbsent}>{attendanceSummary.absent}</Text>
              <Text style={styles.summaryLabelAbsent}>Absent</Text>
            </View>
          </View>
        </View>
      </View>

      {isLocked && (
        <View style={styles.lockBanner}>
          <Lock size={18} color={theme.colors.primary} />
          <Text style={styles.lockBannerText}>
            Attendance for this date has been finalized and locked.
          </Text>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a student..."
          placeholderTextColor={
            theme.colors.inputPlaceholder ?? theme.colors.textMuted
          }
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={[styles.stack, (isLocked || isLeaveDay) && styles.dimmed]}>
        {filteredStudents.map((student) => {
          const isExpanded = expandedId === student.uid;
          const studentAttendance = attendance[student.uid];

          return (
            <View key={student.uid} style={styles.studentCard}>
              <TouchableOpacity
                activeOpacity={isLocked || isLeaveDay ? 1 : 0.84}
                onPress={() =>
                  !(isLocked || isLeaveDay) &&
                  setExpandedId(isExpanded ? null : student.uid)
                }
                style={styles.studentHeader}
              >
                <View style={styles.studentHeaderTop}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  {isExpanded ? (
                    <ChevronUp size={22} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={22} color={theme.colors.textMuted} />
                  )}
                </View>

                <View style={styles.quickActionRow}>
                  <TouchableOpacity
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      markAll(student.uid, true);
                    }}
                    disabled={isLocked || isLeaveDay}
                    activeOpacity={0.84}
                    style={styles.quickButton}
                  >
                    <Check size={15} color={theme.colors.text} />
                    <Text style={styles.quickButtonText}>All Present</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      markAll(student.uid, false);
                    }}
                    disabled={isLocked || isLeaveDay}
                    activeOpacity={0.84}
                    style={styles.quickButton}
                  >
                    <X size={15} color={theme.colors.text} />
                    <Text style={styles.quickButtonText}>All Absent</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.studentBody}>
                  <View style={styles.periodGrid}>
                    {periods.map((period, i) => {
                      const periodData = studentAttendance?.[period];
                      const tone = toneForPeriod(periodData);

                      return (
                        <TouchableOpacity
                          key={period}
                          disabled={isLocked || isLeaveDay}
                          onPress={() => handlePeriodClick(student.uid, period)}
                          activeOpacity={0.84}
                          style={[
                            styles.periodButton,
                            {
                              backgroundColor: tone.bg,
                              borderColor: tone.border,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.periodButtonText, { color: tone.text }]}
                          >
                            P{i + 1}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.noteBox}>
                    {periods
                      .filter((p) => studentAttendance?.[p]?.status === "Absent")
                      .map((p, index) => {
                        const detail = studentAttendance[p];
                        return (
                          <Text key={p} style={styles.noteText}>
                            • P{index + 1}: {detail.reason}{" "}
                            {detail.description ? `(${detail.description})` : ""}
                          </Text>
                        );
                      })}

                    {periods.filter((p) => studentAttendance?.[p]?.status === "Absent")
                      .length === 0 && (
                      <Text style={styles.noteTextSuccess}>100% Present Today.</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.submitRow}>
        <TouchableOpacity
          onPress={() => handleSubmission(false)}
          disabled={isLocked || isUpdating || isLocking}
          activeOpacity={0.86}
          style={[
            styles.secondaryButton,
            (isLocked || isUpdating || isLocking) && styles.buttonDisabled,
          ]}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Save size={17} color={isLocked ? theme.colors.textMuted : theme.colors.primary} />
          )}
          <Text
            style={[
              styles.secondaryButtonText,
              isLocked && styles.buttonDisabledText,
            ]}
          >
            Update
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSubmission(true)}
          disabled={isLocked || isUpdating || isLocking}
          activeOpacity={0.86}
          style={[
            styles.primaryButton,
            (isLocked || isUpdating || isLocking) && styles.primaryButtonDisabled,
          ]}
        >
          {isLocking ? (
            <ActivityIndicator size="small" color={theme.colors.textOnDark} />
          ) : (
            <Lock size={17} color={theme.colors.textOnDark} />
          )}
          <Text style={styles.primaryButtonText}>Lock</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalState.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalState({ isOpen: false, studentUid: null, period: null })
        }
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Mark Absence</Text>
              <TouchableOpacity
                onPress={() =>
                  setModalState({ isOpen: false, studentUid: null, period: null })
                }
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Reason for Absence</Text>
            <View style={styles.reasonWrap}>
              {absenceReasons.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setReasonDraft(r as any)}
                  activeOpacity={0.84}
                  style={[
                    styles.reasonChip,
                    reasonDraft === r && styles.reasonChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      reasonDraft === r && styles.reasonChipTextActive,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Description (Optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="e.g. Attending family function"
              placeholderTextColor={
                theme.colors.inputPlaceholder ?? theme.colors.textMuted
              }
              multiline
              textAlignVertical="top"
              value={descDraft}
              onChangeText={setDescDraft}
            />

            <TouchableOpacity
              onPress={saveAbsence}
              activeOpacity={0.86}
              style={styles.primaryButtonFull}
            >
              <Text style={styles.primaryButtonText}>Save Absence</Text>
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
  controlsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
    marginBottom: 14,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  controlBlock: { flex: 1 },
  controlLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  dateButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  dateButtonText: {
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  dayTypeButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  dayTypeButtonActive: {
    borderColor: theme.colors.primaryTint,
    backgroundColor: theme.colors.primarySoft,
  },
  dayTypeButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  dayTypeButtonTextActive: {
    color: theme.colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  summaryCardPresent: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.14)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardAbsent: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: { marginLeft: 10 },
  summaryValuePresent: {
    color: theme.colors.success,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  summaryLabelPresent: {
    color: theme.colors.success,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  summaryValueAbsent: {
    color: theme.colors.error,
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  summaryLabelAbsent: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  lockBanner: {
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  lockBannerText: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.primary,
    fontSize: 13,
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
  dimmed: { opacity: 0.72 },
  studentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  studentHeader: {
    padding: 16,
  },
  studentHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  studentName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  studentBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 16,
  },
  periodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  periodButton: {
    width: "23.5%",
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  periodButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  noteBox: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    padding: 12,
  },
  noteText: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 4,
  },
  noteTextSuccess: {
    color: theme.colors.success,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  submitRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 4,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonFull: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    backgroundColor: theme.colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.6,
    borderColor: theme.colors.borderStrong ?? theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  buttonDisabledText: {
    color: theme.colors.textMuted,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
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
    maxWidth: 430,
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
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  reasonChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  reasonChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  reasonChipTextActive: {
    color: theme.colors.textOnDark,
  },
  descriptionInput: {
    minHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: 14,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
});