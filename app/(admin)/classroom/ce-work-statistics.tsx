import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert as NativeAlert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import { displayDate } from "@/lib/portionUtils";

function batchFrom(details: any) {
  return details?.batch || details?.designation || "";
}

function classIdFrom(details: any) {
  return details?.designation?.replace(/\s+Class$/i, "") || "";
}

export default function CEWorkStatisticsPage() {
  const { details, loading: userLoading } = useUserData();
  const batch = batchFrom(details);
  const classId = classIdFrom(details);
  const [queryBatches, setQueryBatches] = useState<string[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!batch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const batchKeys = new Set<string>([batch]);
      if (classId) {
        batchKeys.add(classId);
        batchKeys.add(`${classId} Class`);
      }

      const { data: relatedStudents, error: relatedStudentsError } = await supabase
        .from("students")
        .select("class_id")
        .eq("batch", batch);

      if (relatedStudentsError) throw relatedStudentsError;

      (relatedStudents || []).forEach((student: any) => {
        if (student.class_id) {
          batchKeys.add(student.class_id);
          batchKeys.add(`${student.class_id} Class`);
        }
      });

      const keys = Array.from(batchKeys).filter(Boolean);
      setQueryBatches(keys);

      const { data: workData, error: workError } = await supabase.from("ce_work_items").select("*").in("batch", keys).order("submission_date", { ascending: false });
      if (workError) throw workError;
      const ids = (workData || []).map((work: any) => work.id);
      let studentRows: any[] = [];
      if (ids.length) {
        const { data, error } = await supabase.from("ce_work_students").select("*").in("work_id", ids).eq("is_removed", false);
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
  }, [batch, classId]);

  useEffect(() => {
    if (!userLoading) load();
  }, [userLoading, load]);

  const rowsByWork = useMemo(() => {
    const map: Record<string, any[]> = {};
    rows.forEach((row) => {
      if (!map[row.work_id]) map[row.work_id] = [];
      map[row.work_id].push(row);
    });
    return map;
  }, [rows]);

  if (userLoading || loading) return <SafeAreaView style={styles.stateScreen}><ActivityIndicator size="large" color={theme.colors.primary} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>CE Work Statistics</Text>
        <Text style={styles.subtitle}>{queryBatches.join(", ") || batch} submission overview.</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!works.length ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No CE work has been added by the class leader yet.</Text></View>
        ) : works.map((work) => {
          const workRows = rowsByWork[work.id] || [];
          const submitted = workRows.filter((row) => row.is_submitted);
          const pending = workRows.filter((row) => !row.is_submitted);
          return (
            <View key={work.id} style={styles.card}>
              <Text style={styles.workTitle}>{work.work_name}</Text>
              <Text style={styles.meta}>{work.subject_name} | SD {displayDate(work.started_date)} | SB {displayDate(work.submission_date)}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}><CheckCircle2 size={18} color={theme.colors.success} /><Text style={styles.statValue}>{submitted.length}</Text><Text style={styles.statLabel}>Submitted</Text></View>
                <View style={styles.statBox}><XCircle size={18} color={theme.colors.error} /><Text style={styles.statValue}>{pending.length}</Text><Text style={styles.statLabel}>Pending</Text></View>
              </View>
              <Text style={styles.listTitle}>Submitted</Text>
              <Text style={styles.listText}>{submitted.map((row) => row.student_name).join(", ") || "None"}</Text>
              <Text style={styles.listTitle}>Not Submitted</Text>
              <Text style={styles.listText}>{pending.map((row) => row.student_name).join(", ") || "None"}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  stateScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { color: theme.colors.text, fontSize: 28, lineHeight: 34, fontFamily: "MullerBold" },
  subtitle: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 14, fontFamily: "MullerMedium" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  emptyCard: { minHeight: 150, borderRadius: 24, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center", padding: 18, borderWidth: 1, borderColor: theme.colors.border },
  emptyText: { color: theme.colors.textSecondary, textAlign: "center", fontFamily: "MullerMedium" },
  card: { padding: 16, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
  workTitle: { color: theme.colors.text, fontSize: 17, fontFamily: "MullerBold" },
  meta: { marginTop: 5, color: theme.colors.textSecondary, fontSize: 12, fontFamily: "MullerMedium" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 12 },
  statBox: { flex: 1, minHeight: 76, borderRadius: 16, backgroundColor: theme.colors.surfaceSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border },
  statValue: { marginTop: 4, color: theme.colors.text, fontSize: 20, fontFamily: "MullerBold" },
  statLabel: { color: theme.colors.textSecondary, fontSize: 11, fontFamily: "MullerBold", textTransform: "uppercase" },
  listTitle: { marginTop: 8, color: theme.colors.text, fontSize: 13, fontFamily: "MullerBold" },
  listText: { marginTop: 4, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: "MullerMedium" },
});
