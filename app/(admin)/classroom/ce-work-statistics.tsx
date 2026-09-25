import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert as NativeAlert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, FileCheck2, XCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  ClassOption,
  displayDate,
  fetchClassOptions,
  findMatchingClass,
} from "@/lib/portionUtils";

export default function CEWorkStatisticsPage() {
  const { details, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [classesLoading, setClassesLoading] = useState(true);

  const [works, setWorks] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 2. Load CE works and student submissions for activeClass
  const load = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const keys = activeOption ? activeOption.queryKeys : [activeClass];

      const { data: workData, error: workError } = await supabase
        .from("ce_work_items")
        .select("*")
        .in("batch", keys)
        .order("submission_date", { ascending: false });

      if (workError) throw workError;

      const ids = (workData || []).map((work: any) => work.id);
      let studentRows: any[] = [];
      if (ids.length) {
        const { data, error } = await supabase
          .from("ce_work_students")
          .select("*")
          .in("work_id", ids)
          .eq("is_removed", false);
        if (error) throw error;
        studentRows = data || [];
      }

      setWorks(workData || []);
      setRows(studentRows);
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to load CE work statistics.");
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes]);

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
      if (r.is_submitted) totalSubmitted += 1;
      else totalPending += 1;
    });
    return {
      totalWorks: works.length,
      totalSubmitted,
      totalPending,
    };
  }, [works.length, rows]);

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
        <Text style={styles.title}>CE Work Statistics</Text>
        <Text style={styles.subtitle}>
          {activeClass ? `${activeClass} submission overview.` : "Select a class to view CE work."}
        </Text>
      </View>

      {/* Class selection tabs */}
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
                  style={[
                    styles.classChip,
                    isActive && styles.classChipActive,
                  ]}
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
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Quick summary strip if works exist */}
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

        {!works.length ? (
          <View style={styles.emptyCard}>
            <FileCheck2 size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No CE Work Found</Text>
            <Text style={styles.emptyText}>
              {activeClass
                ? `No CE work has been added by the class leader yet for ${activeClass}.`
                : "No CE work records found."}
            </Text>
          </View>
        ) : (
          works.map((work) => {
            const workRows = rowsByWork[work.id] || [];
            const submitted = workRows.filter((row) => row.is_submitted);
            const pending = workRows.filter((row) => !row.is_submitted);
            return (
              <View key={work.id} style={styles.card}>
                <Text style={styles.workTitle}>{work.work_name}</Text>
                <Text style={styles.meta}>
                  {work.subject_name} | SD {displayDate(work.started_date)} | SB{" "}
                  {displayDate(work.submission_date)}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <CheckCircle2 size={18} color={theme.colors.success} />
                    <Text style={styles.statValue}>{submitted.length}</Text>
                    <Text style={styles.statLabel}>Submitted</Text>
                  </View>
                  <View style={styles.statBox}>
                    <XCircle size={18} color={theme.colors.error} />
                    <Text style={styles.statValue}>{pending.length}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>

                <View style={styles.statusSection}>
                  <View style={styles.statusSectionHeader}>
                    <Text style={styles.listTitle}>
                      Submitted ({submitted.length})
                    </Text>
                  </View>
                  <Text style={styles.listText}>
                    {submitted.map((row) => row.student_name).join(", ") || "None"}
                  </Text>
                </View>

                <View style={[styles.statusSection, { marginTop: 10 }]}>
                  <View style={styles.statusSectionHeader}>
                    <Text style={styles.listTitle}>
                      Not Submitted ({pending.length})
                    </Text>
                  </View>
                  <Text style={styles.listText}>
                    {pending.map((row) => row.student_name).join(", ") || "None"}
                  </Text>
                </View>
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
  },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: "MullerMedium",
  },
  classTabsWrapper: {
    marginBottom: 10,
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.soft,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "MullerBold",
  },
  summaryLabel: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: "MullerMedium",
  },
  emptyCard: {
    minHeight: 160,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  emptyTitle: {
    marginTop: 12,
    color: theme.colors.text,
    fontSize: 17,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  card: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  workTitle: { color: theme.colors.text, fontSize: 17, fontFamily: "MullerBold" },
  meta: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 12 },
  statBox: {
    flex: 1,
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 20,
    fontFamily: "MullerBold",
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  statusSection: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusSectionHeader: {
    marginBottom: 4,
  },
  listTitle: { color: theme.colors.text, fontSize: 13, fontFamily: "MullerBold" },
  listText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
});
