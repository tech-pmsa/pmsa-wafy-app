import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  Search,
  AlertCircle,
  Users,
  Sun,
  UtensilsCrossed,
  MoonStar,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronDown,
  X,
  Sparkles,
  ClipboardList,
} from "lucide-react-native";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";

type ProfileRole = "officer" | "class" | "class-leader" | "staff" | string;
type AttendanceFilter =
  | "all"
  | "day_absent"
  | "noon_absent"
  | "night_absent"
  | "whole_day_absent"
  | "full_present";

interface AdminProfile {
  uid: string;
  role: ProfileRole;
  name: string | null;
  batch: string | null;
  designation: string | null;
}

interface KitchenStudent {
  id: string;
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  phone: string | null;
  guardian: string | null;
  g_phone: string | null;
  address: string | null;
  img_url: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

const FILTER_OPTIONS: { value: AttendanceFilter; label: string }[] = [
  { value: "all", label: "All Students" },
  { value: "day_absent", label: "Day Absent" },
  { value: "noon_absent", label: "Noon Absent" },
  { value: "night_absent", label: "Night Absent" },
  { value: "whole_day_absent", label: "Whole Day Absent" },
  { value: "full_present", label: "Full Present" },
];

function getTeacherClassValue(profile: AdminProfile | null): {
  key: "batch";
  value: string | null;
} {
  if (!profile) return { key: "batch", value: null };
  if (profile.batch?.trim()) return { key: "batch", value: profile.batch.trim() };
  return { key: "batch", value: null };
}

function getStudentStatus(student: KitchenStudent) {
  const presentCount = [
    student.day_present,
    student.noon_present,
    student.night_present,
  ].filter(Boolean).length;

  if (presentCount === 3) {
    return {
      label: "Full Present",
      color: theme.colors.success,
      bg: theme.colors.successSoft,
      border: "rgba(22,163,74,0.14)",
    };
  }

  if (!student.day_present && !student.noon_present && !student.night_present) {
    return {
      label: "Full Absent",
      color: theme.colors.error,
      bg: theme.colors.errorSoft,
      border: "rgba(220,38,38,0.14)",
    };
  }

  return {
    label: "Partial",
    color: theme.colors.textSecondary,
    bg: theme.colors.surfaceSoft,
    border: theme.colors.border,
  };
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
        <Filter size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
        <Text
          style={value ? styles.pickerText : styles.pickerPlaceholder}
          numberOfLines={1}
        >
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
          <View style={styles.modalContentList}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.84}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.84}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      value === item.value && styles.pickerItemTextActive,
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

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  description: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardTextWrap}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
          <Text style={styles.statCardDesc}>{description}</Text>
        </View>
        <View style={styles.statCardIconWrap}>
          <Icon size={18} color={theme.colors.primary} />
        </View>
      </View>
    </View>
  );
}

