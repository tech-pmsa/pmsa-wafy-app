import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  FileText,
  Trash2,
  RefreshCcw,
  ClipboardList,
  CheckCircle2,
  Clock3,
  XCircle,
  Sparkles,
  Download,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "buffer";

type PunishmentStatus = "pending" | "completed" | "rejected";
type LogsFilter = "all" | PunishmentStatus;

interface SessionInfo {
  id: string;
  category: string;
  salah: string | null;
  attendance_date: string;
  created_at: string;
}

interface PunishmentRow {
  id: string;
  student_uid: string;
  student_name: string;
  class_id: string;
  source_absence_id: string | null;
  category: string;
  salah: string | null;
  attendance_date: string;
  punishment_text: string | null;
  status: PunishmentStatus;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
  session?: SessionInfo | null;
}

function formatDisplayDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(text: string, maxLength: number) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneMap = {
    primary: {
      bg: theme.colors.primarySoft,
      icon: theme.colors.primary,
      border: theme.colors.primaryTint,
    },
    success: {
      bg: theme.colors.successSoft,
      icon: theme.colors.success,
      border: "rgba(22,163,74,0.14)",
    },
    warning: {
      bg: theme.colors.accentSoft,
      icon: theme.colors.accent,
      border: "rgba(245,158,11,0.14)",
    },
    danger: {
      bg: theme.colors.errorSoft,
      icon: theme.colors.error,
      border: "rgba(220,38,38,0.14)",
    },
  } as const;

  const current = toneMap[tone];

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <View
          style={[
            styles.summaryIconWrap,
            {
              backgroundColor: current.bg,
              borderColor: current.border,
            },
          ]}
        >
          <Icon size={18} color={current.icon} />
        </View>
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.filterButton, active && styles.filterButtonActive]}
    >
      <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CollegeLogsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rows, setRows] = useState<PunishmentRow[]>([]);
  const [filter, setFilter] = useState<LogsFilter>("all");

  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("clg_punishments")
        .select(`
          *,
          absence:clg_attendance_absences (
            id,
            session_id,
            session:clg_attendance_sessions (
              id,
              category,
              salah,
              attendance_date,
              created_at
            )
          )
        `)
        .order("attendance_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map((item: any) => ({
        ...item,
        session: item.absence?.session || null,
      }));

      setRows(normalized as PunishmentRow[]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load logs.");
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await fetchLogs();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchLogs();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.status === filter);
  }, [rows, filter]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      completed: rows.filter((r) => r.status === "completed").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    };
  }, [rows]);

  const exportTitle = useMemo(() => {
    switch (filter) {
      case "pending":
        return "Pending Punishment Logs";
      case "completed":
        return "Completed Punishment Logs";
      case "rejected":
        return "Rejected Punishment Logs";
      default:
        return "All Punishment Logs";
    }
  }, [filter]);

  const groupedForDisplay = useMemo(() => {
    const grouped: Record<string, PunishmentRow[]> = {};

    filteredRows.forEach((row) => {
      const sessionTitle = row.session
        ? `${row.session.category}${row.session.salah ? ` • ${row.session.salah}` : ""} • ${row.session.attendance_date}`
        : `${row.category}${row.salah ? ` • ${row.salah}` : ""} • ${row.attendance_date}`;

      if (!grouped[sessionTitle]) grouped[sessionTitle] = [];
      grouped[sessionTitle].push(row);
    });

    return grouped;
  }, [filteredRows]);

  const handleExportPdf = async () => {
    if (exporting) return;

    if (filteredRows.length === 0) {
      Alert.alert("Notice", "No log data to export.");
      return;
    }

    try {
      setExporting(true);

      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const margin = 26;
      const bottomLimit = 28;
      const contentWidth = pageWidth - margin * 2;

      const colName = 145;
      const colClass = 65;
      const colStatus = 80;
      const colReason = 110;
      const colPunishment = contentWidth - colName - colClass - colStatus - colReason;

      const pdfColors = {
        text: rgb(0.08, 0.13, 0.2),
        muted: rgb(0.38, 0.44, 0.52),
        border: rgb(0.87, 0.9, 0.94),
        borderStrong: rgb(0.81, 0.84, 0.88),
        softFill: rgb(0.965, 0.973, 0.988),
        headerFill: rgb(0.933, 0.949, 0.969),
        zebra: rgb(0.98, 0.984, 0.992),
      };

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      let pageNumber = 1;

      const drawText = (
        text: string,
        x: number,
        yPos: number,
        size = 9,
        font = fontRegular,
        color = pdfColors.text
      ) => {
        page.drawText(text, { x, y: yPos, size, font, color });
      };

      const drawRect = (
        x: number,
        yPos: number,
        width: number,
        height: number,
        fillColor?: ReturnType<typeof rgb>,
        borderColor?: ReturnType<typeof rgb>,
        borderWidth = 1
      ) => {
        page.drawRectangle({
          x,
          y: yPos,
          width,
          height,
          color: fillColor,
          borderColor,
          borderWidth,
        });
      };

      const drawPageFooter = () => {
        drawText(`Page ${pageNumber}`, pageWidth - margin - 38, 10, 8, fontRegular, pdfColors.muted);
      };

      const drawPageHeader = (isFirst = false) => {
        y = pageHeight - margin;

        if (isFirst) {
          drawText(exportTitle, margin, y, 18, fontBold, pdfColors.text);
          y -= 18;
          drawText(`Rows: ${filteredRows.length}`, margin, y, 9, fontRegular, pdfColors.muted);
          drawText(
            `Generated: ${formatDateTime(new Date().toISOString())}`,
            pageWidth - margin - 160,
            y,
            9,
            fontRegular,
            pdfColors.muted
          );
          y -= 22;
        } else {
          drawText(exportTitle, margin, y, 14, fontBold, pdfColors.text);
          y -= 18;
        }
      };

      const startNewPage = () => {
        drawPageFooter();
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pageNumber += 1;
        drawPageHeader(false);
      };

      const ensureSpace = (neededHeight: number) => {
        if (y - neededHeight < bottomLimit) {
          startNewPage();
        }
      };

      const drawSessionHeader = (title: string, date: string, count: number) => {
        const boxHeight = 28;
        ensureSpace(boxHeight + 8);

        drawRect(
          margin,
          y - boxHeight,
          contentWidth,
          boxHeight,
          pdfColors.softFill,
          pdfColors.borderStrong,
          1
        );

        drawText(title, margin + 8, y - 11, 12, fontBold, pdfColors.text);
        drawText(
          `Date: ${formatDisplayDate(date)} • Records: ${count}`,
          margin + 8,
          y - 22,
          8.5,
          fontRegular,
          pdfColors.muted
        );

        y -= boxHeight + 8;
      };

      const drawColumnHeader = () => {
        const rowHeight = 20;
        ensureSpace(rowHeight);

        drawRect(
          margin,
          y - rowHeight,
          contentWidth,
          rowHeight,
          pdfColors.headerFill,
          pdfColors.borderStrong,
          1
        );

        let x = margin;
        drawText("Student", x + 5, y - 13, 9, fontBold); x += colName;
        drawText("Class", x + 5, y - 13, 9, fontBold); x += colClass;
        drawText("Status", x + 5, y - 13, 9, fontBold); x += colStatus;
        drawText("Reject Reason", x + 5, y - 13, 9, fontBold); x += colReason;
        drawText("Punishment", x + 5, y - 13, 9, fontBold);

        y -= rowHeight;
      };

      const drawRow = (row: PunishmentRow, index: number) => {
        const rowHeight = 22;
        ensureSpace(rowHeight);

        const fill = index % 2 === 0 ? pdfColors.zebra : undefined;

        drawRect(
          margin,
          y - rowHeight,
          contentWidth,
          rowHeight,
          fill,
          pdfColors.border,
          1
        );

        let x = margin;
        drawText(truncateText(row.student_name, 25), x + 5, y - 14, 8.5); x += colName;
        drawText(truncateText(row.class_id, 10), x + 5, y - 14, 8.5); x += colClass;
        drawText(row.status, x + 5, y - 14, 8.5, fontBold); x += colStatus;
        drawText(truncateText(row.rejected_reason || "—", 20), x + 5, y - 14, 8.5); x += colReason;

        if (row.punishment_text) {
          drawText(truncateText(row.punishment_text, 46), x + 5, y - 14, 8.5);
        } else {
          drawText("—", x + 5, y - 14, 8.5, fontItalic, pdfColors.muted);
        }

        y -= rowHeight;
      };

      const groupedForPdf = filteredRows.reduce((acc: Record<string, PunishmentRow[]>, row) => {
        const sessionId =
          row.session?.id ||
          `${row.category}-${row.salah || "none"}-${row.attendance_date}`;

        if (!acc[sessionId]) acc[sessionId] = [];
        acc[sessionId].push(row);

        return acc;
      }, {});

      drawPageHeader(true);

      Object.entries(groupedForPdf).forEach(([_, sessionRows]) => {
        const first = sessionRows[0];

        const sessionTitle = first.session
          ? `${first.session.category}${first.session.salah ? ` • ${first.session.salah}` : ""}`
          : `${first.category}${first.salah ? ` • ${first.salah}` : ""}`;

        const sessionDate = first.session?.attendance_date || first.attendance_date;

        drawSessionHeader(sessionTitle, sessionDate, sessionRows.length);
        drawColumnHeader();

        sessionRows.forEach((row, index) => {
          if (y - 22 < bottomLimit) {
            startNewPage();
            drawSessionHeader(`${sessionTitle} (continued)`, sessionDate, sessionRows.length);
            drawColumnHeader();
          }

          drawRow(row, index);
        });

        y -= 12;
      });

      drawPageFooter();

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
        return;
      }

      const pdfBytes = await pdfDoc.save();
      const fileUri = `${FileSystem.cacheDirectory}${exportTitle.replace(/\s+/g, "_")}.pdf`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        Buffer.from(pdfBytes).toString("base64"),
        {
          encoding: FileSystem.EncodingType.Base64,
        }
      );

      await Sharing.shareAsync(fileUri, {
        dialogTitle: exportTitle,
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch (err: any) {
      Alert.alert("Export Failed", err.message || "Could not export PDF.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAllLeaderData = async () => {
    const { error: punishmentError } = await supabase
      .from("clg_punishments")
      .delete()
      .not("id", "is", null);

    if (punishmentError) throw punishmentError;

    const { error: absenceError } = await supabase
      .from("clg_attendance_absences")
      .delete()
      .not("id", "is", null);

    if (absenceError) throw absenceError;

    const { error: sessionError } = await supabase
      .from("clg_attendance_sessions")
      .delete()
      .not("id", "is", null);

    if (sessionError) throw sessionError;
  };

  const handleDeleteFiltered = async () => {
    if (deleting) return;

    if (filter !== "all" && filteredRows.length === 0) {
      Alert.alert("Notice", "No rows to delete.");
      return;
    }

    const label =
      filter === "all"
        ? "all attendance sessions, absences, and punishment logs"
        : `${filter} punishment logs`;

    Alert.alert("Delete Logs", `Are you sure you want to delete ${label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);

            if (filter === "all") {
              await deleteAllLeaderData();
            } else {
              const { error } = await supabase
                .from("clg_punishments")
                .delete()
                .eq("status", filter);

              if (error) throw error;
            }

            await fetchLogs();
          } catch (err: any) {
            Alert.alert("Delete Failed", err.message || "Could not delete logs.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading logs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <FileText size={26} color={theme.colors.primary} />
            </View>

            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshBtn}
              activeOpacity={0.84}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <RefreshCcw size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.heroPillText}>Control Center</Text>
          </View>

          <Text style={styles.heroTitle}>Punishment Logs</Text>
          <Text style={styles.heroSubtitle}>
            Export grouped attendance-session reports and delete filtered or full leader data.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard title="Total" value={summary.total} icon={ClipboardList} tone="primary" />
          <SummaryCard title="Pending" value={summary.pending} icon={Clock3} tone="warning" />
          <SummaryCard title="Completed" value={summary.completed} icon={CheckCircle2} tone="success" />
          <SummaryCard title="Rejected" value={summary.rejected} icon={XCircle} tone="danger" />
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Filter by Status</Text>
          <Text style={styles.sectionSubtitle}>
            Export or delete based on the selected filter.
          </Text>

          <View style={styles.filterRow}>
            <FilterButton label="All" active={filter === "all"} onPress={() => setFilter("all")} />
            <FilterButton label="Pending" active={filter === "pending"} onPress={() => setFilter("pending")} />
            <FilterButton label="Completed" active={filter === "completed"} onPress={() => setFilter("completed")} />
            <FilterButton label="Rejected" active={filter === "rejected"} onPress={() => setFilter("rejected")} />
          </View>

          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={[styles.primaryButton, exporting && styles.disabledButton]}
              activeOpacity={0.84}
              onPress={handleExportPdf}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={theme.colors.textOnDark} />
              ) : (
                <>
                  <Download size={16} color={theme.colors.textOnDark} />
                  <Text style={styles.primaryButtonText}>Export Filtered PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, deleting && styles.disabledButton]}
              activeOpacity={0.84}
              onPress={handleDeleteFiltered}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={theme.colors.error} />
              ) : (
                <>
                  <Trash2 size={16} color={theme.colors.error} />
                  <Text style={styles.dangerButtonText}>
                    {filter === "all" ? "Delete All Leader Data" : `Delete ${filter} Logs`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.logsCard}>
          <Text style={styles.sectionTitle}>Current Records</Text>
          <Text style={styles.sectionSubtitle}>
            Showing {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"} grouped by attendance session.
          </Text>

          <View style={styles.stack}>
            {filteredRows.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No records found</Text>
                <Text style={styles.emptyText}>
                  There are no punishment logs for this filter.
                </Text>
              </View>
            ) : (
              Object.entries(groupedForDisplay).map(([sessionTitle, sessionRows]) => (
                <View key={sessionTitle} style={styles.sessionGroupCard}>
                  <Text style={styles.sessionTitle}>{sessionTitle}</Text>
                  <Text style={styles.sessionSubtitle}>
                    {sessionRows.length} record{sessionRows.length === 1 ? "" : "s"}
                  </Text>

                  <View style={styles.stack}>
                    {sessionRows.map((row) => {
                      const heading = row.salah
                        ? `${row.category} • ${row.salah}`
                        : row.category;

                      return (
                        <View key={row.id} style={styles.logItemCard}>
                          <View style={styles.logTopRow}>
                            <View style={styles.logTextWrap}>
                              <Text style={styles.logName}>{row.student_name}</Text>
                              <Text style={styles.logMeta}>
                                {row.class_id} • {heading}
                              </Text>
                              <Text style={styles.logMeta}>
                                Date: {formatDisplayDate(row.attendance_date)}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.statusPill,
                                row.status === "completed"
                                  ? styles.statusPillSuccess
                                  : row.status === "rejected"
                                  ? styles.statusPillDanger
                                  : styles.statusPillWarning,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  row.status === "completed"
                                    ? styles.statusPillTextSuccess
                                    : row.status === "rejected"
                                    ? styles.statusPillTextDanger
                                    : styles.statusPillTextWarning,
                                ]}
                              >
                                {row.status}
                              </Text>
                            </View>
                          </View>

                          {row.punishment_text ? (
                            <View style={styles.infoBox}>
                              <Text style={styles.infoLabel}>Punishment</Text>
                              <Text style={styles.infoText}>{row.punishment_text}</Text>
                            </View>
                          ) : null}

                          {row.rejected_reason ? (
                            <View style={styles.rejectBox}>
                              <Text style={styles.rejectLabel}>Reject Reason</Text>
                              <Text style={styles.rejectText}>{row.rejected_reason}</Text>
                            </View>
                          ) : null}

                          <Text style={styles.timeText}>
                            Created: {formatDateTime(row.created_at)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
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
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
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

  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.soft,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  summaryValue: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 24,
    fontFamily: "MullerBold",
  },

  actionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.soft,
  },
  logsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.soft,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 5,
    marginBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
    lineHeight: 18,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  filterButtonTextActive: {
    color: theme.colors.textOnDark,
  },

  actionButtonsCol: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontFamily: "MullerBold",
  },
  disabledButton: {
    opacity: 0.7,
  },

  stack: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },

  sessionGroupCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  sessionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerBold",
  },
  sessionSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },

  logItemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  logTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  logTextWrap: {
    flex: 1,
  },
  logName: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: "MullerBold",
  },
  logMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerMedium",
    lineHeight: 17,
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillSuccess: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusPillWarning: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: "rgba(245,158,11,0.14)",
  },
  statusPillDanger: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "MullerBold",
    textTransform: "capitalize",
  },
  statusPillTextSuccess: {
    color: theme.colors.success,
  },
  statusPillTextWarning: {
    color: theme.colors.accent,
  },
  statusPillTextDanger: {
    color: theme.colors.error,
  },

  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  infoText: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: "MullerMedium",
    lineHeight: 20,
  },

  rejectBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
  },
  rejectLabel: {
    color: theme.colors.error,
    fontSize: 11,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  rejectText: {
    marginTop: 6,
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: "MullerMedium",
    textTransform: "capitalize",
  },

  timeText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: "MullerMedium",
  },
});