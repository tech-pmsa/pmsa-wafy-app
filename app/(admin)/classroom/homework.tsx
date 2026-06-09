import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";

const DEFAULT_SUBJECTS = [
  "English",
  "Arabic",
  "SS",
  "Chemistry",
  "Biology",
  "Maths",
  "Physics",
];

type Student = {
  uid: string;
  name: string;
  cic: string | null;
};

type Subject = {
  id: string;
  name: string;
};

type Assignment = {
  id: string;
  batch: string;
  subject_id: string | null;
  subject_name: string;
  homework_date: string;
  total_mark: number;
};

type HomeworkMark = {
  id?: string;
  homework_id: string;
  student_uid: string;
  mark: number;
};

function getBatchNumber(batch?: string | null) {
  const match = batch?.match(/Batch\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function isEligibleBatch(batch?: string | null) {
  const batchNumber = getBatchNumber(batch);
  return !!batchNumber && batchNumber >= 17;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function parseMark(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) return 0;
  return Number(normalized) || 0;
}

export default function HomeworkPage() {
  const { user, details, role, loading: userLoading } = useUserData();
  const eligible = role === "class" && isEligibleBatch(details?.batch);

  const [activeTab, setActiveTab] = useState<"homework" | "statistics">("homework");
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingMarksId, setSavingMarksId] = useState<string | null>(null);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<(Student & {
    obtained: number;
    possible: number;
    percent: number;
  }) | null>(null);

  const [homeworkDate, setHomeworkDate] = useState(toDateValue(new Date()));
  const [selectedSubject, setSelectedSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [totalMark, setTotalMark] = useState("");

  const fetchData = useCallback(async () => {
    if (!details?.batch || !eligible || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [studentsRes, subjectsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("students")
          .select("uid, name, cic")
          .eq("batch", details.batch)
          .order("cic", { ascending: true }),
        supabase
          .from("homework_subjects")
          .select("*")
          .eq("batch", details.batch)
          .order("name"),
        supabase
          .from("homework_assignments")
          .select("*")
          .eq("batch", details.batch)
          .order("homework_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      let subjectRows = (subjectsRes.data || []) as any[];

      if (subjectRows.length === 0) {
        const { error: seedError } = await supabase.from("homework_subjects").upsert(
          DEFAULT_SUBJECTS.map((name) => ({
            batch: details.batch,
            name,
            created_by: user.id,
          })),
          { onConflict: "batch,name" }
        );

        if (seedError) throw seedError;

        const { data: seededSubjects, error: seededError } = await supabase
          .from("homework_subjects")
          .select("*")
          .eq("batch", details.batch)
          .order("name");

        if (seededError) throw seededError;
        subjectRows = seededSubjects || [];
      }

      const dbSubjects = subjectRows.map((subject) => ({
        id: subject.id,
        name: subject.name,
      }));

      const mergedSubjects = dbSubjects.sort((a, b) => a.name.localeCompare(b.name));

      const assignmentRows = (assignmentsRes.data || []) as Assignment[];
      const assignmentIds = assignmentRows.map((assignment) => assignment.id);
      let marksMap: Record<string, Record<string, string>> = {};

      if (assignmentIds.length) {
        const { data: marksData, error: marksError } = await supabase
          .from("homework_marks")
          .select("*")
          .in("homework_id", assignmentIds);

        if (marksError) throw marksError;

        marksMap = ((marksData || []) as HomeworkMark[]).reduce(
          (acc, mark) => {
            if (!acc[mark.homework_id]) acc[mark.homework_id] = {};
            acc[mark.homework_id][mark.student_uid] = String(mark.mark ?? 0);
            return acc;
          },
          {} as Record<string, Record<string, string>>
        );
      }

      setStudents((studentsRes.data || []) as Student[]);
      setSubjects(mergedSubjects);
      setAssignments(assignmentRows);
      setMarks(marksMap);
      if (!mergedSubjects.some((subject) => subject.name === selectedSubject)) {
        setSelectedSubject(mergedSubjects[0]?.name || DEFAULT_SUBJECTS[0]);
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err?.message || "Failed to load homework data.");
    } finally {
      setLoading(false);
    }
  }, [details?.batch, eligible, selectedSubject, user?.id]);

  useEffect(() => {
    if (!userLoading) fetchData();
  }, [userLoading, fetchData]);

  const selectedSubjectRow = subjects.find((subject) => subject.name === selectedSubject);

  const createHomework = async () => {
    if (!details?.batch || !user?.id) return;
    const mark = parseMark(totalMark);

    if (!selectedSubject || mark <= 0) {
      NativeAlert.alert("Required", "Select a subject and enter total mark.");
      return;
    }

    setSavingAssignment(true);

    try {
      const { error } = await supabase.from("homework_assignments").insert({
        batch: details.batch,
        subject_id: selectedSubjectRow?.id || null,
        subject_name: selectedSubject,
        homework_date: homeworkDate,
        total_mark: mark,
        created_by: user.id,
      });

      if (error) throw error;

      setTotalMark("");
      await fetchData();
      NativeAlert.alert("Created", "Homework created successfully.");
    } catch (err: any) {
      NativeAlert.alert("Error", err?.message || "Failed to create homework.");
    } finally {
      setSavingAssignment(false);
    }
  };

  const addSubject = async () => {
    if (!details?.batch || !user?.id) return;
    const name = newSubjectName.trim();

    if (!name) {
      NativeAlert.alert("Required", "Enter a subject name.");
      return;
    }

    try {
      const { error } = await supabase.from("homework_subjects").upsert(
        {
          batch: details.batch,
          name,
          created_by: user.id,
        },
        { onConflict: "batch,name" }
      );

      if (error) throw error;

      setNewSubjectName("");
      setSelectedSubject(name);
      setSubjectModalOpen(false);
      await fetchData();
    } catch (err: any) {
      NativeAlert.alert("Error", err?.message || "Failed to add subject.");
    }
  };

  const removeSubject = async (subject: Subject) => {
    NativeAlert.alert("Remove Subject", `Remove ${subject.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("homework_subjects")
            .delete()
            .eq("id", subject.id);

          if (error) NativeAlert.alert("Error", error.message);
          else fetchData();
        },
      },
    ]);
  };

  const updateDraftMark = (homeworkId: string, studentUid: string, value: string) => {
    setMarks((prev) => ({
      ...prev,
      [homeworkId]: {
        ...(prev[homeworkId] || {}),
        [studentUid]: value.replace(/[^0-9.]/g, ""),
      },
    }));
  };

  const saveMarks = async (assignment: Assignment) => {
    setSavingMarksId(assignment.id);

    try {
      const rows = students.map((student) => ({
        homework_id: assignment.id,
        student_uid: student.uid,
        mark: Math.min(parseMark(marks[assignment.id]?.[student.uid] || "0"), Number(assignment.total_mark)),
      }));

      const { error } = await supabase
        .from("homework_marks")
        .upsert(rows, { onConflict: "homework_id,student_uid" });

      if (error) throw error;

      await fetchData();
      NativeAlert.alert("Saved", "Homework marks saved.");
    } catch (err: any) {
      NativeAlert.alert("Error", err?.message || "Failed to save marks.");
    } finally {
      setSavingMarksId(null);
    }
  };

  const deleteHomework = (assignment: Assignment) => {
    NativeAlert.alert(
      "Delete Homework",
      `Delete ${assignment.subject_name} homework from ${displayDate(assignment.homework_date)}? All marks for this homework will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("homework_assignments")
              .delete()
              .eq("id", assignment.id);

            if (error) NativeAlert.alert("Error", error.message);
            else {
              NativeAlert.alert("Deleted", "Homework deleted.");
              fetchData();
            }
          },
        },
      ]
    );
  };

  const statistics = useMemo(() => {
    const totals = students.map((student) => {
      let obtained = 0;
      let possible = 0;

      for (const assignment of assignments) {
        obtained += parseMark(marks[assignment.id]?.[student.uid] || "0");
        possible += Number(assignment.total_mark || 0);
      }

      return {
        ...student,
        obtained,
        possible,
        percent: possible > 0 ? (obtained / possible) * 100 : 0,
      };
    });

    return totals.sort((a, b) => b.obtained - a.obtained || a.name.localeCompare(b.name));
  }, [students, assignments, marks]);

  const selectedHistoryRows = useMemo(() => {
    if (!selectedHistoryStudent) return [];

    return assignments.map((assignment) => ({
      id: assignment.id,
      date: assignment.homework_date,
      subject: assignment.subject_name,
      mark: parseMark(marks[assignment.id]?.[selectedHistoryStudent.uid] || "0"),
      total: Number(assignment.total_mark || 0),
    }));
  }, [assignments, marks, selectedHistoryStudent]);

  if (userLoading || loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.stateText}>Loading Homework...</Text>
      </SafeAreaView>
    );
  }

  if (!eligible) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <Text style={styles.deniedTitle}>Homework is not available</Text>
        <Text style={styles.deniedText}>This page is only for Batch 17 and higher class teachers.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Homework</Text>
        <Text style={styles.subtitle}>{details?.batch} homework marks and statistics.</Text>
      </View>

      <View style={styles.tabWrap}>
        <TouchableOpacity
          onPress={() => setActiveTab("homework")}
          style={[styles.tabButton, activeTab === "homework" && styles.tabButtonActive]}
        >
          <BookOpen size={16} color={activeTab === "homework" ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "homework" && styles.tabTextActive]}>Homework</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("statistics")}
          style={[styles.tabButton, activeTab === "statistics" && styles.tabButtonActive]}
        >
          <BarChart3 size={16} color={activeTab === "statistics" ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === "statistics" && styles.tabTextActive]}>Statistics</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "homework" ? (
          <>
            <View style={styles.createCard}>
              <TouchableOpacity activeOpacity={0.84} onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <CalendarDays size={18} color={theme.colors.textSecondary} />
                <Text style={styles.dateButtonText}>{displayDate(homeworkDate)}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={new Date(`${homeworkDate}T00:00:00`)}
                  mode="date"
                  onChange={(_event, date) => {
                    setShowDatePicker(false);
                    if (date) setHomeworkDate(toDateValue(date));
                  }}
                />
              )}

              <View style={styles.pickerWrap}>
                <Picker selectedValue={selectedSubject} onValueChange={setSelectedSubject} style={{ color: theme.colors.text }}>
                  {subjects.map((subject) => (
                    <Picker.Item key={`${subject.id || "default"}-${subject.name}`} label={subject.name} value={subject.name} />
                  ))}
                </Picker>
              </View>

              <View style={styles.subjectActions}>
                <TouchableOpacity onPress={() => setSubjectModalOpen(true)} style={styles.secondaryButton} activeOpacity={0.84}>
                  <Plus size={16} color={theme.colors.primary} />
                  <Text style={styles.secondaryButtonText}>Add Subject</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => selectedSubjectRow && removeSubject(selectedSubjectRow)} style={styles.removeSubjectButton} activeOpacity={0.84}>
                  <Trash2 size={16} color={theme.colors.error} />
                  <Text style={styles.removeSubjectText}>Remove</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={totalMark}
                onChangeText={setTotalMark}
                keyboardType="numeric"
                placeholder="Total mark"
                placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
                style={styles.input}
              />

              <TouchableOpacity onPress={createHomework} disabled={savingAssignment} activeOpacity={0.86} style={styles.primaryButton}>
                {savingAssignment ? <ActivityIndicator color={theme.colors.textOnDark} /> : <Plus size={17} color={theme.colors.textOnDark} />}
                <Text style={styles.primaryButtonText}>Create</Text>
              </TouchableOpacity>
            </View>

            {assignments.map((assignment) => {
              const isOpen = expandedAssignmentId === assignment.id;
              return (
                <View key={assignment.id} style={styles.assignmentCard}>
                  <TouchableOpacity
                    activeOpacity={0.84}
                    onPress={() => setExpandedAssignmentId(isOpen ? null : assignment.id)}
                    style={styles.assignmentHeader}
                  >
                    <View style={styles.assignmentTitleWrap}>
                      <Text style={styles.assignmentTitle}>{assignment.subject_name}</Text>
                      <Text style={styles.assignmentSubtitle}>
                        {displayDate(assignment.homework_date)} • Total {assignment.total_mark}
                      </Text>
                    </View>
                    {isOpen ? <ChevronUp size={21} color={theme.colors.textMuted} /> : <ChevronDown size={21} color={theme.colors.textMuted} />}
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.assignmentBody}>
                      <TouchableOpacity
                        onPress={() => deleteHomework(assignment)}
                        style={styles.deleteHomeworkButton}
                        activeOpacity={0.84}
                      >
                        <Trash2 size={16} color={theme.colors.error} />
                        <Text style={styles.deleteHomeworkText}>Delete Homework</Text>
                      </TouchableOpacity>

                      {students.map((student) => (
                        <View key={student.uid} style={styles.markRow}>
                          <View style={styles.studentInfo}>
                            <Text style={styles.studentName}>{student.name}</Text>
                            <Text style={styles.studentMeta}>CIC: {student.cic || "-"}</Text>
                          </View>
                          <TextInput
                            value={marks[assignment.id]?.[student.uid] || ""}
                            onChangeText={(value) => updateDraftMark(assignment.id, student.uid, value)}
                            keyboardType="numeric"
                            placeholder={`/${assignment.total_mark}`}
                            placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
                            style={styles.markInput}
                          />
                        </View>
                      ))}

                      <TouchableOpacity onPress={() => saveMarks(assignment)} disabled={savingMarksId === assignment.id} style={styles.doneButton} activeOpacity={0.86}>
                        {savingMarksId === assignment.id ? <ActivityIndicator color={theme.colors.textOnDark} /> : <Save size={17} color={theme.colors.textOnDark} />}
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Homework Statistics</Text>
            {statistics.map((student, index) => (
              <TouchableOpacity
                key={student.uid}
                style={styles.statRow}
                activeOpacity={0.84}
                onPress={() => setSelectedHistoryStudent(student)}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentMeta}>CIC: {student.cic || "-"} • {student.percent.toFixed(1)}%</Text>
                </View>
                <Text style={styles.statMark}>{student.obtained}/{student.possible}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={subjectModalOpen} transparent animationType="fade" onRequestClose={() => setSubjectModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Add Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)} style={styles.closeButton}>
                <X size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={newSubjectName}
              onChangeText={setNewSubjectName}
              placeholder="Subject name"
              placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
              style={styles.input}
            />
            <TouchableOpacity onPress={addSubject} style={styles.primaryButton} activeOpacity={0.86}>
              <Plus size={17} color={theme.colors.textOnDark} />
              <Text style={styles.primaryButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedHistoryStudent}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedHistoryStudent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.historyModalCard}>
            <View style={styles.modalTopRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedHistoryStudent?.name}
                </Text>
                <Text style={styles.historySubtitle}>
                  Homework mark history
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedHistoryStudent(null)}
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
              {selectedHistoryRows.length ? (
                selectedHistoryRows.map((row, index) => (
                  <View key={row.id} style={styles.historyRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{row.subject}</Text>
                      <Text style={styles.studentMeta}>{displayDate(row.date)}</Text>
                    </View>
                    <Text style={styles.statMark}>{row.mark}/{row.total}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyHistoryText}>No homework records found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  stateText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  deniedTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
    textAlign: "center",
  },
  deniedText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  tabWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 6,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    ...theme.shadows.soft,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  tabTextActive: { color: theme.colors.primary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  createCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadows.medium,
  },
  dateButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  dateButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  pickerWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    overflow: "hidden",
  },
  subjectActions: { flexDirection: "row", gap: 10 },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  removeSubjectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  removeSubjectText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: "MullerMedium",
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  assignmentCard: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  assignmentHeader: {
    minHeight: 66,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  assignmentTitleWrap: { flex: 1 },
  assignmentTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "MullerBold",
  },
  assignmentSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  assignmentBody: {
    padding: 14,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  deleteHomeworkButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  deleteHomeworkText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  markRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  studentInfo: { flex: 1 },
  studentName: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  studentMeta: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "MullerMedium",
  },
  markInput: {
    width: 82,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    textAlign: "center",
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: "MullerBold",
  },
  doneButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  doneButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  statsCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.medium,
  },
  statsTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
    marginBottom: 6,
  },
  statRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
  },
  rankText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  statMark: {
    color: theme.colors.primary,
    fontSize: 15,
    fontFamily: "MullerBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadows.floating,
  },
  historyModalCard: {
    maxHeight: "82%",
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.floating,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontFamily: "MullerBold",
  },
  historySubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "MullerMedium",
  },
  historyScroll: {
    marginTop: 14,
  },
  historyRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  emptyHistoryText: {
    paddingVertical: 18,
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
