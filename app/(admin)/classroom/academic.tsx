import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert as NativeAlert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react-native";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  AcademicRecord,
  ClassOption,
  fetchNonFoundationClasses,
  isFoundationClass,
} from "@/lib/academicUtils";
import { AcademicCard } from "@/components/academic/AcademicCard";

type StudentWithRecords = {
  uid: string;
  name: string;
  cic: string | null;
  class_id: string | null;
  batch: string | null;
  records: AcademicRecord[];
};

export default function ClassroomAcademicPage() {
  const { role, details, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [classesLoading, setClassesLoading] = useState(true);

  const [students, setStudents] = useState<StudentWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [expandedStudentUid, setExpandedStudentUid] = useState<string | null>(null);

  const isClassTeacher = role === "class";

  // 1. Fetch available non-foundation classes and set initial activeClass
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchNonFoundationClasses();
        if (!isMounted) return;
        setClasses(classList);

        if (isClassTeacher) {
          // Identify class teacher's class
          const teacherBatch = details?.batch || "";
          const teacherDesig = (details?.designation || "").replace(/\s+Class$/i, "");
          const matched = classList.find(
            (c) =>
              c.id === teacherBatch ||
              c.id === teacherDesig ||
              c.queryKeys.includes(teacherBatch) ||
              c.queryKeys.includes(teacherDesig)
          );
          setActiveClass(matched?.id || teacherBatch || teacherDesig || classList[0]?.id || "");
        } else {
          // Staff / Officer
          setActiveClass((prev) => prev || classList[0]?.id || "");
        }
      } catch (err: any) {
        console.error("Failed to load non-foundation classes:", err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, isClassTeacher, details?.batch, details?.designation]);

  // 2. Load students and their academic records for activeClass
  const loadClassData = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const baseKeys = activeOption ? activeOption.queryKeys : [activeClass];
      const expandedKeys = new Set<string>();
      baseKeys.forEach((k) => {
        if (!k || isFoundationClass(k)) return;
        expandedKeys.add(k);
        expandedKeys.add(`${k} Class`);
        expandedKeys.add(k.replace(/\s+Class$/i, ""));
      });
      const keys = Array.from(expandedKeys).filter(Boolean);

      // Fetch students of this class
      const [byBatchRes, byClassRes] = await Promise.all([
        supabase
          .from("students")
          .select("uid, name, cic, class_id, batch")
          .in("batch", keys)
          .order("name"),
        supabase
          .from("students")
          .select("uid, name, cic, class_id, batch")
          .in("class_id", keys)
          .order("name"),
      ]);

      const studentMap = new Map<string, StudentWithRecords>();
      [...(byBatchRes.data || []), ...(byClassRes.data || [])].forEach((s: any) => {
        if (s?.uid && !isFoundationClass(s.class_id) && !isFoundationClass(s.batch)) {
          studentMap.set(s.uid, {
            uid: s.uid,
            name: s.name,
            cic: s.cic,
            class_id: s.class_id,
            batch: s.batch,
            records: [],
          });
        }
      });

      const studentList = Array.from(studentMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Fetch academic records for all students in this class
      if (studentList.length > 0) {
        const studentUids = studentList.map((s) => s.uid);
        const { data: recordsData, error: recordsError } = await supabase
          .from("student_academics")
          .select("*")
          .in("student_uid", studentUids)
          .order("created_at", { ascending: false });

        if (recordsError) throw recordsError;

        const recordsByUid = new Map<string, AcademicRecord[]>();
        (recordsData || []).forEach((rec: any) => {
          if (!recordsByUid.has(rec.student_uid)) {
            recordsByUid.set(rec.student_uid, []);
          }
          recordsByUid.get(rec.student_uid)!.push(rec as AcademicRecord);
        });

        studentList.forEach((st) => {
          st.records = recordsByUid.get(st.uid) || [];
        });
      }

      setStudents(studentList);
      if (studentList.length > 0 && !expandedStudentUid) {
        setExpandedStudentUid(studentList[0].uid);
      }
    } catch (err: any) {
      console.error("Failed to load class academics:", err);
      NativeAlert.alert("Error", err.message || "Failed to load academic records.");
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, expandedStudentUid]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      loadClassData();
    }
  }, [classesLoading, activeClass, loadClassData]);

  // Filter students based on search query and academic type filter
  const filteredStudents = useMemo(() => {
    let result = students;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.cic && s.cic.toLowerCase().includes(q))
      );
    }

    if (selectedTypeFilter !== "all") {
      result = result.filter((s) =>
        s.records.some((r) => r.academic_type === selectedTypeFilter)
      );
    }

    return result;
  }, [students, searchQuery, selectedTypeFilter]);

  if (userLoading || classesLoading || (loading && !students.length)) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Academic Overview</Text>
          <Text style={styles.subtitle}>
            {isClassTeacher
              ? `Academic history of students in ${activeClass || "your class"}.`
              : "View student academic records (+1, +2, Degree, Diploma)."}
          </Text>
        </View>
      </View>

      {/* Class Selection Tabs for Staff & Officer */}
      {!isClassTeacher && classes.length > 0 && (
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
                  onPress={() => {
                    setActiveClass(cls.id);
                    setExpandedStudentUid(null);
                  }}
                  activeOpacity={0.84}
                  style={[styles.classChip, isActive && styles.classChipActive]}
                >
                  <Text
                    style={[
                      styles.classChipText,
                      isActive && styles.classChipTextActive,
                    ]}
                  >
                    {cls.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search and Academic Type Filter Row */}
      <View style={styles.filtersSection}>
        <View style={styles.searchBarWrap}>
          <Search size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name or CIC..."
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Academic Level Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.levelChipsRow}
        >
          {[
            { key: "all", label: "All Levels" },
            { key: "+1", label: "+1" },
            { key: "+2", label: "+2" },
            { key: "degree", label: "Degree" },
            { key: "diploma", label: "Diploma" },
          ].map((item) => {
            const isActive = selectedTypeFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSelectedTypeFilter(item.key)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Students and Records List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileText size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeClass
                ? `No students found matching your filters in ${activeClass}.`
                : "Select a class to view student academic records."}
            </Text>
          </View>
        ) : (
          filteredStudents.map((st) => {
            const isExpanded = expandedStudentUid === st.uid;
            const recordsToDisplay =
              selectedTypeFilter === "all"
                ? st.records
                : st.records.filter((r) => r.academic_type === selectedTypeFilter);

            return (
              <View key={st.uid} style={styles.studentAccordionCard}>
                {/* Student Accordion Header */}
                <TouchableOpacity
                  onPress={() =>
                    setExpandedStudentUid(isExpanded ? null : st.uid)
                  }
                  activeOpacity={0.8}
                  style={styles.studentAccordionHeader}
                >
                  <View style={styles.studentAvatar}>
                    <User size={18} color={theme.colors.primary} />
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.studentName}>{st.name}</Text>
                    <Text style={styles.studentMeta}>
                      CIC: {st.cic || "-"} | Class: {st.class_id || st.batch || "-"}
                    </Text>
                  </View>

                  <View style={styles.recordBadgeCount}>
                    <Text style={styles.recordBadgeCountText}>
                      {st.records.length}{" "}
                      {st.records.length === 1 ? "Record" : "Records"}
                    </Text>
                  </View>

                  {isExpanded ? (
                    <ChevronUp size={20} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>

                {/* Expanded Student Records */}
                {isExpanded && (
                  <View style={styles.studentAccordionBody}>
                    {recordsToDisplay.length === 0 ? (
                      <View style={styles.studentEmptyBox}>
                        <Text style={styles.studentEmptyText}>
                          {selectedTypeFilter === "all"
                            ? "No academic records submitted for this student yet."
                            : `No ${selectedTypeFilter} records recorded.`}
                        </Text>
                      </View>
                    ) : (
                      recordsToDisplay.map((rec) => (
                        <AcademicCard
                          key={rec.id}
                          record={rec}
                          canEdit={false}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
    padding: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },

  classTabsWrapper: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    paddingVertical: 8,
  },
  classTabsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  classChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  classChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  classChipTextActive: {
    color: theme.colors.textOnDark,
    fontWeight: "700",
  },

  filtersSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: 8,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: theme.colors.text,
    padding: 0,
  },
  levelChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },

  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },

  studentAccordionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  studentAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: theme.colors.surface,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  studentMeta: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  recordBadgeCount: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  recordBadgeCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },

  studentAccordionBody: {
    padding: 14,
    paddingTop: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  studentEmptyBox: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  studentEmptyText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: "italic",
  },

  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
