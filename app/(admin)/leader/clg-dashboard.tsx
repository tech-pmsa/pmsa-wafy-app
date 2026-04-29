import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  LayoutDashboard,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  Clock3,
  XCircle,
  Users,
  Award,
  X,
  ChevronRight,
} from "lucide-react-native";

type PunishmentStatus = "pending" | "completed" | "rejected";

interface PunishmentRow {
  id: string;
  student_uid: string;
  student_name: string;
  class_id: string;
  category: string;
  salah: string | null;
  attendance_date: string;
  punishment_text: string | null;
  status: PunishmentStatus;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface TopStudent {
  student_uid: string;
  name: string;
  class_id: string;
  count: number;
  rows: PunishmentRow[];
}

function formatDisplayDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone = "primary",
  onPress,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  tone?: "primary" | "success" | "warning" | "danger";
  onPress?: () => void;
}) {
  const toneMap = {
    primary: {
      bg: theme.colors.primarySoft,
      color: theme.colors.primary,
      border: theme.colors.primaryTint,
    },
    success: {
      bg: theme.colors.successSoft,
      color: theme.colors.success,
      border: "rgba(22,163,74,0.14)",
    },
    warning: {
      bg: theme.colors.accentSoft,
      color: theme.colors.accent,
      border: "rgba(245,158,11,0.14)",
    },
    danger: {
      bg: theme.colors.errorSoft,
      color: theme.colors.error,
      border: "rgba(220,38,38,0.14)",
    },
  } as const;

  const current = toneMap[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      disabled={!onPress}
      onPress={onPress}
      style={styles.statCard}
    >
      <View style={styles.statTopRow}>
        <Text style={styles.statTitle}>{title}</Text>
        <View
          style={[
            styles.statIconWrap,
            {
              backgroundColor: current.bg,
              borderColor: current.border,
            },
          ]}
        >
          <Icon size={18} color={current.color} />
        </View>
      </View>

      <Text style={styles.statValue}>{value}</Text>

      {onPress ? (
        <View style={styles.tapRow}>
          <Text style={styles.tapText}>View details</Text>
          <ChevronRight size={14} color={theme.colors.textMuted} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function OverviewRow({
  title,
  student,
  onPress,
}: {
  title: string;
  student: TopStudent | null;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      disabled={!student}
      style={styles.overviewRow}
    >
      <View style={styles.overviewTextWrap}>
        <Text style={styles.overviewTitle}>{title}</Text>
        <Text style={styles.overviewName}>
          {student ? student.name : "No completed data"}
        </Text>
        <Text style={styles.overviewMeta}>
          {student ? `${student.class_id} • ${student.count} miss` : "Only completed punishments are counted"}
        </Text>
      </View>

      <View style={styles.overviewCountPill}>
        <Text style={styles.overviewCountText}>{student?.count || 0}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CollegeLeaderDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [punishments, setPunishments] = useState<PunishmentRow[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedRows, setSelectedRows] = useState<PunishmentRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("clg_punishments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPunishments((data || []) as PunishmentRow[]);
    } catch (err) {
      console.log("Leader dashboard fetch error:", err);
      setPunishments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const summary = useMemo(() => {
    return {
      total: punishments.length,
      completed: punishments.filter((p) => p.status === "completed").length,
      pending: punishments.filter((p) => p.status === "pending").length,
      rejected: punishments.filter((p) => p.status === "rejected").length,
    };
  }, [punishments]);

  const completedPunishments = useMemo(
    () => punishments.filter((item) => item.status === "completed"),
    [punishments]
  );

  const missOverview = useMemo(() => {
    const categoryMap: Record<string, Record<string, TopStudent>> = {
      sunnath: {},
      masbook: {},
      jamaath: {},
      thasbeeh: {},
    };

    completedPunishments.forEach((item) => {
      const rawCategory = String(item.category || "").toLowerCase().trim();

      let key = rawCategory;
      if (rawCategory.includes("jama")) key = "jamaath";

      if (!categoryMap[key]) return;

      const uid = item.student_uid;

      if (!categoryMap[key][uid]) {
        categoryMap[key][uid] = {
          student_uid: uid,
          name: item.student_name,
          class_id: item.class_id,
          count: 0,
          rows: [],
        };
      }

      categoryMap[key][uid].count += 1;
      categoryMap[key][uid].rows.push(item);
    });

    const getTop = (key: string): TopStudent | null => {
      const list = Object.values(categoryMap[key] || {});
      return list.sort((a, b) => b.count - a.count)[0] || null;
    };

    return {
      sunnath: getTop("sunnath"),
      masbook: getTop("masbook"),
      jamaath: getTop("jamaath"),
      thasbeeh: getTop("thasbeeh"),
      allSunnath: Object.values(categoryMap.sunnath).sort((a, b) => b.count - a.count),
      allMasbook: Object.values(categoryMap.masbook).sort((a, b) => b.count - a.count),
      allJamaath: Object.values(categoryMap.jamaath).sort((a, b) => b.count - a.count),
      allThasbeeh: Object.values(categoryMap.thasbeeh).sort((a, b) => b.count - a.count),
    };
  }, [completedPunishments]);

  const openRowsModal = (title: string, rows: PunishmentRow[]) => {
    setSelectedTitle(title);
    setSelectedRows(rows);
    setModalOpen(true);
  };

  const openStudentListModal = (title: string, students: TopStudent[]) => {
    const rows = students.flatMap((student) => student.rows);
    setSelectedTitle(title);
    setSelectedRows(rows);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <LayoutDashboard size={28} color={theme.colors.primary} />
            </View>

            <View style={styles.heroPill}>
              <Sparkles size={13} color={theme.colors.accent} />
              <Text style={styles.heroPillText}>Leader Overview</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>College Leader Dashboard</Text>
          <Text style={styles.heroSubtitle}>
            Live overview of punishment progress and completed attendance miss records.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Punishment Summary</Text>
          <Text style={styles.sectionSubtitle}>
            Tap any count to see related punishment details.
          </Text>

          <View style={styles.statsGrid}>
            <StatCard
              title="Total Punishments"
              value={summary.total}
              icon={ClipboardList}
              tone="primary"
              onPress={() => openRowsModal("Total Punishments", punishments)}
            />
            <StatCard
              title="Completed"
              value={summary.completed}
              icon={CheckCircle2}
              tone="success"
              onPress={() =>
                openRowsModal(
                  "Completed Punishments",
                  punishments.filter((p) => p.status === "completed")
                )
              }
            />
            <StatCard
              title="Pending"
              value={summary.pending}
              icon={Clock3}
              tone="warning"
              onPress={() =>
                openRowsModal(
                  "Pending Punishments",
                  punishments.filter((p) => p.status === "pending")
                )
              }
            />
            <StatCard
              title="Rejected"
              value={summary.rejected}
              icon={XCircle}
              tone="danger"
              onPress={() =>
                openRowsModal(
                  "Rejected Punishments",
                  punishments.filter((p) => p.status === "rejected")
                )
              }
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Student Miss Overview</Text>
          <Text style={styles.sectionSubtitle}>
            Counts are calculated from completed punishments only.
          </Text>

          <View style={styles.overviewStack}>
            <OverviewRow
              title="Most Sunnath Miss Student"
              student={missOverview.sunnath}
              onPress={() =>
                openStudentListModal("Sunnath Miss Details", missOverview.allSunnath)
              }
            />
            <OverviewRow
              title="Most Masbook Miss Student"
              student={missOverview.masbook}
              onPress={() =>
                openStudentListModal("Masbook Miss Details", missOverview.allMasbook)
              }
            />
            <OverviewRow
              title="Most Jama'ath Miss Student"
              student={missOverview.jamaath}
              onPress={() =>
                openStudentListModal("Jama'ath Miss Details", missOverview.allJamaath)
              }
            />
            <OverviewRow
              title="Most Thasbeeh Miss Student"
              student={missOverview.thasbeeh}
              onPress={() =>
                openStudentListModal("Thasbeeh Miss Details", missOverview.allThasbeeh)
              }
            />
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>{selectedTitle}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedRows.length} record{selectedRows.length === 1 ? "" : "s"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setModalOpen(false)}
                style={styles.closeButton}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedRows}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No data found</Text>
                  <Text style={styles.emptyText}>There are no records here.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const heading = item.salah
                  ? `${item.category} • ${item.salah}`
                  : item.category;

                return (
                  <View style={styles.detailCard}>
                    <View style={styles.detailTopRow}>
                      <View style={styles.detailTextWrap}>
                        <Text style={styles.detailName}>{item.student_name}</Text>
                        <Text style={styles.detailMeta}>{item.class_id} • {heading}</Text>
                        <Text style={styles.detailMeta}>
                          {formatDisplayDate(item.attendance_date)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          item.status === "completed"
                            ? styles.statusSuccess
                            : item.status === "rejected"
                            ? styles.statusDanger
                            : styles.statusWarning,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            item.status === "completed"
                              ? styles.statusTextSuccess
                              : item.status === "rejected"
                              ? styles.statusTextDanger
                              : styles.statusTextWarning,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {item.punishment_text ? (
                      <View style={styles.infoBox}>
                        <Text style={styles.infoLabel}>Punishment</Text>
                        <Text style={styles.infoText}>{item.punishment_text}</Text>
                      </View>
                    ) : null}

                    {item.rejected_reason ? (
                      <View style={styles.rejectBox}>
                        <Text style={styles.rejectLabel}>Reject Reason</Text>
                        <Text style={styles.rejectText}>{item.rejected_reason}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
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

  sectionCard: {
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
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },

  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  statTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statValue: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 25,
    fontFamily: "MullerBold",
  },
  tapRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tapText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: "MullerMedium",
    marginRight: 4,
  },

  overviewStack: {
    gap: 12,
  },
  overviewRow: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  overviewTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  overviewTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  overviewName: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: "MullerBold",
  },
  overviewMeta: {
    marginTop: 4,
    color: theme.colors.textMuted,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },
  overviewCountPill: {
    minWidth: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewCountText: {
    color: theme.colors.primary,
    fontSize: 17,
    fontFamily: "MullerBold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "82%",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    paddingBottom: 20,
  },
  modalHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontFamily: "MullerBold",
  },
  modalSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalList: {
    padding: 16,
    gap: 12,
  },
  detailCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  detailTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailName: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: "MullerBold",
  },
  detailMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerMedium",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusSuccess: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusWarning: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: "rgba(245,158,11,0.14)",
  },
  statusDanger: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusText: {
    fontSize: 11,
    textTransform: "capitalize",
    fontFamily: "MullerBold",
  },
  statusTextSuccess: {
    color: theme.colors.success,
  },
  statusTextWarning: {
    color: theme.colors.accent,
  },
  statusTextDanger: {
    color: theme.colors.error,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
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
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
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
});