export default function KitchenAttendancePage() {
  const { user: authUser } = useUserData();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [students, setStudents] = useState<KitchenStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [activeTab, setActiveTab] = useState<string>("");

  const [rowLoadingMap, setRowLoadingMap] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id) return;

    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("uid, role, name, batch, designation")
        .eq("uid", authUser.id)
        .single();

      if (error) throw error;
      setProfile(data as AdminProfile);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setProfileLoading(false);
    }
  }, [authUser?.id]);

  const fetchKitchenStudents = useCallback(
    async (currentProfile?: AdminProfile | null) => {
      const activeProfile = currentProfile ?? profile;
      if (!activeProfile) return;

      setLoading(true);
      try {
        let query = supabase
          .from("kitchen_students")
          .select("*")
          .order("name", { ascending: true });

        if (activeProfile.role === "class") {
          const teacherClass = getTeacherClassValue(activeProfile);
          if (teacherClass.value) query = query.eq(teacherClass.key, teacherClass.value);
        }

        const { data, error } = await query;
        if (error) throw error;

        setStudents((data || []) as KitchenStudent[]);
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setLoading(false);
      }
    },
    [profile]
  );

  useEffect(() => {
    if (authUser?.id) fetchProfile();
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) fetchKitchenStudents(profile);
  }, [profile, fetchKitchenStudents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.cic?.toLowerCase().includes(q) ||
        student.class_id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      switch (filter) {
        case "day_absent":
          return !student.day_present;
        case "noon_absent":
          return !student.noon_present;
        case "night_absent":
          return !student.night_present;
        case "whole_day_absent":
          return !student.day_present && !student.noon_present && !student.night_present;
        case "full_present":
          return student.day_present && student.noon_present && student.night_present;
        default:
          return true;
      }
    });
  }, [students, searchQuery, filter]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce<Record<string, KitchenStudent[]>>((acc, student) => {
      const key = student.class_id || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const classKeys = useMemo(() => Object.keys(groupedStudents).sort(), [groupedStudents]);

  useEffect(() => {
    if (profile?.role === "officer" && classKeys.length > 0 && !classKeys.includes(activeTab)) {
      setActiveTab(classKeys[0]);
    }
  }, [classKeys, profile?.role, activeTab]);

  const summary = useMemo(() => {
    const base = filteredStudents.length ? filteredStudents : students;

    return {
      total: base.length,
      dayAbsent: base.filter((s) => !s.day_present).length,
      noonAbsent: base.filter((s) => !s.noon_present).length,
      nightAbsent: base.filter((s) => !s.night_present).length,
      fullAbsent: base.filter((s) => !s.day_present && !s.noon_present && !s.night_present)
        .length,
    };
  }, [filteredStudents, students]);

  const handleToggleMeal = async (
    student: KitchenStudent,
    meal: "day_present" | "noon_present" | "night_present"
  ) => {
    setRowLoadingMap((prev) => ({ ...prev, [student.student_uid]: true }));
    const nextValue = !student[meal];

    try {
      const { error } = await supabase
        .from("kitchen_students")
        .update({ [meal]: nextValue })
        .eq("student_uid", student.student_uid);

      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) =>
          s.student_uid === student.student_uid ? { ...s, [meal]: nextValue } : s
        )
      );
    } catch (err: any) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setRowLoadingMap((prev) => ({ ...prev, [student.student_uid]: false }));
    }
  };

  const handleSetWholeDay = async (student: KitchenStudent, present: boolean) => {
    setRowLoadingMap((prev) => ({ ...prev, [student.student_uid]: true }));

    try {
      const { error } = await supabase.rpc("set_student_whole_day_attendance", {
        p_student_uid: student.student_uid,
        p_present: present,
      });

      if (error) throw error;

      setStudents((prev) =>
        prev.map((s) =>
          s.student_uid === student.student_uid
            ? {
                ...s,
                day_present: present,
                noon_present: present,
                night_present: present,
              }
            : s
        )
      );
    } catch (err: any) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setRowLoadingMap((prev) => ({ ...prev, [student.student_uid]: false }));
    }
  };

const getBulkTargetStudents = () => {
  if (profile?.role === "officer") {
    return students;
  }

  if (profile?.role === "class") {
    const teacherBatch = getTeacherClassValue(profile).value;
    return students.filter((s) => s.batch === teacherBatch);
  }

  return [];
};

const getBulkTargetIds = () => {
  return getBulkTargetStudents()
    .map((s) => s.student_uid)
    .filter(Boolean);
};

const getBulkScopeLabel = () => {
  if (profile?.role === "officer") return "all students in the college";

  if (profile?.role === "class") {
    const teacherBatch = getTeacherClassValue(profile).value;
    return teacherBatch ? `all students in ${teacherBatch}` : "your batch students";
  }

  return "selected students";
};

