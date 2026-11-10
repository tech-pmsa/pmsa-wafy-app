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
  GraduationCap,
  Plus,
  BookOpen,
  Award,
  School,
  Search,
  User,
  FileQuestion,
} from "lucide-react-native";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  AcademicRecord,
  AcademicType,
  ACADEMIC_TABS,
  isFoundationUser,
} from "@/lib/academicUtils";
import { AcademicCard } from "@/components/academic/AcademicCard";
import { AcademicFormModal } from "@/components/academic/AcademicFormModal";

type StudentOption = {
  uid: string;
  name: string;
  cic: string | null;
  class_id: string | null;
  batch: string | null;
};

export default function ClassLeaderAcademicPage() {
  const { details, loading: userLoading } = useUserData();

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<AcademicType>("+1");
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);

  const isFoundation = isFoundationUser(details);

  // 1. Fetch all students in the class leader's class/batch
  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      if (userLoading || !details) return;
      setStudentsLoading(true);
      try {
        const batchKeys = new Set<string>();
        if (details.batch) {
          batchKeys.add(details.batch);
          batchKeys.add(`${details.batch} Class`);
        }
        if (details.designation) {
          batchKeys.add(details.designation);
          batchKeys.add(details.designation.replace(/\s+Class$/i, ""));
          batchKeys.add(`${details.designation} Class`);
        }

        const keys = Array.from(batchKeys).filter(Boolean);

        const [byBatchRes, byClassRes] = await Promise.all([
          supabase
            .from("students")
            .select("uid, name, cic, class_id, batch")
            .in("batch", keys.length ? keys : [details.batch || ""])
            .order("name"),
          supabase
            .from("students")
            .select("uid, name, cic, class_id, batch")
            .in("class_id", keys.length ? keys : [details.batch || ""])
            .order("name"),
        ]);

        const studentMap = new Map<string, StudentOption>();
        [...(byBatchRes.data || []), ...(byClassRes.data || [])].forEach((s: any) => {
          if (s?.uid) {
            studentMap.set(s.uid, {
              uid: s.uid,
              name: s.name,
              cic: s.cic,
              class_id: s.class_id,
              batch: s.batch,
            });
          }
        });

        const list = Array.from(studentMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        if (!isMounted) return;
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentUid(list[0].uid);
        }
      } catch (err: any) {
        console.error("Failed to load class students:", err);
      } finally {
        if (isMounted) setStudentsLoading(false);
      }
    }

    loadStudents();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details]);

  // 2. Fetch academic records for the selected student
  const fetchRecords = useCallback(async () => {
    if (!selectedStudentUid) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_academics")
        .select("*")
        .eq("student_uid", selectedStudentUid)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords((data || []) as AcademicRecord[]);
    } catch (err: any) {
      console.error("Failed to load records for student:", err);
      NativeAlert.alert("Error", err.message || "Failed to load academic records.");
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedStudentUid]);

  useEffect(() => {
    fetchRecords();
  }, [selectedStudentUid, fetchRecords]);

  // Selected student object
  const currentStudent = students.find((s) => s.uid === selectedStudentUid) || null;

  // Filter students based on search input
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return students;
    const q = searchStudent.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.cic && s.cic.toLowerCase().includes(q))
    );
  }, [students, searchStudent]);

  // Current tab records
  const currentTabRecords = records.filter(
    (r) => r.academic_type === activeTab
  );

  const getTabCount = (type: AcademicType) =>
    records.filter((r) => r.academic_type === type).length;

  const handleDelete = async (rec: AcademicRecord) => {
    if (!rec.id) return;
    try {
      const { error } = await supabase
        .from("student_academics")
        .delete()
        .eq("id", rec.id);

      if (error) throw error;
      NativeAlert.alert("Deleted", "Academic record deleted successfully.");
      fetchRecords();
    } catch (err: any) {
      NativeAlert.alert("Delete Failed", err.message || "Could not delete record.");
    }
  };

  const openAddModal = () => {
    if (!currentStudent) {
      NativeAlert.alert("Select Student", "Please select a student first.");
      return;
    }
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AcademicRecord) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  if (userLoading || studentsLoading) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (isFoundation) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <FileQuestion size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Academic Not Applicable</Text>
        <Text style={styles.emptySubtitle}>
          Academic records are not required for Foundation classes.
        </Text>
      </SafeAreaView>
    );
  }

  const currentTabObj = ACADEMIC_TABS.find((t) => t.key === activeTab);

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Class Academic Management</Text>
          <Text style={styles.subtitle}>
            Manage +1, +2, Degree, and Diploma data for your class students.
          </Text>
        </View>

        <TouchableOpacity
          onPress={openAddModal}
          activeOpacity={0.84}
          style={styles.addBtnHeader}
          disabled={!currentStudent}
        >
          <Plus size={16} color={theme.colors.textOnDark} />
          <Text style={styles.addBtnHeaderText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Student Selector Bar */}
      <View style={styles.studentSelectorSection}>
        {/* Search Input */}
        <View style={styles.searchBarWrap}>
          <Search size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name or CIC..."
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={searchStudent}
            onChangeText={setSearchStudent}
          />
        </View>

        {/* Student Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.studentChipsRow}
        >
          {filteredStudents.map((st) => {
            const isSelected = st.uid === selectedStudentUid;
            return (
              <TouchableOpacity
                key={st.uid}
                onPress={() => setSelectedStudentUid(st.uid)}
                activeOpacity={0.8}
                style={[
                  styles.studentChip,
                  isSelected && styles.studentChipActive,
                ]}
              >
                <User
                  size={14}
                  color={
                    isSelected ? theme.colors.textOnDark : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.studentChipText,
                    isSelected && styles.studentChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {st.name}
                </Text>
                {st.cic ? (
                  <View
                    style={[
                      styles.cicPill,
                      isSelected && styles.cicPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cicPillText,
                        isSelected && styles.cicPillTextActive,
                      ]}
                    >
                      {st.cic}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Student Profile Banner */}
      {currentStudent && (
        <View style={styles.activeStudentBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerStudentName}>{currentStudent.name}</Text>
            <Text style={styles.bannerStudentMeta}>
              CIC: {currentStudent.cic || "-"} | Class:{" "}
              {currentStudent.class_id || currentStudent.batch || "-"}
            </Text>
          </View>
          <View style={styles.recordsCountBadge}>
            <Text style={styles.recordsCountText}>
              {records.length} Total Records
            </Text>
          </View>
        </View>
      )}

      {/* Main Layout: Vertical Tabs Rail + Content */}
      <View style={styles.mainLayout}>
        {/* Vertical Rail */}
        <View style={styles.verticalRail}>
          {ACADEMIC_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                style={[styles.railTab, isActive && styles.railTabActive]}
              >
                <View style={[styles.railIconWrap, isActive && styles.railIconWrapActive]}>
                  {tab.key === "degree" ? (
                    <GraduationCap
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    />
                  ) : tab.key === "diploma" ? (
                    <Award
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    />
                  ) : (
                    <School
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    />
                  )}
                </View>

                <Text
                  style={[styles.railTabText, isActive && styles.railTabTextActive]}
                  numberOfLines={1}
                >
                  {tab.key}
                </Text>

                <View
                  style={[
                    styles.railCountBadge,
                    isActive && styles.railCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.railCountText,
                      isActive && styles.railCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Tab Sub-Header */}
          <View style={styles.tabHeaderRow}>
            <View>
              <Text style={styles.tabSectionTitle}>
                {currentTabObj?.badgeLabel || activeTab}
              </Text>
              <Text style={styles.tabSectionSubtitle}>
                {currentTabRecords.length}{" "}
                {currentTabRecords.length === 1 ? "record" : "records"} for{" "}
                {currentStudent?.name || "Student"}
              </Text>
            </View>

            {currentTabRecords.length > 0 && currentStudent && (
              <TouchableOpacity
                onPress={openAddModal}
                style={styles.addSideBtn}
                activeOpacity={0.8}
              >
                <Plus size={14} color={theme.colors.primary} />
                <Text style={styles.addSideBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cards or Empty */}
          {recordsLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} />
          ) : currentTabRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <BookOpen size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No {activeTab} Records</Text>
              <Text style={styles.emptySubtitle}>
                No {activeTab} record has been added for {currentStudent?.name || "this student"} yet.
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                activeOpacity={0.84}
                style={styles.emptyAddBtn}
              >
                <Plus size={16} color={theme.colors.textOnDark} />
                <Text style={styles.emptyAddBtnText}>Add {activeTab} Record</Text>
              </TouchableOpacity>
            </View>
          ) : (
            currentTabRecords.map((record) => (
              <AcademicCard
                key={record.id}
                record={record}
                canEdit={true}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Form Modal */}
      {isModalOpen && currentStudent && (
        <AcademicFormModal
          visible={isModalOpen}
          academicType={activeTab}
          record={editingRecord}
          student={{
            uid: currentStudent.uid,
            name: currentStudent.name,
            cic: currentStudent.cic,
            class_id: currentStudent.class_id,
            batch: currentStudent.batch,
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSaved={() => {
            fetchRecords();
          }}
        />
      )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnHeaderText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textOnDark,
  },

  studentSelectorSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
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
  studentChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  studentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  studentChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  studentChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text,
  },
  studentChipTextActive: {
    color: theme.colors.textOnDark,
  },
  cicPill: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  cicPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  cicPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  cicPillTextActive: {
    color: theme.colors.textOnDark,
  },

  activeStudentBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F7FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  bannerStudentName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text,
  },
  bannerStudentMeta: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  recordsCountBadge: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recordsCountText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
  verticalRail: {
    width: 82,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    paddingVertical: 12,
    alignItems: "center",
    gap: 10,
  },
  railTab: {
    width: 68,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  railTabActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  railIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  railIconWrapActive: {
    backgroundColor: theme.colors.surface,
  },
  railTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  railTabTextActive: {
    color: theme.colors.primary,
  },
  railCountBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  railCountBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  railCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  railCountTextActive: {
    color: theme.colors.textOnDark,
  },

  contentArea: {
    flex: 1,
  },
  contentScroll: {
    padding: 14,
    paddingBottom: 30,
  },
  tabHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  tabSectionSubtitle: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  addSideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
  },
  addSideBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    marginTop: 10,
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
    paddingHorizontal: 10,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textOnDark,
  },
});
