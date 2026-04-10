import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert as NativeAlert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import {
  Search,
  ChevronsRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Sparkles,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

import { StudentCard } from "@/components/admin/manage-students/StudentCard";
import { ViewStudentModal } from "@/components/admin/manage-students/ViewStudentModal";
import { EditStudentModal } from "@/components/admin/manage-students/EditStudentModal";
import { PromoteClassModal } from "@/components/admin/manage-students/PromoteClassModal";

export default function ManageStudentsPage() {
  const {
    role: authRole,
    details: authDetails,
    loading: authLoading,
  } = useUserData();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [classToPromote, setClassToPromote] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase.from("students").select("*");

      if (authRole === "class" && authDetails?.batch) {
        query = query.eq("batch", authDetails.batch);
      }

      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw error;

      setStudents(data || []);

      if (authRole === "officer" && data && data.length > 0) {
        setExpandedClass(data[0].class_id);
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [authRole, authDetails]);

  useEffect(() => {
    if (!authLoading && authRole) fetchData();
  }, [authLoading, authRole, fetchData]);

  const handleViewClick = (student: any) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (student: any) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (student: any) => {
    NativeAlert.alert(
      "Delete Student",
      `Are you sure you want to permanently delete ${student.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.functions.invoke("admin-actions", {
              body: { action: "delete_user", uid: student.uid },
            });

            if (error) NativeAlert.alert("Error", error.message);
            else fetchData();
          },
        },
      ]
    );
  };

  const handleDeleteClassClick = (classId: string) => {
    NativeAlert.alert(
      "Delete Class",
      `Delete ALL students in ${classId}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.functions.invoke("admin-actions", {
              body: { action: "delete_class", class_id: classId },
            });

            if (error) NativeAlert.alert("Error", error.message);
            else fetchData();
          },
        },
      ]
    );
  };

  const handlePromoteClassClick = (classId: string) => {
    setClassToPromote(classId);
    setIsPromoteModalOpen(true);
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;

    return students.filter(
      (s: any) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cic?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const groupedStudents = useMemo(
    () =>
      filteredStudents.reduce((acc: Record<string, any[]>, student: any) => {
        const key = student.class_id || "Unassigned";
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
      }, {} as Record<string, any[]>),
    [filteredStudents]
  );

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading Students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTopRow}>
          <View style={styles.pageHeaderIconWrap}>
            <GraduationCap size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.pageHeaderPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.pageHeaderPillText}>Management</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Manage Students</Text>
        <Text style={styles.pageSubtitle}>View, edit, and manage profiles.</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or CIC..."
            placeholderTextColor={
              theme.colors.inputPlaceholder ?? theme.colors.textMuted
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {authRole === "officer" ? (
          Object.entries(groupedStudents)
            .sort()
            .map(([classId, studentList]: [string, any[]]) => {
              const isExpanded = expandedClass === classId;

              return (
                <View key={classId} style={styles.classCard}>
                  <TouchableOpacity
                    activeOpacity={0.84}
                    onPress={() => setExpandedClass(isExpanded ? null : classId)}
                    style={styles.classHeader}
                  >
                    <View style={styles.classHeaderLeft}>
                      <Text style={styles.classTitle} numberOfLines={1}>
                        {classId}
                      </Text>

                      <View style={styles.classCountPill}>
                        <Text style={styles.classCountText}>
                          {studentList.length}
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
                      <View style={styles.classActionRow}>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() => handlePromoteClassClick(classId)}
                          style={styles.promoteButton}
                        >
                          <ChevronsRight size={17} color={theme.colors.text} />
                          <Text style={styles.promoteButtonText}>Promote</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() => handleDeleteClassClick(classId)}
                          style={styles.deleteClassButton}
                        >
                          <Trash2 size={17} color={theme.colors.error} />
                          <Text style={styles.deleteClassButtonText}>
                            Delete Class
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.stack}>
                        {studentList.map((student: any) => (
                          <StudentCard
                            key={student.uid}
                            student={student}
                            onView={handleViewClick}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
        ) : (
          <View style={styles.stack}>
            {filteredStudents.map((student: any) => (
              <StudentCard
                key={student.uid}
                student={student}
                onView={handleViewClick}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ViewStudentModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        student={selectedStudent}
      />
      <EditStudentModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        student={selectedStudent}
        onSave={fetchData}
      />
      <PromoteClassModal
        isOpen={isPromoteModalOpen}
        setIsOpen={setIsPromoteModalOpen}
        currentClass={classToPromote}
        onSave={fetchData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  bgOrbPrimary: {
    position: "absolute",
    top: 120,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryTint,
  },
  bgOrbAccent: {
    position: "absolute",
    bottom: 110,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: theme.colors.accentTint,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  stateText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  pageHeaderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pageHeaderIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  pageHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageHeaderPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  pageSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  classCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  classHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  classTitle: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
    flexShrink: 1,
  },
  classCountPill: {
    marginLeft: 10,
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  classCountText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  classBody: {
    padding: 14,
  },
  classActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  promoteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  promoteButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  deleteClassButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    backgroundColor: theme.colors.errorSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteClassButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  stack: {
    gap: 12,
  },
});