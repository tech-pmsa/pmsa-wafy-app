import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock3,
  Search,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react-native";
import { useFocusEffect } from "expo-router";

type CategoryType = "Jama'ath" | "Masbook" | "Sunnath" | "Thasbeeh";
type SalahType = "fajr" | "zuhar" | "asr" | "magrib" | "isha";

interface AttendanceSession {
  id: string;
  category: CategoryType;
  salah: SalahType | null;
  attendance_date: string;
  is_completed: boolean;
  created_at: string;
}

interface Student {
  uid: string;
  name: string;
  class_id: string;
}

interface AbsenceRow {
  id?: string;
  session_id: string;
  student_uid: string;
  student_name: string;
  class_id: string;
  category: string;
  salah: string | null;
  attendance_date: string;
}

const CATEGORY_OPTIONS: { label: CategoryType; value: CategoryType }[] = [
  { label: "Jama'ath", value: "Jama'ath" },
  { label: "Masbook", value: "Masbook" },
  { label: "Sunnath", value: "Sunnath" },
  { label: "Thasbeeh", value: "Thasbeeh" },
];

const SALAH_OPTIONS: { label: SalahType; value: SalahType }[] = [
  { label: "fajr", value: "fajr" },
  { label: "zuhar", value: "zuhar" },
  { label: "asr", value: "asr" },
  { label: "magrib", value: "magrib" },
  { label: "isha", value: "isha" },
];

function formatDisplayDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function CustomPicker({
  value,
  options,
  onSelect,
  placeholder,
}: {
  value: string;
  options: { label: string; value: string }[];
  onSelect: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.84}
      >
        <Text style={value ? styles.pickerText : styles.pickerPlaceholder}>
          {selectedLabel}
        </Text>
        <ChevronDown size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeButton}
                activeOpacity={0.84}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      value === item.value && styles.modalItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function CollegeAttendancePage() {
  const { user } = useUserData();
  const scrollRef = useRef<ScrollView>(null);

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const [category, setCategory] = useState<CategoryType | "">("");
  const [salah, setSalah] = useState<SalahType | "">("");
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({});

  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: sessionsData, error: sessionsError }, { data: studentsData, error: studentsError }] =
        await Promise.all([
          supabase
            .from("clg_attendance_sessions")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("students")
            .select("uid, name, class_id")
            .order("class_id", { ascending: true })
            .order("name", { ascending: true }),
        ]);

      if (sessionsError) throw sessionsError;
      if (studentsError) throw studentsError;

      setSessions((sessionsData || []) as AttendanceSession[]);
      setStudents((studentsData || []) as Student[]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
    fetchData();
  }, [fetchData])
);

  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.class_id).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    return [{ label: "All Classes", value: "all" }, ...unique.map((cls) => ({ label: cls, value: cls }))];
  }, [students]);

  const filteredStudents = useMemo(() => {
    let data = students;

    if (selectedClass !== "all") {
      data = data.filter((s) => s.class_id === selectedClass);
    }

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.class_id.toLowerCase().includes(lower)
      );
    }

    return data;
  }, [students, selectedClass, searchQuery]);

  const requiresSalah = category === "Jama'ath" || category === "Masbook" || category === "Sunnath";

  const openAttendanceSession = useCallback(
    async (session: AttendanceSession) => {
      try {
        const { data, error } = await supabase
          .from("clg_attendance_absences")
          .select("student_uid")
          .eq("session_id", session.id);

        if (error) throw error;

        const nextAbsentMap: Record<string, boolean> = {};
        (data || []).forEach((row: any) => {
          nextAbsentMap[row.student_uid] = true;
        });

        setSelectedSession(session);
        setAbsentMap(nextAbsentMap);
        setSelectedClass("all");
        setSearchQuery("");
        setShowAttendanceModal(true);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Could not open attendance.");
      }
    },
    []
  );

  const handleCreateSession = async () => {
    if (!category) {
      Alert.alert("Required", "Please select category.");
      return;
    }

    if (requiresSalah && !salah) {
      Alert.alert("Required", "Please select salah.");
      return;
    }

    try {
      setSavingSession(true);

      const payload = {
        category,
        salah: requiresSalah ? salah : null,
        attendance_date: attendanceDate.toISOString().split("T")[0],
        is_completed: false,
        created_by: user?.id || null,
      };

      const { error } = await supabase.from("clg_attendance_sessions").insert(payload);

      if (error) throw error;

      setCategory("");
      setSalah("");
      setAttendanceDate(new Date());
      setShowCreateModal(false);
      await fetchData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create attendance.");
    } finally {
      setSavingSession(false);
    }
  };

  const toggleAbsent = (studentUid: string) => {
    setAbsentMap((prev) => ({
      ...prev,
      [studentUid]: !prev[studentUid],
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession) return;

    try {
      setSavingAttendance(true);

      const absentStudents = students.filter((student) => absentMap[student.uid]);

      const deleteResult = await supabase
        .from("clg_attendance_absences")
        .delete()
        .eq("session_id", selectedSession.id);

      if (deleteResult.error) throw deleteResult.error;

      if (absentStudents.length > 0) {
        const rows: AbsenceRow[] = absentStudents.map((student) => ({
          session_id: selectedSession.id,
          student_uid: student.uid,
          student_name: student.name,
          class_id: student.class_id,
          category: selectedSession.category,
          salah: selectedSession.salah,
          attendance_date: selectedSession.attendance_date,
        }));

        const insertResult = await supabase
          .from("clg_attendance_absences")
          .insert(rows);

        if (insertResult.error) throw insertResult.error;
      }

      const updateResult = await supabase
        .from("clg_attendance_sessions")
        .update({ is_completed: true })
        .eq("id", selectedSession.id);

      if (updateResult.error) throw updateResult.error;

      setShowAttendanceModal(false);
      setSelectedSession(null);
      await fetchData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentY = contentOffset.y;
    const visibleHeight = layoutMeasurement.height;
    const totalHeight = contentSize.height;

    const nearBottom = currentY + visibleHeight >= totalHeight - 80;
    const nearTop = currentY <= 80;

    if (nearBottom) setScrollDirection("up");
    else if (nearTop) setScrollDirection("down");
  };

  const handleFloatingPress = () => {
    if (scrollDirection === "down") {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <ClipboardList size={28} color={theme.colors.primary} />
              </View>

              <View style={styles.heroPill}>
                <Sparkles size={13} color={theme.colors.accent} />
                <Text style={styles.heroPillText}>Attendance Setup</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>College Attendance</Text>
            <Text style={styles.heroSubtitle}>
              Create attendance sessions and mark absences class-wise.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.84}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={18} color={theme.colors.textOnDark} />
            <Text style={styles.addButtonText}>Add New Attendance</Text>
          </TouchableOpacity>

          <View style={styles.stack}>
            {sessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No attendance created</Text>
                <Text style={styles.emptyText}>
                  Create the first attendance session to begin.
                </Text>
              </View>
            ) : (
              sessions.map((session) => {
                const heading = session.salah
                  ? `${session.category} • ${session.salah}`
                  : session.category;

                return (
                  <TouchableOpacity
                    key={session.id}
                    activeOpacity={0.84}
                    onPress={() => openAttendanceSession(session)}
                    style={styles.sessionCard}
                  >
                    <View style={styles.sessionCardTopRow}>
                      <View style={styles.sessionTextWrap}>
                        <Text style={styles.sessionTitle}>{heading}</Text>
                        <Text style={styles.sessionDate}>
                          {formatDisplayDate(session.attendance_date)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusIconWrap,
                          session.is_completed
                            ? styles.statusDoneWrap
                            : styles.statusPendingWrap,
                        ]}
                      >
                        {session.is_completed ? (
                          <CheckCircle2 size={20} color={theme.colors.success} />
                        ) : (
                          <Clock3 size={20} color={theme.colors.accent} />
                        )}
                      </View>
                    </View>

                    <Text style={styles.sessionStatusText}>
                      {session.is_completed ? "Completed" : "Pending"}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        <FloatingScrollToggle
          direction={scrollDirection}
          onPress={handleFloatingPress}
        />
      </View>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Attendance</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
                activeOpacity={0.84}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.label}>Category</Text>
              <CustomPicker
                value={category}
                placeholder="Select Category"
                options={CATEGORY_OPTIONS}
                onSelect={(val) => {
                  setCategory(val as CategoryType);
                  if (val === "Thasbeeh") setSalah("");
                }}
              />

              {requiresSalah ? (
                <>
                  <Text style={styles.label}>Which Salah</Text>
                  <CustomPicker
                    value={salah}
                    placeholder="Select Salah"
                    options={SALAH_OPTIONS}
                    onSelect={(val) => setSalah(val as SalahType)}
                  />
                </>
              ) : null}

              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                activeOpacity={0.84}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {attendanceDate.toLocaleDateString("en-GB")}
                </Text>
              </TouchableOpacity>

              {showDatePicker ? (
                <DateTimePicker
                  value={attendanceDate}
                  mode="date"
                  display="default"
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setAttendanceDate(selectedDate);
                  }}
                />
              ) : null}

              <TouchableOpacity
                style={styles.saveButton}
                activeOpacity={0.84}
                onPress={handleCreateSession}
                disabled={savingSession}
              >
                {savingSession ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnDark} />
                ) : (
                  <Text style={styles.saveButtonText}>Create Attendance</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAttendanceModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAttendanceModal(false)}
      >
        <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
          <View style={styles.fullScreenWrap}>
            <View style={styles.fullScreenHeader}>
              <View style={styles.fullScreenHeaderTextWrap}>
                <Text style={styles.fullScreenTitle}>
                  {selectedSession
                    ? selectedSession.salah
                      ? `${selectedSession.category} • ${selectedSession.salah}`
                      : selectedSession.category
                    : "Attendance"}
                </Text>
                <Text style={styles.fullScreenSubtitle}>
                  {selectedSession ? formatDisplayDate(selectedSession.attendance_date) : ""}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowAttendanceModal(false)}
                style={styles.closeButton}
                activeOpacity={0.84}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterBar}>
              <CustomPicker
                value={selectedClass}
                placeholder="Select Class"
                options={classOptions}
                onSelect={setSelectedClass}
              />
            </View>

            <View style={styles.searchWrap}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor={theme.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.uid}
              contentContainerStyle={styles.studentList}
              renderItem={({ item }) => {
                const isAbsent = !!absentMap[item.uid];

                return (
                  <View style={styles.studentCard}>
                    <View style={styles.studentTextWrap}>
                      <Text style={styles.studentName}>{item.name}</Text>
                      <Text style={styles.studentClass}>{item.class_id}</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => toggleAbsent(item.uid)}
                      style={[
                        styles.toggleButton,
                        isAbsent ? styles.toggleButtonAbsent : styles.toggleButtonPresent,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          isAbsent
                            ? styles.toggleButtonTextAbsent
                            : styles.toggleButtonTextPresent,
                        ]}
                      >
                        {isAbsent ? "Absent" : "Present"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />

            <View style={styles.bottomSaveBar}>
              <TouchableOpacity
                style={styles.saveButton}
                activeOpacity={0.84}
                onPress={handleSaveAttendance}
                disabled={savingAttendance}
              >
                {savingAttendance ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnDark} />
                ) : (
                  <Text style={styles.saveButtonText}>Submit Attendance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 90,
    gap: 16,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    ...theme.shadows.medium,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
  },
  heroPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "MullerBold",
  },
  heroSubtitle: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },

  addButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...theme.shadows.soft,
  },
  addButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },

  stack: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.soft,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },

  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.soft,
  },
  sessionCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  sessionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  sessionDate: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  statusIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statusDoneWrap: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusPendingWrap: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: "rgba(245,158,11,0.14)",
  },
  sessionStatusText: {
    marginTop: 10,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
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
  modalContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  pickerBtn: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerText: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerMedium",
    flex: 1,
  },
  pickerPlaceholder: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontFamily: "MullerMedium",
    flex: 1,
  },
  dateButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  dateButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  saveButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },

  fullScreenWrap: {
    flex: 1,
    padding: 16,
  },
  fullScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  fullScreenHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  fullScreenTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  fullScreenSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  filterBar: {
    marginBottom: 12,
  },
  searchWrap: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  studentList: {
    gap: 10,
    paddingBottom: 18,
  },
  studentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...theme.shadows.soft,
  },
  studentTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  studentName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  studentClass: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  toggleButton: {
    minWidth: 92,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  toggleButtonPresent: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  toggleButtonAbsent: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  toggleButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  toggleButtonTextPresent: {
    color: theme.colors.success,
  },
  toggleButtonTextAbsent: {
    color: theme.colors.error,
  },
  bottomSaveBar: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
  },
  modalItemText: {
    fontSize: 16,
    lineHeight: 20,
    color: theme.colors.text,
    fontFamily: "MullerMedium",
  },
  modalItemTextActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
});