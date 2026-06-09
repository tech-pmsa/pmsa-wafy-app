import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert as NativeAlert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, ChevronDown, ChevronUp, Edit, Plus, Save, Trash2, X } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import { displayDate, toDateValue } from "@/lib/portionUtils";

type Work = {
  id: string;
  batch: string;
  work_name: string;
  subject_name: string;
  started_date: string;
  submission_date: string;
};

const blank = { work_name: "", subject_name: "", started_date: toDateValue(new Date()), submission_date: toDateValue(new Date()) };

function batchFrom(details: any) {
  return details?.designation || details?.batch || "";
}

function classIdFrom(details: any) {
  return details?.designation?.replace(/\s+Class$/i, "") || details?.batch || "";
}

export default function CEWorkPage() {
  const { user, details, role, loading: userLoading } = useUserData();
  const batch = batchFrom(details);
  const classId = classIdFrom(details);
  const [works, setWorks] = useState<Work[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [workStudents, setWorkStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [form, setForm] = useState(blank);
  const [dateField, setDateField] = useState<"started_date" | "submission_date" | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!batch) return;
    setLoading(true);
    try {
      const [worksRes, batchStudentsRes, classStudentsRes] = await Promise.all([
        supabase.from("ce_work_items").select("*").eq("batch", batch).order("submission_date", { ascending: false }),
        supabase.from("students").select("uid, name, cic").eq("batch", batch).order("name"),
        supabase.from("students").select("uid, name, cic").eq("class_id", classId).order("name"),
      ]);
      if (worksRes.error) throw worksRes.error;
      if (batchStudentsRes.error) throw batchStudentsRes.error;
      if (classStudentsRes.error) throw classStudentsRes.error;

      const studentMap = new Map<string, any>();
      [...(batchStudentsRes.data || []), ...(classStudentsRes.data || [])].forEach((student) => {
        studentMap.set(student.uid, student);
      });
      const safeStudents = Array.from(studentMap.values());
      const safeWorks = (worksRes.data || []) as Work[];

      setWorks(safeWorks);
      setStudents(safeStudents);
      const workIds = (worksRes.data || []).map((work: any) => work.id);
      if (workIds.length) {
        const { data, error } = await supabase.from("ce_work_students").select("*").in("work_id", workIds);
        if (error) throw error;
        const existingRows = data || [];
        const existingKeys = new Set(existingRows.map((row: any) => `${row.work_id}-${row.student_uid}`));
        const missingRows = safeWorks.flatMap((work) =>
          safeStudents
            .filter((student) => !existingKeys.has(`${work.id}-${student.uid}`))
            .map((student) => ({
              work_id: work.id,
              student_uid: student.uid,
              student_name: student.name,
              cic: student.cic,
              is_submitted: false,
              is_removed: false,
            }))
        );

        if (missingRows.length) {
          const { error: backfillError } = await supabase
            .from("ce_work_students")
            .upsert(missingRows, { onConflict: "work_id,student_uid" });
          if (backfillError) throw backfillError;

          const { data: refreshedRows, error: refreshError } = await supabase
            .from("ce_work_students")
            .select("*")
            .in("work_id", workIds);
          if (refreshError) throw refreshError;
          setWorkStudents(refreshedRows || []);
        } else {
          setWorkStudents(existingRows);
        }
      } else setWorkStudents([]);
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to load CE work.");
    } finally {
      setLoading(false);
    }
  }, [batch, classId]);

  useEffect(() => {
    if (!userLoading) loadData();
  }, [userLoading, loadData]);

  const studentsByWork = useMemo(() => {
    const map: Record<string, any[]> = {};
    workStudents.forEach((row) => {
      if (!map[row.work_id]) map[row.work_id] = [];
      map[row.work_id].push(row);
    });
    return map;
  }, [workStudents]);

  const openAdd = () => {
    setEditingWork(null);
    setForm(blank);
    setModalOpen(true);
  };

  const openEdit = (work: Work) => {
    setEditingWork(work);
    setForm({
      work_name: work.work_name,
      subject_name: work.subject_name,
      started_date: work.started_date,
      submission_date: work.submission_date,
    });
    setModalOpen(true);
  };

  const saveWork = async () => {
    if (!batch || !user?.id) return;
    if (!form.work_name.trim() || !form.subject_name.trim()) {
      NativeAlert.alert("Required", "Work name and subject are required.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.from("ce_work_items").upsert({
        id: editingWork?.id,
        batch,
        work_name: form.work_name.trim(),
        subject_name: form.subject_name.trim().toUpperCase(),
        started_date: form.started_date,
        submission_date: form.submission_date,
        created_by: user.id,
      }).select().single();
      if (error) throw error;

      if (!editingWork) {
        const rows = students.map((student) => ({
          work_id: data.id,
          student_uid: student.uid,
          student_name: student.name,
          cic: student.cic,
          is_submitted: false,
          is_removed: false,
        }));
        if (rows.length) {
          const { error: studentError } = await supabase.from("ce_work_students").upsert(rows, { onConflict: "work_id,student_uid" });
          if (studentError) throw studentError;
        }
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to save CE work.");
    } finally {
      setSaving(false);
    }
  };

  const deleteWork = (work: Work) => {
    NativeAlert.alert("Delete Work", `Delete ${work.work_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("ce_work_items").delete().eq("id", work.id);
          if (error) NativeAlert.alert("Error", error.message);
          else loadData();
        },
      },
    ]);
  };

  const toggleSubmit = async (row: any) => {
    const { error } = await supabase.from("ce_work_students").update({ is_submitted: !row.is_submitted }).eq("id", row.id);
    if (error) NativeAlert.alert("Error", error.message);
    else loadData();
  };

  const removeStudent = (row: any) => {
    NativeAlert.alert("Remove Student", `Remove ${row.student_name} from this CE work?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("ce_work_students").update({ is_removed: true }).eq("id", row.id);
          if (error) NativeAlert.alert("Error", error.message);
          else loadData();
        },
      },
    ]);
  };

  if (userLoading || loading) return <SafeAreaView style={styles.stateScreen}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;
  if (role !== "class-leader") return <SafeAreaView style={styles.stateScreen}><Text style={styles.emptyTitle}>CE Work is only for class leaders.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>CE Work</Text>
        <Text style={styles.subtitle}>{batch} CE submission tracking.</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={openAdd} style={styles.addButton}><Plus size={17} color={theme.colors.textOnDark} /><Text style={styles.addButtonText}>Add CE Work</Text></TouchableOpacity>
        {works.length ? works.map((work) => {
          const isOpen = expandedId === work.id;
          const rows = (studentsByWork[work.id] || []).filter((row) => !row.is_removed);
          return (
            <View key={work.id} style={styles.card}>
              <TouchableOpacity onPress={() => setExpandedId(isOpen ? null : work.id)} style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workTitle}>{work.work_name}</Text>
                  <Text style={styles.workMeta}>{work.subject_name} | {displayDate(work.started_date)} to {displayDate(work.submission_date)}</Text>
                </View>
                {isOpen ? <ChevronUp size={20} color={theme.colors.textMuted} /> : <ChevronDown size={20} color={theme.colors.textMuted} />}
              </TouchableOpacity>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => openEdit(work)} style={styles.editButton}><Edit size={15} color={theme.colors.primary} /><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => deleteWork(work)} style={styles.deleteButton}><Trash2 size={15} color={theme.colors.error} /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
              </View>
              {isOpen && (
                <View style={styles.body}>
                  {rows.map((row) => (
                    <View key={row.id} style={styles.studentRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{row.student_name}</Text>
                        <Text style={styles.studentMeta}>CIC: {row.cic || "-"}</Text>
                      </View>
                      <TouchableOpacity onPress={() => toggleSubmit(row)} style={[styles.submitButton, row.is_submitted ? styles.submitted : styles.notSubmitted]}>
                        <Text style={[styles.submitText, row.is_submitted ? styles.submittedText : styles.notSubmittedText]}>{row.is_submitted ? "Submitted" : "Not Submitted"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeStudent(row)} style={styles.removeButton}><X size={16} color={theme.colors.error} /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No CE work added yet.</Text></View>}
      </ScrollView>
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}><Text style={styles.modalTitle}>{editingWork ? "Edit CE Work" : "Add CE Work"}</Text><TouchableOpacity onPress={() => setModalOpen(false)}><X size={20} color={theme.colors.text} /></TouchableOpacity></View>
            <TextInput value={form.work_name} onChangeText={(v) => setForm({ ...form, work_name: v })} placeholder="Work name" style={styles.input} />
            <TextInput value={form.subject_name} onChangeText={(v) => setForm({ ...form, subject_name: v })} placeholder="Sub" style={styles.input} />
            <TouchableOpacity onPress={() => setDateField("started_date")} style={styles.dateButton}><CalendarDays size={17} color={theme.colors.primary} /><Text style={styles.dateText}>SD: {displayDate(form.started_date)}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setDateField("submission_date")} style={styles.dateButton}><CalendarDays size={17} color={theme.colors.primary} /><Text style={styles.dateText}>SB: {displayDate(form.submission_date)}</Text></TouchableOpacity>
            {dateField && <DateTimePicker value={new Date(`${form[dateField]}T00:00:00`)} mode="date" onChange={(_, date) => { setDateField(null); if (date) setForm({ ...form, [dateField]: toDateValue(date) }); }} />}
            <TouchableOpacity onPress={saveWork} style={styles.saveButton} disabled={saving}>{saving ? <ActivityIndicator color={theme.colors.textOnDark} /> : <Save size={17} color={theme.colors.textOnDark} />}<Text style={styles.saveText}>Save</Text></TouchableOpacity>
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
  subtitle: { color: theme.colors.textSecondary, fontSize: 14, fontFamily: "MullerMedium", marginTop: 6 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  addButton: { minHeight: 50, borderRadius: 16, backgroundColor: theme.colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addButtonText: { color: theme.colors.textOnDark, fontSize: 13, fontFamily: "MullerBold", textTransform: "uppercase" },
  card: { borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden", ...theme.shadows.soft },
  cardHeader: { padding: 14, flexDirection: "row", alignItems: "center" },
  workTitle: { color: theme.colors.text, fontSize: 16, fontFamily: "MullerBold" },
  workMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, fontFamily: "MullerMedium" },
  actionRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: theme.colors.border },
  editButton: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  editText: { color: theme.colors.primary, fontSize: 12, fontFamily: "MullerBold" },
  deleteButton: { flex: 1, minHeight: 42, borderLeftWidth: 1, borderLeftColor: theme.colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  deleteText: { color: theme.colors.error, fontSize: 12, fontFamily: "MullerBold" },
  body: { padding: 12, gap: 9, borderTopWidth: 1, borderTopColor: theme.colors.border },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, backgroundColor: theme.colors.surfaceSoft },
  studentName: { color: theme.colors.text, fontSize: 13, fontFamily: "MullerBold" },
  studentMeta: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 3, fontFamily: "MullerMedium" },
  submitButton: { minHeight: 36, borderRadius: 12, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  submitted: { backgroundColor: theme.colors.successSoft },
  notSubmitted: { backgroundColor: theme.colors.errorSoft },
  submitText: { fontSize: 10, fontFamily: "MullerBold", textTransform: "uppercase" },
  submittedText: { color: theme.colors.success },
  notSubmittedText: { color: theme.colors.error },
  removeButton: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.errorSoft },
  emptyCard: { minHeight: 130, borderRadius: 22, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: theme.colors.textSecondary, fontSize: 14, fontFamily: "MullerMedium", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 18, backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.32)" },
  modalCard: { padding: 18, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: 10, ...theme.shadows.floating },
  modalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { color: theme.colors.text, fontSize: 20, fontFamily: "MullerBold" },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft, color: theme.colors.text, paddingHorizontal: 12, fontFamily: "MullerMedium" },
  dateButton: { minHeight: 46, borderRadius: 14, backgroundColor: theme.colors.primarySoft, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  dateText: { color: theme.colors.primary, fontSize: 13, fontFamily: "MullerBold" },
  saveButton: { minHeight: 50, borderRadius: 16, backgroundColor: theme.colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: theme.colors.textOnDark, fontSize: 13, fontFamily: "MullerBold", textTransform: "uppercase" },
});
