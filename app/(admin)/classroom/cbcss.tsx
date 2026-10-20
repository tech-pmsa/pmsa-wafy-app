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
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Edit,
  GraduationCap,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  ClassOption,
  Semester,
  fetchClassOptions,
  findMatchingClass,
} from "@/lib/portionUtils";
import { exportCbcssPdf } from "@/lib/cbcssPdfService";

export type CourseType = "OFF COURSE" | "IN COURSE";

export interface CbcssRecord {
  id: string;
  batch: string;
  semester: Semester;
  course_type: CourseType;
  course_name: string;
  instead_of: string;
  credits: number;
}

export interface CbcssStudent {
  id?: string;
  record_id: string;
  student_uid: string;
  student_name: string;
  cic?: string | null;
}

const blankForm = {
  course_type: "OFF COURSE" as CourseType,
  course_name: "",
  instead_of: "",
  credits: "",
};

export default function CbcssPage() {
  const { user, details, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [semester, setSemester] = useState<Semester>("SEM-1");

  const [records, setRecords] = useState<CbcssRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recordStudents, setRecordStudents] = useState<CbcssStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CbcssRecord | null>(null);
  const [form, setForm] = useState(blankForm);
  const [selectedStudentUids, setSelectedStudentUids] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // 1. Fetch available classes & set default active class
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchClassOptions("cbcss_records");
        if (!isMounted) return;
        setClasses(classList);

        const defaultClass = findMatchingClass(
          classList,
          details?.batch,
          details?.designation
        );
        setActiveClass(defaultClass);
      } catch (err: any) {
        console.error("Failed to load classes for CBCSS:", err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details?.batch, details?.designation]);

  // 2. Load CBCSS records, enrolled students, and class roster
  const loadData = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const keys = activeOption ? activeOption.queryKeys : [activeClass];

      // Fetch CBCSS records
      const { data: recData, error: recError } = await supabase
        .from("cbcss_records")
        .select("*")
        .in("batch", keys)
        .eq("semester", semester)
        .order("created_at", { ascending: false });

      if (recError) throw recError;

      // Fetch class students
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

      const safeRecords = (recData || []) as CbcssRecord[];
      const recIds = safeRecords.map((r) => r.id);
      let studentRows: CbcssStudent[] = [];

      if (recIds.length > 0) {
        const { data: junctionData, error: junctionError } = await supabase
          .from("cbcss_students")
          .select("*")
          .in("record_id", recIds);
        if (junctionError) throw junctionError;
        studentRows = (junctionData || []) as CbcssStudent[];
      }

      setRecords(safeRecords);
      setRecordStudents(studentRows);
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to load CBCSS data.");
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, semester]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      loadData();
    }
  }, [classesLoading, activeClass, loadData]);

  // Group enrolled students by record_id
  const studentsByRecord = useMemo(() => {
    const map: Record<string, CbcssStudent[]> = {};
    recordStudents.forEach((row) => {
      if (!map[row.record_id]) map[row.record_id] = [];
      map[row.record_id].push(row);
    });
    return map;
  }, [recordStudents]);

  // Filter student list in modal by search query
  const filteredStudents = useMemo(() => {
    const query = studentSearch.toLowerCase().trim();
    if (!query) return students;
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) || s.cic?.toLowerCase().includes(query)
    );
  }, [students, studentSearch]);

  // Open modal to add a new course
  const openAdd = () => {
    setEditingRecord(null);
    setForm(blankForm);
    setSelectedStudentUids(new Set());
    setStudentSearch("");
    setTypeDropdownOpen(false);
    setModalOpen(true);
  };

  // Open modal to edit existing course
  const openEdit = (rec: CbcssRecord) => {
    setEditingRecord(rec);
    setForm({
      course_type: rec.course_type,
      course_name: rec.course_name,
      instead_of: rec.instead_of,
      credits: rec.credits !== undefined && rec.credits !== null ? String(rec.credits) : "",
    });
    const enrolledUids = new Set(
      (studentsByRecord[rec.id] || []).map((s) => s.student_uid)
    );
    setSelectedStudentUids(enrolledUids);
    setStudentSearch("");
    setTypeDropdownOpen(false);
    setModalOpen(true);
  };

  // Toggle selection of all students
  const toggleSelectAll = () => {
    if (selectedStudentUids.size === students.length) {
      setSelectedStudentUids(new Set());
    } else {
      setSelectedStudentUids(new Set(students.map((s) => s.uid)));
    }
  };

  // Toggle single student
  const toggleStudent = (uid: string) => {
    const updated = new Set(selectedStudentUids);
    if (updated.has(uid)) updated.delete(uid);
    else updated.add(uid);
    setSelectedStudentUids(updated);
  };

  // Save CBCSS record and enrolled students
  const saveRecord = async () => {
    if (!activeClass || !user?.id) return;

    if (!form.course_name.trim()) {
      NativeAlert.alert("Required", "Course Name is required.");
      return;
    }
    if (!form.instead_of.trim()) {
      NativeAlert.alert("Required", "'Instead of' (replaced subject) is required.");
      return;
    }

    setSaving(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const targetBatch = activeOption ? activeOption.id : activeClass;

      const payload = {
        id: editingRecord?.id,
        batch: editingRecord?.batch || targetBatch,
        semester,
        course_type: form.course_type,
        course_name: form.course_name.trim(),
        instead_of: form.instead_of.trim(),
        credits: form.credits ? Number(form.credits) : 0,
        created_by: user.id,
      };

      const { data: recordData, error: recordError } = await supabase
        .from("cbcss_records")
        .upsert(payload)
        .select()
        .single();

      if (recordError) throw recordError;

      // Sync junction table cbcss_students
      const recordId = recordData.id;

      // Delete existing junction entries for this record
      await supabase.from("cbcss_students").delete().eq("record_id", recordId);

      // Insert currently selected students
      const selectedList = students.filter((s) => selectedStudentUids.has(s.uid));
      if (selectedList.length > 0) {
        const studentPayload = selectedList.map((s) => ({
          record_id: recordId,
          student_uid: s.uid,
          student_name: s.name,
          cic: s.cic || null,
        }));

        const { error: studentInsertError } = await supabase
          .from("cbcss_students")
          .insert(studentPayload);
        if (studentInsertError) throw studentInsertError;
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to save CBCSS record.");
    } finally {
      setSaving(false);
    }
  };

  // Delete CBCSS record
  const deleteRecord = (rec: CbcssRecord) => {
    NativeAlert.alert(
      "Delete CBCSS Record",
      `Are you sure you want to delete "${rec.course_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("cbcss_records")
                .delete()
                .eq("id", rec.id);
              if (error) throw error;
              loadData();
            } catch (err: any) {
              NativeAlert.alert("Error", err.message || "Failed to delete CBCSS record.");
            }
          },
        },
      ]
    );
  };

  // Export modern PDF report
  const handleExportPdf = async () => {
    if (!records.length) {
      NativeAlert.alert("No Data", `No CBCSS courses recorded for ${activeClass} in ${semester}.`);
      return;
    }
    setExportingPdf(true);
    try {
      await exportCbcssPdf({
        className: activeClass,
        semester,
        records,
        recordStudents,
      });
    } catch (err: any) {
      NativeAlert.alert("Export Failed", err.message || "Failed to generate CBCSS PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (userLoading || classesLoading || (loading && !records.length)) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CBCSS</Text>
        <Text style={styles.subtitle}>
          {activeClass
            ? `${activeClass} (${semester}) Choice Based Credit Courses.`
            : "Select a class to view CBCSS records."}
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
        {/* Top actions: Add CBCSS Course & Download PDF */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity onPress={openAdd} style={styles.addButton} activeOpacity={0.88}>
            <Plus size={17} color={theme.colors.textOnDark} />
            <Text style={styles.addButtonText}>Add CBCSS Course</Text>
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

        {/* Summary metric cards */}
        {records.length > 0 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{records.length}</Text>
              <Text style={styles.summaryLabel}>Total Courses</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>
                {records.filter((r) => r.course_type === "IN COURSE").length}
              </Text>
              <Text style={styles.summaryLabel}>In Course</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: "#D97706" }]}>
                {records.filter((r) => r.course_type === "OFF COURSE").length}
              </Text>
              <Text style={styles.summaryLabel}>Off Course</Text>
            </View>
          </View>
        ) : null}

        {/* Records list */}
        {!records.length ? (
          <View style={styles.emptyCard}>
            <GraduationCap size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No CBCSS Courses in {semester}</Text>
            <Text style={styles.emptyText}>
              {activeClass
                ? `No CBCSS courses added for ${activeClass} in ${semester}. Tap "+ Add CBCSS Course" to create one.`
                : "No CBCSS records found."}
            </Text>
          </View>
        ) : (
          records.map((rec) => {
            const isOpen = expandedId === rec.id;
            const enrolled = studentsByRecord[rec.id] || [];
            const isOff = rec.course_type === "OFF COURSE";

            return (
              <View key={rec.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() => setExpandedId(isOpen ? null : rec.id)}
                  style={styles.cardHeader}
                  activeOpacity={0.88}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTopRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          isOff ? styles.typeBadgeOff : styles.typeBadgeIn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            isOff ? styles.typeBadgeTextOff : styles.typeBadgeTextIn,
                          ]}
                        >
                          {rec.course_type}
                        </Text>
                      </View>
                      <View style={styles.creditsBadge}>
                        <Text style={styles.creditsBadgeText}>{rec.credits} Credits</Text>
                      </View>
                    </View>

                    <Text style={styles.courseTitle}>{rec.course_name}</Text>
                    <Text style={styles.insteadOfText}>
                      <Text style={{ color: theme.colors.textSecondary }}>Instead of: </Text>
                      <Text style={{ fontFamily: "MullerBold", color: theme.colors.text }}>
                        {rec.instead_of}
                      </Text>
                    </Text>

                    <View style={styles.enrolledInfo}>
                      <Users size={13} color={theme.colors.textSecondary} />
                      <Text style={styles.enrolledText}>
                        {enrolled.length} {enrolled.length === 1 ? "Student" : "Students"} Enrolled
                      </Text>
                    </View>
                  </View>

                  {isOpen ? (
                    <ChevronUp size={20} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Edit & Delete actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => openEdit(rec)}
                    style={styles.editButton}
                    activeOpacity={0.7}
                  >
                    <Edit size={14} color={theme.colors.primary} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteRecord(rec)}
                    style={styles.deleteButton}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={theme.colors.error} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {/* Expanded student chips */}
                {isOpen && (
                  <View style={styles.expandedBody}>
                    <Text style={styles.expandedTitle}>
                      Enrolled Students ({enrolled.length}):
                    </Text>
                    {enrolled.length > 0 ? (
                      <View style={styles.chipContainer}>
                        {enrolled.map((s) => (
                          <View key={s.student_uid} style={styles.studentChip}>
                            <Text style={styles.studentChipName}>{s.student_name}</Text>
                            {s.cic ? (
                              <Text style={styles.studentChipCic}>({s.cic})</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyEnrolledText}>No students selected.</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Course Modal */}
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
                {editingRecord ? "Edit CBCSS Course" : "Add CBCSS Course"} ({semester})
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.closeButton}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Course Type Dropdown: OFF COURSE / IN COURSE */}
              <Text style={styles.fieldLabel}>Which Course</Text>
              <TouchableOpacity
                onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownValue}>{form.course_type}</Text>
                <ChevronDown size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {typeDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {(["OFF COURSE", "IN COURSE"] as CourseType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setForm({ ...form, course_type: t });
                        setTypeDropdownOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        form.course_type === t && styles.dropdownItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          form.course_type === t && styles.dropdownItemTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Course Name */}
              <Text style={styles.fieldLabel}>Course Name</Text>
              <TextInput
                value={form.course_name}
                onChangeText={(v) => setForm({ ...form, course_name: v })}
                placeholder="Enter course name"
                placeholderTextColor="#000000"
                style={styles.input}
              />

              {/* Instead of (Replaced Subject) */}
              <Text style={styles.fieldLabel}>Instead of (Replaced Subject)</Text>
              <TextInput
                value={form.instead_of}
                onChangeText={(v) => setForm({ ...form, instead_of: v })}
                placeholder="e.g. Arabic Literature, History"
                placeholderTextColor="#000000"
                style={styles.input}
              />

              {/* Credits */}
              <Text style={styles.fieldLabel}>Credits</Text>
              <TextInput
                value={form.credits}
                onChangeText={(v) => setForm({ ...form, credits: v })}
                placeholder="e.g. 2, 3 or 4"
                placeholderTextColor="#000000"
                keyboardType="numeric"
                style={styles.input}
              />

              {/* Student Multi-Selection Section */}
              <View style={styles.studentSectionHeader}>
                <Text style={styles.fieldLabel}>
                  Students ({selectedStudentUids.size} of {students.length} Selected)
                </Text>
                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>
                    {selectedStudentUids.size === students.length ? "Deselect All" : "Select All"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Student search filter */}
              <View style={styles.searchBox}>
                <Search size={15} color={theme.colors.textSecondary} />
                <TextInput
                  value={studentSearch}
                  onChangeText={setStudentSearch}
                  placeholder="Search students..."
                  placeholderTextColor="#000000"
                  style={styles.searchInput}
                />
                {studentSearch ? (
                  <TouchableOpacity onPress={() => setStudentSearch("")}>
                    <X size={15} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Student selector list with nested scrolling */}
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={true}
                style={styles.studentSelectList}
                contentContainerStyle={styles.studentSelectListContent}
              >
                {filteredStudents.length ? (
                  filteredStudents.map((s) => {
                    const isSelected = selectedStudentUids.has(s.uid);
                    return (
                      <TouchableOpacity
                        key={s.uid}
                        onPress={() => toggleStudent(s.uid)}
                        style={[
                          styles.studentSelectItem,
                          isSelected && styles.studentSelectItemActive,
                        ]}
                        activeOpacity={0.75}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.selectItemName} numberOfLines={1}>
                            {s.name}
                          </Text>
                          <Text style={styles.selectItemMeta}>CIC: {s.cic || "—"}</Text>
                        </View>
                        <View
                          style={[
                            styles.checkboxBox,
                            isSelected && styles.checkboxBoxActive,
                          ]}
                        >
                          {isSelected ? (
                            <Check size={14} color={theme.colors.textOnDark} />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.emptySearchText}>
                    {students.length ? "No matching students found." : "No students found in this class."}
                  </Text>
                )}
              </ScrollView>
            </ScrollView>

            {/* Save Button placed cleanly at bottom */}
            <TouchableOpacity
              onPress={saveRecord}
              style={styles.modalSaveButton}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.textOnDark} />
              ) : (
                <Save size={18} color={theme.colors.textOnDark} />
              )}
              <Text style={styles.saveButtonText}>Save CBCSS Course</Text>
            </TouchableOpacity>
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
    padding: 28,
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
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeIn: {
    backgroundColor: "#DBEAFE",
  },
  typeBadgeOff: {
    backgroundColor: "#FEF3C7",
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "MullerBold",
    letterSpacing: 0.3,
  },
  typeBadgeTextIn: {
    color: "#1D4ED8",
  },
  typeBadgeTextOff: {
    color: "#B45309",
  },
  creditsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  creditsBadgeText: {
    fontSize: 11,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  courseTitle: {
    fontSize: 16,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  insteadOfText: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: "MullerMedium",
  },
  enrolledInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  enrolledText: {
    fontSize: 11,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
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
  expandedBody: {
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
  },
  expandedTitle: {
    fontSize: 11,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  studentChipName: {
    fontSize: 11,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  studentChipCic: {
    fontSize: 10,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
  },
  emptyEnrolledText: {
    fontSize: 12,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.32)",
  },
  modalCard: {
    maxHeight: "90%",
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
    marginBottom: 8,
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
    flexShrink: 1,
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
  studentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  selectAllButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
  },
  selectAllText: {
    fontSize: 11,
    fontFamily: "MullerBold",
    color: theme.colors.primary,
  },
  searchBox: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },
  studentSelectList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    overflow: "hidden",
  },
  studentSelectListContent: {
    padding: 6,
    gap: 5,
  },
  studentSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  studentSelectItemActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primaryTint || theme.colors.primary,
  },
  selectItemName: {
    fontSize: 12,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  selectItemMeta: {
    fontSize: 10,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  emptySearchText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    paddingVertical: 16,
  },
  modalSaveButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  saveButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
});
