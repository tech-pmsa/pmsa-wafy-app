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
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit,
  FileCheck2,
  Plus,
  Save,
  Trash2,
  X,
  XCircle,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  ClassOption,
  Semester,
  displayDate,
  fetchClassOptions,
  findMatchingClass,
  toDateValue,
} from "@/lib/portionUtils";
import { syncCeWorkNotifications } from "@/lib/ceWorkNotificationService";
import { exportCeWorkPdf } from "@/lib/ceWorkPdfService";

export const CE_WORK_OPTIONS = [
  "المقالة",
  "المناظرة",
  "الندوة",
  "إعداد الملخص",
  "دفتر التطبيقات",
  "ترجمة النصوص",
  "Reel Making",
  "Table Talk",
];

type CEWork = {
  id: string;
  batch: string;
  semester: Semester;
  work_name: string;
  subject_name: string;
  teacher_name?: string | null;
  started_date: string;
  submission_date: string;
  mark?: number | null;
};

const blankForm = {
  work_name: CE_WORK_OPTIONS[0],
  custom_work_name: "",
  subject_name: "",
  teacher_name: "",
  started_date: toDateValue(new Date()),
  submission_date: toDateValue(new Date()),
  mark: "",
};

export default function CEWorkStatisticsPage() {
  const { user, details, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [semester, setSemester] = useState<Semester>("SEM-1");

  const [works, setWorks] = useState<CEWork[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<CEWork | null>(null);
  const [form, setForm] = useState(blankForm);
  const [dateField, setDateField] = useState<"started_date" | "submission_date" | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // 1. Fetch available classes and set initial activeClass
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchClassOptions("ce_work_items");
        if (!isMounted) return;
        setClasses(classList);

        const defaultClass = findMatchingClass(
          classList,
          details?.batch,
          details?.designation
        );
        setActiveClass(defaultClass);
      } catch (err: any) {
        console.error("Failed to load classes for CE work:", err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details?.batch, details?.designation]);

  // 2. Load CE works and student submissions for activeClass & semester
  const load = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const keys = activeOption ? activeOption.queryKeys : [activeClass];

      // Query ce_work_items filtered by batch and semester
      const { data: workData, error: workError } = await supabase
        .from("ce_work_items")
        .select("*")
        .in("batch", keys)
        .eq("semester", semester)
        .order("submission_date", { ascending: false });

      if (workError) throw workError;

      // Fetch students belonging to this class
      const [batchStudentsRes, classStudentsRes] = await Promise.all([
        supabase.from("students").select("uid, name, cic").in("batch", keys).order("name"),
        supabase.from("students").select("uid, name, cic").in("class_id", keys).order("name"),
      ]);

      const studentMap = new Map<string, any>();
      [...(batchStudentsRes.data || []), ...(classStudentsRes.data || [])].forEach((s) => {
        studentMap.set(s.uid, s);
      });
      const safeStudents = Array.from(studentMap.values());
      setStudents(safeStudents);

      const safeWorks = (workData || []) as CEWork[];
      const ids = safeWorks.map((work) => work.id);
      let studentRows: any[] = [];

      if (ids.length) {
        const { data, error } = await supabase
          .from("ce_work_students")
          .select("*")
          .in("work_id", ids);
        if (error) throw error;
        studentRows = data || [];

        // Auto backfill missing students for existing works
        const existingKeys = new Set(studentRows.map((r: any) => `${r.work_id}-${r.student_uid}`));
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

        if (missingRows.length > 0) {
          await supabase.from("ce_work_students").upsert(missingRows, { onConflict: "work_id,student_uid" });
          const { data: refreshedData } = await supabase
            .from("ce_work_students")
            .select("*")
            .in("work_id", ids);
          studentRows = refreshedData || [];
        }
      }

      setWorks(safeWorks);
      setRows(studentRows);
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to load CE work statistics.");
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, semester]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      load();
    }
  }, [classesLoading, activeClass, load]);

  const rowsByWork = useMemo(() => {
    const map: Record<string, any[]> = {};
    rows.forEach((row) => {
      if (!map[row.work_id]) map[row.work_id] = [];
      map[row.work_id].push(row);
    });
    return map;
  }, [rows]);

  const summary = useMemo(() => {
    let totalSubmitted = 0;
    let totalPending = 0;
    rows.forEach((r) => {
      if (!r.is_removed) {
        if (r.is_submitted) totalSubmitted += 1;
        else totalPending += 1;
      }
    });
    return {
      totalWorks: works.length,
      totalSubmitted,
      totalPending,
    };
  }, [works.length, rows]);

  // Open modal to add new CE work
  const openAdd = () => {
    setEditingWork(null);
    setForm(blankForm);
    setDropdownOpen(false);
    setModalOpen(true);
  };

  // Open modal to edit existing CE work
  const openEdit = (work: CEWork) => {
    setEditingWork(work);
    const isCustom = !CE_WORK_OPTIONS.includes(work.work_name);
    setForm({
      work_name: isCustom ? "Other" : work.work_name,
      custom_work_name: isCustom ? work.work_name : "",
      subject_name: work.subject_name,
      teacher_name: work.teacher_name || "",
      started_date: work.started_date,
      submission_date: work.submission_date,
      mark: work.mark !== undefined && work.mark !== null ? String(work.mark) : "",
    });
    setDropdownOpen(false);
    setModalOpen(true);
  };

  // Save new or updated CE work
  const saveWork = async () => {
    if (!activeClass || !user?.id) return;

    const chosenName =
      form.work_name === "Other"
        ? form.custom_work_name.trim()
        : form.work_name.trim();

    if (!chosenName || !form.subject_name.trim()) {
      NativeAlert.alert("Required", "CE Work Name and Subject Name are required.");
      return;
    }

    setSaving(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const targetBatch = activeOption ? activeOption.id : activeClass;

      const payload = {
        id: editingWork?.id,
        batch: editingWork?.batch || targetBatch,
        semester,
        work_name: chosenName,
        subject_name: form.subject_name.trim().toUpperCase(),
        teacher_name: form.teacher_name.trim() || null,
        started_date: form.started_date,
        submission_date: form.submission_date,
        mark: form.mark ? Number(form.mark) : 0,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from("ce_work_items")
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      // Populate student rows for new works
      if (!editingWork && students.length > 0) {
        const studentPayload = students.map((student) => ({
          work_id: data.id,
          student_uid: student.uid,
          student_name: student.name,
          cic: student.cic,
          is_submitted: false,
          is_removed: false,
        }));
        await supabase
          .from("ce_work_students")
          .upsert(studentPayload, { onConflict: "work_id,student_uid" });
      }

      // Sync local notifications for staff devices
      syncCeWorkNotifications("staff", user.id);

      setModalOpen(false);
      load();
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to save CE work.");
    } finally {
      setSaving(false);
    }
  };

  // Delete CE work
  const deleteWork = (work: CEWork) => {
    NativeAlert.alert(
      "Delete CE Work",
      `Are you sure you want to delete "${work.work_name}" for ${activeClass}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from("ce_work_items").delete().eq("id", work.id);
              if (error) throw error;
              syncCeWorkNotifications("staff", user?.id);
              load();
            } catch (err: any) {
              NativeAlert.alert("Error", err.message || "Failed to delete CE work.");
            }
          },
        },
      ]
    );
  };

  // Toggle student submission status
  const toggleSubmit = async (row: any) => {
    try {
      const { error } = await supabase
        .from("ce_work_students")
        .update({ is_submitted: !row.is_submitted })
        .eq("id", row.id);
      if (error) throw error;
      load();
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to update submission.");
    }
  };

  // Export modern PDF report
  const handleExportPdf = async () => {
    if (!works.length) {
      NativeAlert.alert("No Data", `No CE works recorded for ${activeClass} in ${semester}.`);
      return;
    }
    setExportingPdf(true);
    try {
      await exportCeWorkPdf({
        className: activeClass,
        semester,
        works,
        workStudents: rows,
      });
    } catch (err: any) {
      NativeAlert.alert("Export Failed", err.message || "Failed to generate CE work PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (userLoading || classesLoading || (loading && !works.length)) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>CE Work</Text>
        <Text style={styles.subtitle}>
          {activeClass ? `${activeClass} (${semester}) CE work management.` : "Select a class to manage CE work."}
        </Text>
      </View>

      {/* Class selection horizontal tabs */}
      {classes.length > 0 ? (
        <View style={styles.classTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.classTabsRow}
          >
            {classes.map((cls) => {
              const isActive = activeClass === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => setActiveClass(cls.id)}
                  activeOpacity={0.84}
                  style={[styles.classChip, isActive && styles.classChipActive]}
                >
                  <Text style={[styles.classChipText, isActive && styles.classChipTextActive]}>
                    {cls.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Semester Tabs: SEM 1 & SEM 2 */}
      <View style={styles.semTabs}>
        {(["SEM-1", "SEM-2"] as Semester[]).map((sem) => (
          <TouchableOpacity
            key={sem}
            onPress={() => setSemester(sem)}
            style={[styles.semTab, semester === sem && styles.semTabActive]}
          >
            <Text style={[styles.semTabText, semester === sem && styles.semTabTextActive]}>
              {sem === "SEM-1" ? "SEM 1" : "SEM 2"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Actions row: Add CE Work & Download Modern PDF */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity onPress={openAdd} style={styles.addButton} activeOpacity={0.88}>
            <Plus size={17} color={theme.colors.textOnDark} />
            <Text style={styles.addButtonText}>Add CE Work ({semester})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExportPdf}
            style={styles.pdfButton}
            disabled={exportingPdf}
            activeOpacity={0.88}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Download size={17} color={theme.colors.primary} />
            )}
            <Text style={styles.pdfButtonText}>
              {exportingPdf ? "Exporting..." : "Download PDF"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary metrics strip */}
        {works.length > 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.totalWorks}</Text>
              <Text style={styles.summaryLabel}>Total Works</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                {summary.totalSubmitted}
              </Text>
              <Text style={styles.summaryLabel}>Submitted</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.error }]}>
                {summary.totalPending}
              </Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>
        ) : null}

        {/* CE Work list */}
        {!works.length ? (
          <View style={styles.emptyCard}>
            <FileCheck2 size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No CE Work in {semester}</Text>
            <Text style={styles.emptyText}>
              {activeClass
                ? `No CE work added for ${activeClass} in ${semester}. Tap "+ Add CE Work" above to create one.`
                : "No CE work records found."}
            </Text>
          </View>
        ) : (
          works.map((work) => {
            const isOpen = expandedId === work.id;
            const workRows = (rowsByWork[work.id] || []).filter((r) => !r.is_removed);
            const submitted = workRows.filter((row) => row.is_submitted);
            const pending = workRows.filter((row) => !row.is_submitted);

            return (
              <View key={work.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() => setExpandedId(isOpen ? null : work.id)}
                  style={styles.cardHeader}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.workTitle}>{work.work_name}</Text>
                      {work.mark ? (
                        <View style={styles.markBadge}>
                          <Text style={styles.markBadgeText}>{work.mark} Marks</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.meta}>
                      {work.subject_name}
                      {work.teacher_name ? ` | ${work.teacher_name}` : ""}
                    </Text>
                    <Text style={styles.dateMeta}>
                      SD: {displayDate(work.started_date)}  •  SB: {displayDate(work.submission_date)}
                    </Text>
                  </View>
                  {isOpen ? (
                    <ChevronUp size={20} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Edit & Delete Action Row */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => openEdit(work)}
                    style={styles.editButton}
                    activeOpacity={0.7}
                  >
                    <Edit size={15} color={theme.colors.primary} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteWork(work)}
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color={theme.colors.error} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick stats badges */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <CheckCircle2 size={16} color={theme.colors.success} />
                    <Text style={styles.statValue}>{submitted.length}</Text>
                    <Text style={styles.statLabel}>Submitted</Text>
                  </View>
                  <View style={styles.statBox}>
                    <XCircle size={16} color={theme.colors.error} />
                    <Text style={styles.statValue}>{pending.length}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>

                {/* Expanded Student Submission Check List */}
                {isOpen && (
                  <View style={styles.body}>
                    <Text style={styles.studentListHeader}>Student Submissions ({workRows.length}):</Text>
                    {workRows.length ? (
                      workRows.map((row) => (
                        <View key={row.id} style={styles.studentRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{row.student_name}</Text>
                            <Text style={styles.studentMeta}>CIC: {row.cic || "-"}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => toggleSubmit(row)}
                            style={[
                              styles.submitButton,
                              row.is_submitted ? styles.submitted : styles.notSubmitted,
                            ]}
                          >
                            <Text
                              style={[
                                styles.submitText,
                                row.is_submitted ? styles.submittedText : styles.notSubmittedText,
                              ]}
                            >
                              {row.is_submitted ? "Submitted" : "Not Submitted"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No students enrolled in this batch.</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit CE Work Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>
                {editingWork ? "Edit CE Work" : "Add CE Work"} ({semester})
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.closeButton}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* CE Work Name Selector Dropdown */}
              <Text style={styles.fieldLabel}>CE Work Name</Text>
              <TouchableOpacity
                onPress={() => setDropdownOpen(!dropdownOpen)}
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownValue}>
                  {form.work_name === "Other" && form.custom_work_name
                    ? form.custom_work_name
                    : form.work_name}
                </Text>
                <ChevronDown size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {dropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {CE_WORK_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => {
                        setForm({ ...form, work_name: opt });
                        setDropdownOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        form.work_name === opt && styles.dropdownItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          form.work_name === opt && styles.dropdownItemTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => {
                      setForm({ ...form, work_name: "Other" });
                      setDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      form.work_name === "Other" && styles.dropdownItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        form.work_name === "Other" && styles.dropdownItemTextActive,
                      ]}
                    >
                      Other (Custom Name)
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {form.work_name === "Other" && (
                <TextInput
                  value={form.custom_work_name}
                  onChangeText={(v) => setForm({ ...form, custom_work_name: v })}
                  placeholder="Enter custom CE work name"
                  placeholderTextColor="#000000"
                  style={[styles.input, { marginTop: 6 }]}
                />
              )}

              {/* Subject Name */}
              <Text style={styles.fieldLabel}>Subject Name</Text>
              <TextInput
                value={form.subject_name}
                onChangeText={(v) => setForm({ ...form, subject_name: v })}
                placeholder="e.g. Nahw, Fiqh, English"
                placeholderTextColor="#000000"
                style={styles.input}
              />

              {/* Teacher Name */}
              <Text style={styles.fieldLabel}>Teacher Name</Text>
              <TextInput
                value={form.teacher_name}
                onChangeText={(v) => setForm({ ...form, teacher_name: v })}
                placeholder="Teacher name / shortform"
                placeholderTextColor="#000000"
                style={styles.input}
              />

              {/* Mark */}
              <Text style={styles.fieldLabel}>Mark</Text>
              <TextInput
                value={form.mark}
                onChangeText={(v) => setForm({ ...form, mark: v })}
                placeholder="e.g. 10 or 20"
                placeholderTextColor="#000000"
                keyboardType="numeric"
                style={styles.input}
              />

              {/* Start & Submission Dates */}
              <Text style={styles.fieldLabel}>Dates</Text>
              <View style={styles.dateRow}>
                <TouchableOpacity
                  onPress={() => setDateField("started_date")}
                  style={styles.dateButton}
                >
                  <CalendarDays size={16} color={theme.colors.primary} />
                  <Text style={styles.dateText}>Start: {displayDate(form.started_date)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDateField("submission_date")}
                  style={styles.dateButton}
                >
                  <CalendarDays size={16} color={theme.colors.primary} />
                  <Text style={styles.dateText}>Submit: {displayDate(form.submission_date)}</Text>
                </TouchableOpacity>
              </View>

              {dateField && (
                <DateTimePicker
                  value={new Date(`${form[dateField]}T00:00:00`)}
                  mode="date"
                  onChange={(_, date) => {
                    setDateField(null);
                    if (date) setForm({ ...form, [dateField]: toDateValue(date) });
                  }}
                />
              )}

              {/* Save Button */}
              <TouchableOpacity
                onPress={saveWork}
                style={styles.modalSaveButton}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.textOnDark} />
                ) : (
                  <Save size={18} color={theme.colors.textOnDark} />
                )}
                <Text style={styles.saveButtonText}>Save CE Work</Text>
              </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  classTabsWrapper: {
    marginBottom: 8,
  },
  classTabsRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  classChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  classChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  classChipTextActive: {
    color: theme.colors.textOnDark,
    fontFamily: "MullerBold",
  },
  semTabs: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 5,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  semTab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  semTabActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    ...theme.shadows.soft,
  },
  semTabText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  semTabTextActive: {
    color: theme.colors.primary,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  topActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  addButton: {
    flex: 1.25,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    ...theme.shadows.soft,
  },
  addButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  pdfButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(10,37,64,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    ...theme.shadows.soft,
  },
  pdfButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    ...theme.shadows.soft,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  cardHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  workTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerBold",
  },
  markBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
  },
  markBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontFamily: "MullerBold",
  },
  meta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontFamily: "MullerMedium",
  },
  dateMeta: {
    color: theme.colors.primary,
    fontSize: 11,
    marginTop: 4,
    fontFamily: "MullerMedium",
  },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  editButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  editText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  deleteButton: {
    flex: 1,
    minHeight: 40,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  statsRow: {
    flexDirection: "row",
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  statBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
  },
  body: {
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  studentListHeader: {
    fontSize: 12,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  studentMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontFamily: "MullerMedium",
  },
  submitButton: {
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitted: { backgroundColor: theme.colors.successSoft },
  notSubmitted: { backgroundColor: theme.colors.errorSoft },
  submitText: { fontSize: 10, fontFamily: "MullerBold", textTransform: "uppercase" },
  submittedText: { color: theme.colors.success },
  notSubmittedText: { color: theme.colors.error },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.32)",
  },
  modalCard: {
    maxHeight: "88%",
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.floating,
  },
  modalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontFamily: "MullerBold",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    marginVertical: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
    marginTop: 10,
    marginBottom: 4,
  },
  dropdownTrigger: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  dropdownMenu: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  dropdownItemTextActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    color: theme.colors.text,
    paddingHorizontal: 12,
    fontFamily: "MullerMedium",
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  dateText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  modalSaveButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 8,
  },
  saveButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
});
