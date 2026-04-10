import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert as NativeAlert,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import {
  Search,
  ChevronDown,
  GraduationCap,
  Sparkles,
  Layers3,
  Users,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

import { StudentCard } from "@/components/admin/manage-students/StudentCard";
import { ViewStudentModal } from "@/components/admin/manage-students/ViewStudentModal";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";

export default function StudentsDetailPage() {
  const {
    role: authRole,
    details: authDetails,
    loading: authLoading,
  } = useUserData();

  const scrollRef = useRef<ScrollView>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeClass, setActiveClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase.from("students").select("*");

      // Staff can view all by default.
      // If you later want class-restricted staff, change this condition.
      if (authRole === "class" && authDetails?.batch) {
        query = query.eq("batch", authDetails.batch);
      }

      const { data, error } = await query.order("class_id", { ascending: true }).order("name", {
        ascending: true,
      });

      if (error) throw error;

      setStudents(data || []);
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

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;

    const q = searchQuery.toLowerCase().trim();

    return students.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.cic?.toLowerCase().includes(q) ||
        s.class_id?.toLowerCase().includes(q) ||
        s.batch?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((acc: Record<string, any[]>, student: any) => {
      const key = student.class_id || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {});
  }, [filteredStudents]);

  const classKeys = useMemo(() => Object.keys(groupedStudents).sort(), [groupedStudents]);

  useEffect(() => {
    if (classKeys.length > 0 && !classKeys.includes(activeClass)) {
      setActiveClass(classKeys[0]);
    }
    if (classKeys.length === 0) {
      setActiveClass("");
    }
  }, [classKeys, activeClass]);

  const summary = useMemo(() => {
    return {
      total: students.length,
      filtered: filteredStudents.length,
      classes: classKeys.length,
    };
  }, [students.length, filteredStudents.length, classKeys.length]);

  const visibleStudents = useMemo(() => {
    if (!activeClass) return [];
    return groupedStudents[activeClass] || [];
  }, [groupedStudents, activeClass]);

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
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderTopRow}>
              <View style={styles.pageHeaderIconWrap}>
                <GraduationCap size={22} color={theme.colors.primary} />
              </View>

              <View style={styles.pageHeaderPill}>
                <Sparkles size={13} color={theme.colors.accent} />
                <Text style={styles.pageHeaderPillText}>Read Only</Text>
              </View>
            </View>

            <Text style={styles.pageTitle}>Student Details</Text>
            <Text style={styles.pageSubtitle}>
              Search, browse by class, and view full student profiles.
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Users size={18} color={theme.colors.primary} />
              <View style={styles.statTextWrap}>
                <Text style={styles.statValue}>{summary.total}</Text>
                <Text style={styles.statLabel}>Total Students</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Search size={18} color={theme.colors.primary} />
              <View style={styles.statTextWrap}>
                <Text style={styles.statValue}>{summary.filtered}</Text>
                <Text style={styles.statLabel}>Search Results</Text>
              </View>
            </View>

            <View style={styles.statCard}>
              <Layers3 size={18} color={theme.colors.primary} />
              <View style={styles.statTextWrap}>
                <Text style={styles.statValue}>{summary.classes}</Text>
                <Text style={styles.statLabel}>Classes</Text>
              </View>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchWrap}>
              <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, CIC, class..."
                placeholderTextColor={
                  theme.colors.inputPlaceholder ?? theme.colors.textMuted
                }
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {classKeys.length > 0 ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.classTabsRow}
              >
                {classKeys.map((classId) => (
                  <TouchableOpacity
                    key={classId}
                    onPress={() => setActiveClass(classId)}
                    activeOpacity={0.84}
                    style={[
                      styles.classChip,
                      activeClass === classId && styles.classChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.classChipText,
                        activeClass === classId && styles.classChipTextActive,
                      ]}
                    >
                      {classId}
                    </Text>
                    <View
                      style={[
                        styles.classCountPill,
                        activeClass === classId && styles.classCountPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.classCountText,
                          activeClass === classId && styles.classCountTextActive,
                        ]}
                      >
                        {groupedStudents[classId]?.length || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.activeClassCard}>
                <View style={styles.activeClassHeader}>
                  <View style={styles.activeClassHeaderLeft}>
                    <Text style={styles.activeClassTitle}>{activeClass}</Text>
                    <Text style={styles.activeClassSubtitle}>
                      {visibleStudents.length} student
                      {visibleStudents.length === 1 ? "" : "s"} found
                    </Text>
                  </View>

                  <View style={styles.activeClassBadge}>
                    <ChevronDown size={16} color={theme.colors.primary} />
                  </View>
                </View>

                <View style={styles.stack}>
                  {visibleStudents.map((student: any) => (
                    <StudentCard
                      key={student.uid}
                      student={student}
                      onView={handleViewClick}
                      readOnly
                    />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <GraduationCap size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Students Found</Text>
              <Text style={styles.emptyDesc}>
                Try a different search or check whether student data is available.
              </Text>
            </View>
          )}
        </ScrollView>

        <FloatingScrollToggle
          direction={scrollDirection}
          onPress={handleFloatingPress}
        />
      </View>

      <ViewStudentModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        student={selectedStudent}
      />
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
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
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
    borderRadius: 24,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },

  pageHeader: {
    marginBottom: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
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

  statsRow: {
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.soft,
  },
  statTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  statLabel: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },

  searchContainer: {
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

  classTabsRow: {
    gap: 8,
    paddingBottom: 14,
  },
  classChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  classChipTextActive: {
    color: theme.colors.textOnDark,
  },
  classCountPill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  classCountPillActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  classCountText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
  },
  classCountTextActive: {
    color: theme.colors.textOnDark,
  },

  activeClassCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.medium,
  },
  activeClassHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  activeClassHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  activeClassTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  activeClassSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  activeClassBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },

  stack: {
    gap: 12,
  },

  emptyCard: {
    marginTop: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.medium,
  },
  emptyTitle: {
    marginTop: 12,
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  emptyDesc: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
});