const handleBulkMealUpdate = async (
  meal: "day" | "noon" | "night",
  present: boolean
) => {
  const scopeLabel = getBulkScopeLabel();

  Alert.alert(
    "Bulk Update",
    `Mark ${meal} as ${present ? "Present" : "Absent"} for ${scopeLabel}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: present ? "default" : "destructive",
        onPress: async () => {
          setBulkLoading(true);

          try {
            const targetIds = getBulkTargetIds();

            if (targetIds.length === 0) {
              throw new Error("No students found for bulk update.");
            }

            const updatePayload =
              meal === "day"
                ? { day_present: present }
                : meal === "noon"
                ? { noon_present: present }
                : { night_present: present };

            const { error } = await supabase
              .from("kitchen_students")
              .update(updatePayload)
              .in("student_uid", targetIds);

            if (error) throw error;

            setStudents((prev) =>
              prev.map((s) =>
                targetIds.includes(s.student_uid)
                  ? {
                      ...s,
                      ...(meal === "day" ? { day_present: present } : {}),
                      ...(meal === "noon" ? { noon_present: present } : {}),
                      ...(meal === "night" ? { night_present: present } : {}),
                    }
                  : s
              )
            );
          } catch (err: any) {
            Alert.alert(
              "Bulk Failed",
              err.message || "Could not update attendance."
            );
          } finally {
            setBulkLoading(false);
          }
        },
      },
    ]
  );
};

const handleBulkWholeDayUpdate = async (present: boolean) => {
  const scopeLabel = getBulkScopeLabel();

  Alert.alert(
    "Bulk Update",
    `Mark ${scopeLabel} as Full ${present ? "Present" : "Absent"}?`,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        style: present ? "default" : "destructive",
        onPress: async () => {
          setBulkLoading(true);

          try {
            const targetIds = getBulkTargetIds();

            if (targetIds.length === 0) {
              throw new Error("No students found for bulk update.");
            }

            const { error } = await supabase
              .from("kitchen_students")
              .update({
                day_present: present,
                noon_present: present,
                night_present: present,
              })
              .in("student_uid", targetIds);

            if (error) throw error;

            setStudents((prev) =>
              prev.map((s) =>
                targetIds.includes(s.student_uid)
                  ? {
                      ...s,
                      day_present: present,
                      noon_present: present,
                      night_present: present,
                    }
                  : s
              )
            );
          } catch (err: any) {
            Alert.alert(
              "Bulk Failed",
              err.message || "Could not update attendance."
            );
          } finally {
            setBulkLoading(false);
          }
        },
      },
    ]
  );
};

  const renderClassSection = (classId: string, classStudents: KitchenStudent[]) => {
    const classSummary = {
      total: classStudents.length,
      dayAbsent: classStudents.filter((s) => !s.day_present).length,
      noonAbsent: classStudents.filter((s) => !s.noon_present).length,
      nightAbsent: classStudents.filter((s) => !s.night_present).length,
      fullAbsent: classStudents.filter(
        (s) => !s.day_present && !s.noon_present && !s.night_present
      ).length,
    };

    return (
      <View style={styles.classSection}>
        <View style={styles.classHeaderCard}>
          <Text style={styles.classTitle}>{classId}</Text>
          <Text style={styles.classSubtitle}>
            {classSummary.total} students • Day Absent: {classSummary.dayAbsent} • Noon
            Absent: {classSummary.noonAbsent} • Night Absent: {classSummary.nightAbsent}
          </Text>

          <View style={styles.bulkRow}>
            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkWholeDayUpdate(true)}
              style={[styles.bulkBtn, styles.bulkBtnGreen]}
              activeOpacity={0.84}
            >
              <CheckCircle2 size={16} color={theme.colors.success} />
              <Text style={[styles.bulkBtnText, { color: theme.colors.success }]}>
                All Present
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkWholeDayUpdate(false)}
              style={[styles.bulkBtn, styles.bulkBtnRed]}
              activeOpacity={0.84}
            >
              <XCircle size={16} color={theme.colors.error} />
              <Text style={[styles.bulkBtnText, { color: theme.colors.error }]}>
                All Absent
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bulkMealGrid}>
            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkMealUpdate("day", true)}
              style={styles.bulkMealBtnOutline}
              activeOpacity={0.84}
            >
              <Sun size={14} color={theme.colors.textSecondary} />
              <Text style={styles.bulkMealBtnText}>BreakFast P</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkMealUpdate("day", false)}
              style={styles.bulkMealBtnDanger}
              activeOpacity={0.84}
            >
              <Sun size={14} color={theme.colors.error} />
              <Text style={styles.bulkMealBtnDangerText}>BreakFast A</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkMealUpdate("noon", true)}
              style={styles.bulkMealBtnOutline}
              activeOpacity={0.84}
            >
              <UtensilsCrossed size={14} color={theme.colors.textSecondary} />
              <Text style={styles.bulkMealBtnText}>Lunch P</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkMealUpdate("noon", false)}
              style={styles.bulkMealBtnDanger}
              activeOpacity={0.84}
            >
              <UtensilsCrossed size={14} color={theme.colors.error} />
              <Text style={styles.bulkMealBtnDangerText}>Lunch A</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkMealUpdate("night", true)}
              style={styles.bulkMealBtnOutline}
              activeOpacity={0.84}
            >
              <MoonStar size={14} color={theme.colors.textSecondary} />
              <Text style={styles.bulkMealBtnText}>Dinner P</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={bulkLoading}
              onPress={() => handleBulkMealUpdate("night", false)}
              style={styles.bulkMealBtnDanger}
              activeOpacity={0.84}
            >
              <MoonStar size={14} color={theme.colors.error} />
              <Text style={styles.bulkMealBtnDangerText}>Dinner A</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.studentGrid}>
          {classStudents.map((student) => {
            const status = getStudentStatus(student);
            const isLoading = !!rowLoadingMap[student.student_uid];

            return (
              <View key={student.student_uid} style={styles.studentCard}>
                <View style={styles.studentCardHeader}>
                  <View style={styles.studentCardTextWrap}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.name}
                    </Text>
                    <Text style={styles.studentDesc}>
                      {student.cic || "No CIC"} • {student.class_id}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: status.bg,
                        borderColor: status.border,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.mealToggleRow}>
                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => handleToggleMeal(student, "day_present")}
                    style={[
                      styles.mealToggle,
                      student.day_present ? styles.mealToggleActive : styles.mealToggleInactive,
                    ]}
                    activeOpacity={0.84}
                  >
                    <Sun
                      size={14}
                      color={student.day_present ? theme.colors.textOnDark : theme.colors.error}
                    />
                    <Text
                      style={
                        student.day_present
                          ? styles.mealToggleTextActive
                          : styles.mealToggleTextInactive
                      }
                    >
                      BreakFast {student.day_present ? "P" : "A"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => handleToggleMeal(student, "noon_present")}
                    style={[
                      styles.mealToggle,
                      student.noon_present
                        ? styles.mealToggleActive
                        : styles.mealToggleInactive,
                    ]}
                    activeOpacity={0.84}
                  >
                    <UtensilsCrossed
                      size={14}
                      color={
                        student.noon_present ? theme.colors.textOnDark : theme.colors.error
                      }
                    />
                    <Text
                      style={
                        student.noon_present
                          ? styles.mealToggleTextActive
                          : styles.mealToggleTextInactive
                      }
                    >
                      Lunch {student.noon_present ? "P" : "A"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => handleToggleMeal(student, "night_present")}
                    style={[
                      styles.mealToggle,
                      student.night_present
                        ? styles.mealToggleActive
                        : styles.mealToggleInactive,
                    ]}
                    activeOpacity={0.84}
                  >
                    <MoonStar
                      size={14}
                      color={
                        student.night_present ? theme.colors.textOnDark : theme.colors.error
                      }
                    />
                    <Text
                      style={
                        student.night_present
                          ? styles.mealToggleTextActive
                          : styles.mealToggleTextInactive
                      }
                    >
                      Dinner {student.night_present ? "P" : "A"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fullDayRow}>
                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => handleSetWholeDay(student, true)}
                    style={[styles.fullDayBtn, styles.bulkBtnGreen]}
                    activeOpacity={0.84}
                  >
                    <CheckCircle2 size={16} color={theme.colors.success} />
                    <Text style={[styles.fullDayBtnText, { color: theme.colors.success }]}>
                      Full Present
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isLoading}
                    onPress={() => handleSetWholeDay(student, false)}
                    style={[styles.fullDayBtn, styles.bulkBtnRed]}
                    activeOpacity={0.84}
                  >
                    <XCircle size={16} color={theme.colors.error} />
                    <Text style={[styles.fullDayBtnText, { color: theme.colors.error }]}>
                      Full Absent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
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

  if (profileLoading || (loading && students.length === 0)) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Kitchen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const teacherClassValue = getTeacherClassValue(profile);

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

              <TouchableOpacity
                onPress={() => fetchKitchenStudents()}
                style={styles.refreshBtn}
                activeOpacity={0.84}
              >
                <RefreshCcw size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroPill}>
              <Sparkles size={13} color={theme.colors.accent} />
              <Text style={styles.heroPillText}>Kitchen Monitoring</Text>
            </View>

            <Text style={styles.heroTitle}>Kitchen Attendance</Text>
            <Text style={styles.heroSubtitle}>
              {profile?.role === "class"
                ? `Manage attendance for ${teacherClassValue.value || "your class"}.`
                : "Manage kitchen attendance for all classes."}
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <View style={styles.searchBox}>
              <Search size={18} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name, CIC, class..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.filterBox}>
              <CustomPicker
                value={filter}
                placeholder="Filter"
                options={FILTER_OPTIONS}
                onSelect={(val) => setFilter(val as AttendanceFilter)}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            <StatCard
              title="Total"
              value={summary.total}
              description="Filtered students"
              icon={Users}
            />
            <StatCard
              title="Day Absent"
              value={summary.dayAbsent}
              description="Breakfast absent"
              icon={Sun}
            />
            <StatCard
              title="Noon Absent"
              value={summary.noonAbsent}
              description="Lunch absent"
              icon={UtensilsCrossed}
            />
            <StatCard
              title="Night Absent"
              value={summary.nightAbsent}
              description="Dinner absent"
              icon={MoonStar}
            />
          </ScrollView>

          {students.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={40} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptyDesc}>
                Ensure tables exist and students are synced.
              </Text>
            </View>
          ) : profile?.role === "officer" ? (
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsScroll}
              >
                {classKeys.map((classId) => (
                  <TouchableOpacity
                    key={classId}
                    onPress={() => setActiveTab(classId)}
                    style={[styles.tabBtn, activeTab === classId && styles.tabBtnActive]}
                    activeOpacity={0.84}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        activeTab === classId && styles.tabBtnTextActive,
                      ]}
                    >
                      {classId}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {activeTab && groupedStudents[activeTab] && (
                renderClassSection(activeTab, groupedStudents[activeTab])
              )}
            </View>
          ) : (
            renderClassSection(teacherClassValue.value || "My Class", filteredStudents)
          )}
        </ScrollView>

        <FloatingScrollToggle
          direction={scrollDirection}
          onPress={handleFloatingPress}
        />
      </View>
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
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
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
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },

  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
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
  refreshBtn: {
    width: 42,
    height: 42,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    marginBottom: 12,
  },
  heroPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
    marginTop: 8,
  },

  controlsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    minHeight: 48,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    color: theme.colors.text,
  },
  filterBox: {
    width: 150,
  },

  statsScroll: {
    gap: 12,
    paddingBottom: 24,
  },
  statCard: {
    width: 156,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statCardTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  statCardTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    fontFamily: "MullerMedium",
  },
  statCardValue: {
    fontSize: 22,
    lineHeight: 28,
    color: theme.colors.text,
    fontFamily: "MullerBold",
    marginVertical: 4,
  },
  statCardDesc: {
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textMuted,
    fontFamily: "MullerMedium",
  },
  statCardIconWrap: {
    backgroundColor: theme.colors.primarySoft,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },

  emptyCard: {
    alignItems: "center",
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    marginTop: 12,
    color: theme.colors.text,
  },
  emptyDesc: {
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },

  tabsScroll: {
    gap: 8,
    paddingBottom: 16,
    marginBottom: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabBtnText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
  },
  tabBtnTextActive: {
    color: theme.colors.textOnDark,
  },

  classSection: {
    marginTop: 8,
  },
  classHeaderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  classTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  classSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },

  bulkRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  bulkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  bulkBtnGreen: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  bulkBtnRed: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  bulkBtnText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },

  bulkMealGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bulkMealBtnOutline: {
    width: "31%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  bulkMealBtnDanger: {
    width: "31%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    gap: 4,
  },
  bulkMealBtnText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
  },
  bulkMealBtnDangerText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    color: theme.colors.error,
  },

  studentGrid: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  studentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  studentCardTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    marginBottom: 2,
  },
  studentDesc: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },

  mealToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  mealToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  mealToggleActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  mealToggleInactive: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  mealToggleTextActive: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  mealToggleTextInactive: {
    color: theme.colors.error,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },

  fullDayRow: {
    flexDirection: "row",
    gap: 8,
  },
  fullDayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  fullDayBtnText: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },

  pickerBtn: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  pickerText: {
    fontFamily: "MullerMedium",
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  pickerPlaceholder: {
    fontFamily: "MullerMedium",
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
  },
  modalContentList: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    paddingBottom: 30,
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
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
  },
  pickerItemText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    color: theme.colors.text,
  },
  pickerItemTextActive: {
    fontFamily: "MullerBold",
    color: theme.colors.primary,
  },
});