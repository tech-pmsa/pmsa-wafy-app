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
import { ChevronDown, ChevronUp, Download, FileText } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  ClassOption,
  Semester,
  buildWorkingWeeks,
  displayDate,
  fetchClassOptions,
  findMatchingClass,
  getAcademicYearBase,
  getPortionStatus,
  n,
  statusLabel,
} from "@/lib/portionUtils";

type Subject = {
  id: string;
  subject_name: string;
  teacher_name: string;
  total_pages: number;
  total_period: number;
  period_per_week: number;
  pages_per_week: number;
  semester: Semester;
};

function StatusBadge({ status }: { status: string }) {
  return (
    <View
      style={[
        styles.badge,
        status === "back"
          ? styles.badgeBack
          : status === "ahead"
          ? styles.badgeAhead
          : styles.badgeSame,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          status === "back"
            ? styles.textBack
            : status === "ahead"
            ? styles.textAhead
            : styles.textSame,
        ]}
      >
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export default function PortionsStatisticsPage() {
  const { details, loading: userLoading } = useUserData();

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [classesLoading, setClassesLoading] = useState(true);

  const [semester, setSemester] = useState<Semester>("SEM-1");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const academicYear = getAcademicYearBase();

  // 1. Fetch available classes and set initial activeClass
  useEffect(() => {
    let isMounted = true;
    async function initClasses() {
      if (userLoading) return;
      setClassesLoading(true);
      try {
        const classList = await fetchClassOptions("portion_subjects");
        if (!isMounted) return;
        setClasses(classList);

        const defaultClass = findMatchingClass(
          classList,
          details?.batch,
          details?.designation
        );
        setActiveClass(defaultClass);
      } catch (err: any) {
        console.error("Failed to load classes:", err);
      } finally {
        if (isMounted) setClassesLoading(false);
      }
    }

    initClasses();
    return () => {
      isMounted = false;
    };
  }, [userLoading, details?.batch, details?.designation]);

  // 2. Load portion statistics for currently active class
  const loadData = useCallback(async () => {
    if (!activeClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const activeOption = classes.find((c) => c.id === activeClass);
      const keys = activeOption ? activeOption.queryKeys : [activeClass];

      const [excludedRes, subjectsRes] = await Promise.all([
        supabase
          .from("portion_calendar_exclusions")
          .select("*")
          .eq("semester", semester),
        supabase
          .from("portion_subjects")
          .select("*")
          .in("batch", keys)
          .eq("semester", semester)
          .order("subject_name"),
      ]);

      if (excludedRes.error) throw excludedRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      const subjectRows = (subjectsRes.data || []) as Subject[];
      setSubjects(subjectRows);
      setExcluded(
        new Set((excludedRes.data || []).map((row: any) => row.excluded_date))
      );

      if (subjectRows.length) {
        const { data, error } = await supabase
          .from("portion_week_progress")
          .select("*")
          .in("subject_id", subjectRows.map((s) => s.id));
        if (error) throw error;
        setProgress(data || []);
      } else {
        setProgress([]);
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err.message || "Failed to load portion statistics.");
    } finally {
      setLoading(false);
    }
  }, [activeClass, classes, semester]);

  useEffect(() => {
    if (!classesLoading && activeClass) {
      loadData();
    }
  }, [classesLoading, activeClass, loadData]);

  const weeks = useMemo(
    () => buildWorkingWeeks(semester, excluded, academicYear),
    [semester, excluded, academicYear]
  );

  const progressMap = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    progress.forEach((row) => {
      if (!map[row.subject_id]) map[row.subject_id] = {};
      map[row.subject_id][row.week_key] = row;
    });
    return map;
  }, [progress]);

  const subjectRows = (subject: Subject) => {
    const rows: any[] = [];
    const sem = { expP: 0, actP: 0, expPg: 0, actPg: 0 };
    const monthKeys = Array.from(new Set(weeks.map((week) => week.monthKey)));
    monthKeys.forEach((monthKey) => {
      const monthWeeks = weeks.filter((week) => week.monthKey === monthKey);
      const month = monthWeeks[0]?.monthLabel || monthKey;
      const expP = monthWeeks.length * n(subject.period_per_week);
      const expPg = monthWeeks.length * n(subject.pages_per_week);
      const actP = monthWeeks.reduce(
        (sum, week) => sum + n(progressMap[subject.id]?.[week.key]?.period_taken),
        0
      );
      const actPg = monthWeeks.reduce(
        (sum, week) => sum + n(progressMap[subject.id]?.[week.key]?.pages_taken),
        0
      );
      sem.expP += expP;
      sem.actP += actP;
      sem.expPg += expPg;
      sem.actPg += actPg;
      rows.push({ month, monthWeeks, expP, expPg, actP, actPg, sem: { ...sem } });
    });
    return rows;
  };

  const exportPdf = async () => {
    if (!subjects.length) return NativeAlert.alert("No Data", "No subjects to export.");
    setExporting(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const width = 595.28;
      const height = 841.89;

      subjects.forEach((subject) => {
        const page = pdfDoc.addPage([width, height]);
        let y = height - 42;
        page.drawText(`${semester} Portion Report - ${subject.subject_name}`, {
          x: 36,
          y,
          size: 16,
          font: bold,
          color: rgb(0.08, 0.12, 0.2),
        });
        y -= 24;
        page.drawText(
          `Class: ${activeClass} | Teacher: ${subject.teacher_name} | TPgS: ${subject.total_pages} | TLP/W: ${subject.period_per_week} | TPg/W: ${Number(subject.pages_per_week).toFixed(2)}`,
          { x: 36, y, size: 9, font }
        );
        y -= 24;
        subjectRows(subject).forEach((row) => {
          if (y < 80) return;
          const pageStatus = getPortionStatus(row.actPg, row.expPg);
          page.drawText(`${row.month}`, { x: 36, y, size: 11, font: bold });
          page.drawText(
            `Weeks: ${row.monthWeeks.length} | Period M ${row.actP}/${row.expP} SEM ${row.sem.actP}/${row.sem.expP}`,
            { x: 92, y, size: 8.5, font }
          );
          page.drawText(
            `Pages M ${row.actPg}/${row.expPg.toFixed(1)} SEM ${row.sem.actPg}/${row.sem.expPg.toFixed(1)} | ${statusLabel(pageStatus)}`,
            { x: 300, y, size: 8.5, font }
          );
          y -= 18;
          row.monthWeeks.forEach((week: any) => {
            const rec = progressMap[subject.id]?.[week.key];
            page.drawText(
              `WK-${week.weekNo}: ${displayDate(week.dateFrom)}-${displayDate(week.dateTo)} P.STS ${n(rec?.period_taken)} Pg.STS ${n(rec?.pages_taken)}`,
              { x: 54, y, size: 8, font }
            );
            y -= 13;
          });
          y -= 6;
        });
      });

      const bytes = await pdfDoc.save();
      const safeClassName = (activeClass || "Portions").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileUri = `${FileSystem.cacheDirectory}Portions_${safeClassName}_${semester}.pdf`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        Buffer.from(bytes).toString("base64"),
        { encoding: FileSystem.EncodingType.Base64 }
      );
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Export Portions PDF",
      });
    } catch (err: any) {
      NativeAlert.alert("Export Failed", err.message || "Could not export PDF.");
    } finally {
      setExporting(false);
    }
  };

  if (userLoading || classesLoading || (loading && !subjects.length)) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Portions Statistics</Text>
        <Text style={styles.subtitle}>
          {activeClass ? `${activeClass} portion overview.` : "Select a class to view portion statistics."}
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

      <View style={styles.topControls}>
        {(["SEM-1", "SEM-2"] as Semester[]).map((sem) => (
          <TouchableOpacity
            key={sem}
            onPress={() => setSemester(sem)}
            style={[
              styles.semButton,
              semester === sem && styles.semButtonActive,
            ]}
          >
            <Text
              style={[
                styles.semText,
                semester === sem && styles.semTextActive,
              ]}
            >
              {sem}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={exportPdf}
          style={styles.exportButton}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color={theme.colors.textOnDark} />
          ) : (
            <Download size={16} color={theme.colors.textOnDark} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!subjects.length ? (
          <View style={styles.emptyCard}>
            <FileText size={34} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {activeClass
                ? `No subject updates found for ${activeClass} in ${semester}.`
                : "No subjects found."}
            </Text>
          </View>
        ) : (
          subjects.map((subject) => {
            const isOpen = expandedId === subject.id;
            return (
              <View key={subject.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() => setExpandedId(isOpen ? null : subject.id)}
                  style={styles.cardHeader}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectTitle}>{subject.subject_name}</Text>
                    <Text style={styles.subjectMeta}>
                      TR {subject.teacher_name} | TPgS {subject.total_pages} | TPg/W{" "}
                      {Number(subject.pages_per_week).toFixed(2)}
                    </Text>
                  </View>
                  {isOpen ? (
                    <ChevronUp size={20} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.cardBody}>
                    {subjectRows(subject).map((row) => {
                      const pageStatus = getPortionStatus(row.actPg, row.expPg);
                      return (
                        <View key={row.month} style={styles.monthRow}>
                          <View style={styles.monthTop}>
                            <Text style={styles.monthTitle}>{row.month}</Text>
                            <StatusBadge status={pageStatus} />
                          </View>
                          <Text style={styles.line}>
                            Month Period TL/STS: {row.expP}/{row.actP} | Page TL/STS:{" "}
                            {row.expPg.toFixed(2)}/{row.actPg}
                          </Text>
                          <Text style={styles.line}>
                            Sem Period TL/STS: {row.sem.expP}/{row.sem.actP} | Sem Page TL/STS:{" "}
                            {row.sem.expPg.toFixed(2)}/{row.sem.actPg}
                          </Text>
                          {row.monthWeeks.map((week: any) => {
                            const rec = progressMap[subject.id]?.[week.key];
                            return (
                              <Text key={week.key} style={styles.weekLine}>
                                WK-{week.weekNo}: P.STS {n(rec?.period_taken)} | Pg.STS{" "}
                                {n(rec?.pages_taken)}
                              </Text>
                            );
                          })}
                        </View>
                      );
                    })}
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
  topControls: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  semButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  semButtonActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primaryTint,
  },
  semText: { color: theme.colors.textSecondary, fontFamily: "MullerBold" },
  semTextActive: { color: theme.colors.primary },
  exportButton: {
    width: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  emptyCard: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: "MullerMedium",
    textAlign: "center",
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
    gap: 10,
  },
  subjectTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerBold",
  },
  subjectMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },
  cardBody: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 10,
  },
  monthRow: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  monthTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  line: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "MullerMedium",
    marginBottom: 3,
  },
  weekLine: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeBack: { backgroundColor: theme.colors.errorSoft },
  badgeSame: {
    backgroundColor: theme.colors.warningSoft ?? "rgba(245,158,11,0.12)",
  },
  badgeAhead: { backgroundColor: theme.colors.successSoft },
  badgeText: {
    fontSize: 10,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  textBack: { color: theme.colors.error },
  textSame: { color: theme.colors.warning },
  textAhead: { color: theme.colors.success },
});
