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
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { BookOpen, CalendarDays, Edit, Plus, Save, Trash2, X } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  Semester,
  SEMESTER_MONTHS,
  buildWorkingWeeks,
  displayDate,
  getAcademicYearBase,
  getPortionStatus,
  getSemesterDates,
  n,
  statusLabel,
} from "@/lib/portionUtils";

type Subject = {
  id: string;
  batch: string;
  semester: Semester;
  subject_name: string;
  teacher_name: string;
  total_pages: number;
  total_period: number;
  period_per_week: number;
  pages_per_day: number;
  pages_per_week: number;
};

type Progress = {
  id?: string;
  subject_id: string;
  week_key: string;
  month_key: string;
  week_no: number;
  date_from: string;
  date_to: string;
  period_taken: number;
  pages_taken: number;
};

const blankForm = {
  subject_name: "",
  teacher_name: "",
  total_pages: "",
  total_period: "",
  period_per_week: "",
};

function getBatch(details: any) {
  return details?.designation || details?.batch || "";
}

export default function ClassLeaderPortionsPage() {
  const { user, details, role, loading: userLoading } = useUserData();
  const batch = getBatch(details);
  const [semester, setSemester] = useState<Semester>("SEM-1");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progressRows, setProgressRows] = useState<Progress[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState(blankForm);
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);

  const academicYear = getAcademicYearBase();

  const loadData = useCallback(async () => {
    if (!batch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [excludedRes, subjectsRes] = await Promise.all([
        supabase.from("portion_calendar_exclusions").select("*").eq("semester", semester),
        supabase
          .from("portion_subjects")
          .select("*")
          .eq("batch", batch)
          .eq("semester", semester)
          .order("subject_name"),
      ]);
      if (excludedRes.error) throw excludedRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const subjectRows = (subjectsRes.data || []) as Subject[];
      setExcluded(new Set((excludedRes.data || []).map((row: any) => row.excluded_date)));
      setSubjects(subjectRows);
      if (subjectRows.length && !subjectRows.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjectRows[0].id);
      }
      if (!subjectRows.length) setSelectedSubjectId("");
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to load portions.");
    } finally {
      setLoading(false);
    }
  }, [batch, semester, selectedSubjectId]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!selectedSubjectId) {
        setProgressRows([]);
        return;
      }
      const { data, error } = await supabase
        .from("portion_week_progress")
        .select("*")
        .eq("subject_id", selectedSubjectId);
      if (error) NativeAlert.alert("Error", error.message);
      else setProgressRows((data || []) as Progress[]);
    };
    loadProgress();
  }, [selectedSubjectId]);

  const semesterDates = useMemo(
    () => getSemesterDates(semester, academicYear),
    [semester, academicYear]
  );
  const weeks = useMemo(
    () => buildWorkingWeeks(semester, excluded, academicYear),
    [semester, excluded, academicYear]
  );
  const workingDays = weeks.reduce((total, week) => total + week.workingDates.length, 0);
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId) || null;
  const progressMap = useMemo(() => {
    const map: Record<string, Progress> = {};
    progressRows.forEach((row) => {
      map[row.week_key] = row;
    });
    return map;
  }, [progressRows]);

  const monthSummaries = useMemo(() => {
    if (!selectedSubject) return [];
    return SEMESTER_MONTHS[semester].map((month) => {
      const monthKey = weeks.find((w) => w.monthLabel === month.label)?.monthKey;
      const monthWeeks = monthKey ? weeks.filter((week) => week.monthKey === monthKey) : [];
      const expectedPeriod = monthWeeks.length * n(selectedSubject.period_per_week);
      const expectedPages = monthWeeks.length * n(selectedSubject.pages_per_week);
      const actualPeriod = monthWeeks.reduce((sum, week) => sum + n(progressMap[week.key]?.period_taken), 0);
      const actualPages = monthWeeks.reduce((sum, week) => sum + n(progressMap[week.key]?.pages_taken), 0);
      return { label: month.label, weeks: monthWeeks.length, expectedPeriod, expectedPages, actualPeriod, actualPages };
    }).filter((row) => row.weeks > 0);
  }, [semester, weeks, selectedSubject, progressMap]);

  const semSummary = useMemo(() => {
    return monthSummaries.reduce(
      (acc, row) => ({
        expectedPeriod: acc.expectedPeriod + row.expectedPeriod,
        expectedPages: acc.expectedPages + row.expectedPages,
        actualPeriod: acc.actualPeriod + row.actualPeriod,
        actualPages: acc.actualPages + row.actualPages,
      }),
      { expectedPeriod: 0, expectedPages: 0, actualPeriod: 0, actualPages: 0 }
    );
  }, [monthSummaries]);

  const toggleExcludedDate = async (date: string) => {
    const isExcluded = excluded.has(date);
    const next = new Set(excluded);
    if (isExcluded) next.delete(date);
    else next.add(date);
    setExcluded(next);

    if (isExcluded) {
      const { error } = await supabase
        .from("portion_calendar_exclusions")
        .delete()
        .eq("semester", semester)
        .eq("excluded_date", date);
      if (error) {
        NativeAlert.alert("Error", error.message);
        setExcluded(excluded);
      }
    } else {
      const { error } = await supabase.from("portion_calendar_exclusions").upsert({
        semester,
        excluded_date: date,
        created_by: user?.id || null,
      }, { onConflict: "semester,excluded_date" });
      if (error) {
        NativeAlert.alert("Error", error.message);
        setExcluded(excluded);
      }
    }
  };

  const openAdd = () => {
    setEditingSubject(null);
    setForm(blankForm);
    setSubjectModalOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      subject_name: subject.subject_name,
      teacher_name: subject.teacher_name,
      total_pages: String(subject.total_pages),
      total_period: String(subject.total_period),
      period_per_week: String(subject.period_per_week),
    });
    setSubjectModalOpen(true);
  };

  const saveSubject = async () => {
    if (!batch || !user?.id) return;
    const totalPages = n(form.total_pages);
    const totalPeriod = n(form.total_period);
    const periodPerWeek = n(form.period_per_week);
    const pagesPerDay = totalPeriod > 0 ? totalPages / totalPeriod : 0;
    const pagesPerWeek = pagesPerDay * periodPerWeek;

    if (!form.subject_name.trim() || !form.teacher_name.trim()) {
      NativeAlert.alert("Required", "Subject and teacher names are required.");
      return;
    }

    setSavingSubject(true);
    try {
      const payload = {
        id: editingSubject?.id,
        batch,
        semester,
        subject_name: form.subject_name.trim().toUpperCase(),
        teacher_name: form.teacher_name.trim().toUpperCase(),
        total_pages: totalPages,
        total_period: totalPeriod,
        period_per_week: periodPerWeek,
        pages_per_day: pagesPerDay,
        pages_per_week: pagesPerWeek,
        created_by: user.id,
      };

      const { error } = await supabase.from("portion_subjects").upsert(payload);
      if (error) throw error;
      setSubjectModalOpen(false);
      loadData();
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to save subject.");
    } finally {
      setSavingSubject(false);
    }
  };

  const deleteSubject = (subject: Subject) => {
    NativeAlert.alert("Delete Subject", `Delete ${subject.subject_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("portion_subjects").delete().eq("id", subject.id);
          if (error) NativeAlert.alert("Error", error.message);
          else loadData();
        },
      },
    ]);
  };

  const updateProgressDraft = (weekKey: string, field: "period_taken" | "pages_taken", value: string) => {
    const week = weeks.find((item) => item.key === weekKey);
    if (!selectedSubject || !week) return;
    setProgressRows((prev) => {
      const existing = prev.find((row) => row.week_key === weekKey);
      const nextRow: Progress = {
        ...(existing || {
          subject_id: selectedSubject.id,
          week_key: week.key,
          month_key: week.monthKey,
          week_no: week.weekNo,
          date_from: week.dateFrom,
          date_to: week.dateTo,
          period_taken: 0,
          pages_taken: 0,
        }),
        [field]: n(value),
      };
      return existing ? prev.map((row) => (row.week_key === weekKey ? nextRow : row)) : [...prev, nextRow];
    });
  };

  const saveProgress = async () => {
    if (!selectedSubject || !user?.id) return;
    setSavingProgress(true);
    try {
      const payload = weeks.map((week) => {
        const row = progressMap[week.key];
        return {
          subject_id: selectedSubject.id,
          week_key: week.key,
          month_key: week.monthKey,
          week_no: week.weekNo,
          date_from: week.dateFrom,
          date_to: week.dateTo,
          period_taken: n(row?.period_taken),
          pages_taken: n(row?.pages_taken),
          updated_by: user.id,
        };
      });
      const { error } = await supabase.from("portion_week_progress").upsert(payload, { onConflict: "subject_id,week_key" });
      if (error) throw error;
      NativeAlert.alert("Saved", "Weekly portion progress saved.");
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to save progress.");
    } finally {
      setSavingProgress(false);
    }
  };

  if (userLoading || loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (role !== "class-leader") {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <Text style={styles.emptyTitle}>Portions is only for class leaders.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Portions</Text>
        <Text style={styles.subtitle}>{batch || "Class"} portion planning and weekly progress.</Text>
      </View>

      <View style={styles.semTabs}>
        {(["SEM-1", "SEM-2"] as Semester[]).map((sem) => (
          <TouchableOpacity key={sem} onPress={() => setSemester(sem)} style={[styles.semTab, semester === sem && styles.semTabActive]}>
            <Text style={[styles.semTabText, semester === sem && styles.semTabTextActive]}>{sem}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CalendarDays size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Global Working Calendar</Text>
          </View>
          <Text style={styles.hint}>Tap leave/programme days. Selected dates are not counted as working days.</Text>
          <Text style={styles.metricText}>Total Working Days: {workingDays}</Text>
          {SEMESTER_MONTHS[semester].map((month) => {
            const monthDates = semesterDates.filter((date) => date.monthLabel === month.label);
            return (
              <View key={`${semester}-${month.label}`} style={styles.monthBlock}>
                <Text style={styles.monthTitle}>{month.label}</Text>
                <View style={styles.daysGrid}>
                  {monthDates.map((date) => {
                    const isOff = excluded.has(date.value);
                    return (
                      <TouchableOpacity key={date.value} onPress={() => toggleExcludedDate(date.value)} style={[styles.dayChip, isOff && styles.dayChipOff]}>
                        <Text style={[styles.dayText, isOff && styles.dayTextOff]}>{date.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderBetween}>
            <View style={styles.cardHeader}>
              <BookOpen size={20} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Subjects</Text>
            </View>
            <TouchableOpacity onPress={openAdd} style={styles.addButton}>
              <Plus size={16} color={theme.colors.textOnDark} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {subjects.length ? subjects.map((subject, index) => {
            const subjectStatus = getPortionStatus(
              progressRows.filter((row) => row.subject_id === subject.id).reduce((sum, row) => sum + n(row.pages_taken), 0),
              weeks.length * n(subject.pages_per_week)
            );
            return (
              <View key={subject.id} style={styles.subjectCard}>
                <View style={styles.subjectTop}>
                  <Text style={styles.subjectTitle}>{index + 1}) {subject.subject_name}</Text>
                  <Text style={[styles.statusText, styles[`status_${subjectStatus}` as keyof typeof styles]]}>{statusLabel(subjectStatus)}</Text>
                </View>
                <Text style={styles.subjectLine}>TR: {subject.teacher_name} | TPgS: {subject.total_pages} | TLp: {subject.total_period}</Text>
                <Text style={styles.subjectLine}>TLP/W: {subject.period_per_week} | TPg/W: {subject.pages_per_week.toFixed(2)} | TPg/D: {subject.pages_per_day.toFixed(2)}</Text>
                <View style={styles.subjectActions}>
                  <TouchableOpacity onPress={() => openEdit(subject)} style={styles.outlineButton}><Edit size={15} color={theme.colors.primary} /><Text style={styles.outlineText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSubject(subject)} style={styles.dangerButton}><Trash2 size={15} color={theme.colors.error} /><Text style={styles.dangerText}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            );
          }) : <Text style={styles.emptyText}>No subjects added yet.</Text>}
        </View>

        {subjects.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Status</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={selectedSubjectId} onValueChange={setSelectedSubjectId} style={{ color: theme.colors.text }}>
                {subjects.map((subject) => <Picker.Item key={subject.id} label={subject.subject_name} value={subject.id} />)}
              </Picker>
            </View>
            {selectedSubject && (
              <>
                {monthSummaries.map((month) => (
                  <View key={month.label} style={styles.summaryRow}>
                    <Text style={styles.summaryTitle}>{month.label}</Text>
                    <Text style={styles.summaryText}>Period {month.actualPeriod}/{month.expectedPeriod} | Pages {month.actualPages}/{month.expectedPages.toFixed(2)}</Text>
                  </View>
                ))}
                <View style={styles.semSummary}>
                  <Text style={styles.summaryTitle}>Semester Total</Text>
                  <Text style={styles.summaryText}>Period {semSummary.actualPeriod}/{semSummary.expectedPeriod} | Pages {semSummary.actualPages}/{semSummary.expectedPages.toFixed(2)}</Text>
                </View>
                {weeks.map((week) => {
                  const row = progressMap[week.key];
                  const pageStatus = getPortionStatus(n(row?.pages_taken), n(selectedSubject.pages_per_week));
                  return (
                    <View key={week.key} style={styles.weekCard}>
                      <View style={styles.weekTop}>
                        <Text style={styles.weekTitle}>{week.monthLabel} WK-{week.weekNo}</Text>
                        <Text style={[styles.statusText, styles[`status_${pageStatus}` as keyof typeof styles]]}>{statusLabel(pageStatus)}</Text>
                      </View>
                      <Text style={styles.subjectLine}>{displayDate(week.dateFrom)} to {displayDate(week.dateTo)}</Text>
                      <View style={styles.inputRow}>
                        <TextInput value={String(row?.period_taken ?? "")} onChangeText={(v) => updateProgressDraft(week.key, "period_taken", v)} placeholder="Period taken" keyboardType="numeric" style={styles.input} />
                        <TextInput value={String(row?.pages_taken ?? "")} onChangeText={(v) => updateProgressDraft(week.key, "pages_taken", v)} placeholder="Pages taken" keyboardType="numeric" style={styles.input} />
                      </View>
                    </View>
                  );
                })}
                <TouchableOpacity onPress={saveProgress} style={styles.saveButton} disabled={savingProgress}>
                  {savingProgress ? <ActivityIndicator color={theme.colors.textOnDark} /> : <Save size={17} color={theme.colors.textOnDark} />}
                  <Text style={styles.saveButtonText}>Save Weekly Status</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={subjectModalOpen} transparent animationType="fade" onRequestClose={() => setSubjectModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>{editingSubject ? "Edit Subject" : "Add Subject"}</Text>
              <TouchableOpacity onPress={() => setSubjectModalOpen(false)} style={styles.closeButton}><X size={18} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <TextInput value={form.subject_name} onChangeText={(v) => setForm({ ...form, subject_name: v })} placeholder="Subject shortform" style={styles.modalInput} />
            <TextInput value={form.teacher_name} onChangeText={(v) => setForm({ ...form, teacher_name: v })} placeholder="Teacher shortform" style={styles.modalInput} />
            <Text style={styles.hint}>TPgS: count manually from syllabus pages.</Text>
            <TextInput value={form.total_pages} onChangeText={(v) => setForm({ ...form, total_pages: v })} placeholder="TPgS - total pages" keyboardType="numeric" style={styles.modalInput} />
            <Text style={styles.hint}>TLp: get from syllabus PDF.</Text>
            <TextInput value={form.total_period} onChangeText={(v) => setForm({ ...form, total_period: v })} placeholder="TLp - total period" keyboardType="numeric" style={styles.modalInput} />
            <Text style={styles.hint}>TLP/W: crosscheck syllabus period/week with college timetable.</Text>
            <TextInput value={form.period_per_week} onChangeText={(v) => setForm({ ...form, period_per_week: v })} placeholder="TLP/W - period per week" keyboardType="numeric" style={styles.modalInput} />
            <TouchableOpacity onPress={saveSubject} style={styles.saveButton} disabled={savingSubject}>
              {savingSubject ? <ActivityIndicator color={theme.colors.textOnDark} /> : <Save size={17} color={theme.colors.textOnDark} />}
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  stateScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background, padding: 20 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { color: theme.colors.text, fontSize: 30, lineHeight: 36, fontFamily: "MullerBold" },
  subtitle: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, fontFamily: "MullerMedium" },
  semTabs: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 6, borderRadius: 18, backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.border },
  semTab: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  semTabActive: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSoft, ...theme.shadows.soft },
  semTabText: { color: theme.colors.textSecondary, fontSize: 13, fontFamily: "MullerBold" },
  semTabTextActive: { color: theme.colors.primary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  card: { padding: 16, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.medium },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
  cardHeaderBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cardTitle: { color: theme.colors.text, fontSize: 18, lineHeight: 23, fontFamily: "MullerBold" },
  hint: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: "MullerMedium", marginBottom: 8 },
  metricText: { color: theme.colors.primary, fontSize: 15, fontFamily: "MullerBold", marginBottom: 6 },
  monthBlock: { marginTop: 10 },
  monthTitle: { color: theme.colors.text, fontSize: 15, fontFamily: "MullerBold", marginBottom: 8 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  dayChip: { width: 38, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.successSoft, borderWidth: 1, borderColor: "rgba(22,163,74,0.18)" },
  dayChipOff: { backgroundColor: theme.colors.errorSoft, borderColor: "rgba(220,38,38,0.18)" },
  dayText: { color: theme.colors.success, fontSize: 12, fontFamily: "MullerBold" },
  dayTextOff: { color: theme.colors.error },
  addButton: { minHeight: 38, borderRadius: 12, backgroundColor: theme.colors.primary, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
  addButtonText: { color: theme.colors.textOnDark, fontSize: 12, fontFamily: "MullerBold" },
  subjectCard: { padding: 13, borderRadius: 16, backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 10 },
  subjectTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  subjectTitle: { color: theme.colors.text, fontSize: 15, fontFamily: "MullerBold", flex: 1 },
  subjectLine: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: "MullerMedium" },
  subjectActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  outlineButton: { flex: 1, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primaryTint, backgroundColor: theme.colors.primarySoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  outlineText: { color: theme.colors.primary, fontSize: 12, fontFamily: "MullerBold" },
  dangerButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: theme.colors.errorSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  dangerText: { color: theme.colors.error, fontSize: 12, fontFamily: "MullerBold" },
  emptyText: { color: theme.colors.textSecondary, textAlign: "center", paddingVertical: 12, fontFamily: "MullerMedium" },
  emptyTitle: { color: theme.colors.text, fontSize: 18, fontFamily: "MullerBold", textAlign: "center" },
  pickerWrap: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, overflow: "hidden", marginVertical: 10 },
  summaryRow: { padding: 10, borderRadius: 14, backgroundColor: theme.colors.surfaceSoft, marginBottom: 8 },
  semSummary: { padding: 12, borderRadius: 14, backgroundColor: theme.colors.primarySoft, marginBottom: 10 },
  summaryTitle: { color: theme.colors.text, fontSize: 13, fontFamily: "MullerBold" },
  summaryText: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, fontFamily: "MullerMedium" },
  weekCard: { padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, marginBottom: 10 },
  weekTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weekTitle: { color: theme.colors.text, fontSize: 14, fontFamily: "MullerBold" },
  statusText: { fontSize: 12, fontFamily: "MullerBold" },
  status_back: { color: theme.colors.error },
  status_same: { color: theme.colors.warning },
  status_ahead: { color: theme.colors.success },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  input: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: 12, color: theme.colors.text, fontFamily: "MullerMedium" },
  saveButton: { minHeight: 50, borderRadius: 16, backgroundColor: theme.colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  saveButtonText: { color: theme.colors.textOnDark, fontSize: 13, fontFamily: "MullerBold", textTransform: "uppercase" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.32)" },
  modalCard: { padding: 18, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.floating },
  modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { color: theme.colors.text, fontSize: 20, fontFamily: "MullerBold" },
  closeButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: theme.colors.surfaceSoft, alignItems: "center", justifyContent: "center" },
  modalInput: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, paddingHorizontal: 12, color: theme.colors.text, fontFamily: "MullerMedium", marginBottom: 10 },
});
