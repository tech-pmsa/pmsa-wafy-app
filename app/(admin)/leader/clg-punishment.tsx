import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
  Sparkles,
  X,
  ChevronDown,
  PlusCircle,
} from "lucide-react-native";
import { useFocusEffect } from "expo-router";

type PunishmentStatus = "pending" | "completed" | "rejected";
type RejectReason = "mercy" | "absent" | "misunderstand";

interface AbsenceRow {
  id: string;
  session_id: string;
  student_uid: string;
  student_name: string;
  class_id: string;
  category: string;
  salah: string | null;
  attendance_date: string;
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
  rejected_reason: RejectReason | null;
  created_at: string;
  updated_at: string;
}

const REJECT_OPTIONS: { label: string; value: RejectReason }[] = [
  { label: "Mercy", value: "mercy" },
  { label: "Absent", value: "absent" },
  { label: "Misunderstand", value: "misunderstand" },
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
                style={styles.closeButton}
                onPress={() => setOpen(false)}
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

function TabButton({
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
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CollegePunishmentPage() {
  const { user } = useUserData();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"add" | "pending" | "completed" | "rejected">(
    "add"
  );

  const [absences, setAbsences] = useState<AbsenceRow[]>([]);
  const [punishments, setPunishments] = useState<PunishmentRow[]>([]);

  const [selectedAbsence, setSelectedAbsence] = useState<AbsenceRow | null>(null);
  const [punishmentText, setPunishmentText] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [showPunishmentModal, setShowPunishmentModal] = useState(false);

  const [selectedPunishment, setSelectedPunishment] = useState<PunishmentRow | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectReason | "">("");
  const [savingReject, setSavingReject] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: absencesData, error: absencesError }, { data: punishmentsData, error: punishmentsError }] =
        await Promise.all([
          supabase
            .from("clg_attendance_absences")
            .select("*")
            .order("attendance_date", { ascending: false })
            .order("created_at", { ascending: false }),
          supabase
            .from("clg_punishments")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

      if (absencesError) throw absencesError;
      if (punishmentsError) throw punishmentsError;

      setAbsences((absencesData || []) as AbsenceRow[]);
      setPunishments((punishmentsData || []) as PunishmentRow[]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load punishment data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const punishedAbsenceIds = useMemo(
    () => new Set(punishments.map((p) => p.source_absence_id).filter(Boolean)),
    [punishments]
  );

  const addTabRows = useMemo(
    () => absences.filter((absence) => !punishedAbsenceIds.has(absence.id)),
    [absences, punishedAbsenceIds]
  );

  const pendingRows = useMemo(
    () => punishments.filter((p) => p.status === "pending"),
    [punishments]
  );

  const completedRows = useMemo(
    () => punishments.filter((p) => p.status === "completed"),
    [punishments]
  );

  const rejectedRows = useMemo(
    () => punishments.filter((p) => p.status === "rejected"),
    [punishments]
  );

  const openAddModal = (absence: AbsenceRow) => {
    setSelectedAbsence(absence);
    setPunishmentText("");
    setShowPunishmentModal(true);
  };

  const handleAddPunishment = async () => {
    if (!selectedAbsence) return;

    if (!punishmentText.trim()) {
      Alert.alert("Required", "Please enter punishment.");
      return;
    }

    try {
      setSavingAdd(true);

      const payload = {
        student_uid: selectedAbsence.student_uid,
        student_name: selectedAbsence.student_name,
        class_id: selectedAbsence.class_id,
        source_absence_id: selectedAbsence.id,
        category: selectedAbsence.category,
        salah: selectedAbsence.salah,
        attendance_date: selectedAbsence.attendance_date,
        punishment_text: punishmentText.trim(),
        status: "pending",
        created_by: user?.id || null,
      };

      const { error } = await supabase.from("clg_punishments").insert(payload);
      if (error) throw error;

      setShowPunishmentModal(false);
      setSelectedAbsence(null);
      setPunishmentText("");
      await fetchData();
      setActiveTab("pending");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add punishment.");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleComplete = async (row: PunishmentRow) => {
    try {
      const { error } = await supabase
        .from("clg_punishments")
        .update({
          status: "completed",
          rejected_reason: null,
        })
        .eq("id", row.id);

      if (error) throw error;

      await fetchData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to complete punishment.");
    }
  };

  const openRejectModal = (row: PunishmentRow) => {
    setSelectedPunishment(row);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedPunishment) return;
    if (!rejectReason) {
      Alert.alert("Required", "Please select reject reason.");
      return;
    }

    try {
      setSavingReject(true);

      const { error } = await supabase
        .from("clg_punishments")
        .update({
          status: "rejected",
          rejected_reason: rejectReason,
        })
        .eq("id", selectedPunishment.id);

      if (error) throw error;

      setShowRejectModal(false);
      setSelectedPunishment(null);
      setRejectReason("");
      await fetchData();
      setActiveTab("rejected");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reject punishment.");
    } finally {
      setSavingReject(false);
    }
  };

  const renderAddCard = (row: AbsenceRow) => {
    const heading = row.salah ? `${row.category} • ${row.salah}` : row.category;

    return (
      <View key={row.id} style={styles.itemCard}>
        <View style={styles.itemCardTextWrap}>
          <Text style={styles.itemTitle}>{row.student_name}</Text>
          <Text style={styles.itemMeta}>
            {row.class_id} • {heading} • {formatDisplayDate(row.attendance_date)}
          </Text>
        </View>

        <View style={styles.rowActions}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => openAddModal(row)}
            style={styles.addActionBtn}
          >
            <PlusCircle size={16} color={theme.colors.success} />
            <Text style={styles.addActionText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() =>
              openRejectModal({
                id: "",
                student_uid: row.student_uid,
                student_name: row.student_name,
                class_id: row.class_id,
                source_absence_id: row.id,
                category: row.category,
                salah: row.salah,
                attendance_date: row.attendance_date,
                punishment_text: null,
                status: "pending",
                rejected_reason: null,
                created_at: "",
                updated_at: "",
              })
            }
            style={styles.rejectActionBtn}
          >
            <XCircle size={16} color={theme.colors.error} />
            <Text style={styles.rejectActionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPunishmentCard = (row: PunishmentRow, mode: "pending" | "completed" | "rejected") => {
    const heading = row.salah ? `${row.category} • ${row.salah}` : row.category;

    return (
      <View key={row.id} style={styles.itemCard}>
        <View style={styles.itemCardTextWrap}>
          <Text style={styles.itemTitle}>{row.student_name}</Text>
          <Text style={styles.itemMeta}>
            {row.class_id} • {heading} • {formatDisplayDate(row.attendance_date)}
          </Text>

          {row.punishment_text ? (
            <View style={styles.punishmentBox}>
              <Text style={styles.punishmentLabel}>Punishment</Text>
              <Text style={styles.punishmentText}>{row.punishment_text}</Text>
            </View>
          ) : null}

          {mode === "rejected" && row.rejected_reason ? (
            <View style={styles.rejectReasonBox}>
              <Text style={styles.rejectReasonLabel}>Rejected Reason</Text>
              <Text style={styles.rejectReasonText}>{row.rejected_reason}</Text>
            </View>
          ) : null}
        </View>

        {mode === "pending" ? (
          <View style={styles.rowActions}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => handleComplete(row)}
              style={styles.completeActionBtn}
            >
              <CheckCircle2 size={16} color={theme.colors.success} />
              <Text style={styles.completeActionText}>Completed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => openRejectModal(row)}
              style={styles.rejectActionBtn}
            >
              <XCircle size={16} color={theme.colors.error} />
              <Text style={styles.rejectActionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        ) : mode === "completed" ? (
          <View style={styles.statusPillSuccess}>
            <Text style={styles.statusPillSuccessText}>Completed</Text>
          </View>
        ) : (
          <View style={styles.statusPillDanger}>
            <Text style={styles.statusPillDangerText}>Rejected</Text>
          </View>
        )}
      </View>
    );
  };

  const currentRows =
    activeTab === "add"
      ? addTabRows
      : activeTab === "pending"
      ? pendingRows
      : activeTab === "completed"
      ? completedRows
      : rejectedRows;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading punishments...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <AlertTriangle size={26} color={theme.colors.primary} />
            </View>

            <View style={styles.heroPill}>
              <Sparkles size={13} color={theme.colors.accent} />
              <Text style={styles.heroPillText}>Discipline Flow</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Punishment Management</Text>
          <Text style={styles.heroSubtitle}>
            Add punishments from absences, move them through pending, completed, or rejected.
          </Text>
        </View>

        <View style={styles.tabsRow}>
          <TabButton label={`Add (${addTabRows.length})`} active={activeTab === "add"} onPress={() => setActiveTab("add")} />
          <TabButton label={`Pending (${pendingRows.length})`} active={activeTab === "pending"} onPress={() => setActiveTab("pending")} />
          <TabButton label={`Completed (${completedRows.length})`} active={activeTab === "completed"} onPress={() => setActiveTab("completed")} />
          <TabButton label={`Rejected (${rejectedRows.length})`} active={activeTab === "rejected"} onPress={() => setActiveTab("rejected")} />
        </View>

        <View style={styles.stack}>
          {currentRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No records</Text>
              <Text style={styles.emptyText}>
                There are no items in this tab right now.
              </Text>
            </View>
          ) : activeTab === "add" ? (
            (currentRows as AbsenceRow[]).map(renderAddCard)
          ) : activeTab === "pending" ? (
            (currentRows as PunishmentRow[]).map((row) => renderPunishmentCard(row, "pending"))
          ) : activeTab === "completed" ? (
            (currentRows as PunishmentRow[]).map((row) => renderPunishmentCard(row, "completed"))
          ) : (
            (currentRows as PunishmentRow[]).map((row) => renderPunishmentCard(row, "rejected"))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPunishmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPunishmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Punishment</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPunishmentModal(false)}
                activeOpacity={0.84}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Punishment</Text>
              <TextInput
                style={styles.textarea}
                multiline
                textAlignVertical="top"
                placeholder="Enter punishment details..."
                placeholderTextColor={theme.colors.textMuted}
                value={punishmentText}
                onChangeText={setPunishmentText}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.84}
                onPress={handleAddPunishment}
                disabled={savingAdd}
              >
                {savingAdd ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnDark} />
                ) : (
                  <Text style={styles.primaryButtonText}>Move to Pending</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Reason</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowRejectModal(false)}
                activeOpacity={0.84}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Reason</Text>
              <CustomPicker
                value={rejectReason}
                placeholder="Select reason"
                options={REJECT_OPTIONS}
                onSelect={(val) => setRejectReason(val as RejectReason)}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.84}
                onPress={async () => {
                  if (selectedPunishment?.id) {
                    await handleReject();
                  } else if (selectedPunishment?.source_absence_id) {
                    if (!rejectReason) {
                      Alert.alert("Required", "Please select reject reason.");
                      return;
                    }

                    try {
                      setSavingReject(true);

                      const { error } = await supabase.from("clg_punishments").insert({
                        student_uid: selectedPunishment.student_uid,
                        student_name: selectedPunishment.student_name,
                        class_id: selectedPunishment.class_id,
                        source_absence_id: selectedPunishment.source_absence_id,
                        category: selectedPunishment.category,
                        salah: selectedPunishment.salah,
                        attendance_date: selectedPunishment.attendance_date,
                        punishment_text: null,
                        status: "rejected",
                        rejected_reason: rejectReason,
                        created_by: user?.id || null,
                      });

                      if (error) throw error;

                      setShowRejectModal(false);
                      setSelectedPunishment(null);
                      setRejectReason("");
                      await fetchData();
                      setActiveTab("rejected");
                    } catch (err: any) {
                      Alert.alert("Error", err.message || "Failed to reject.");
                    } finally {
                      setSavingReject(false);
                    }
                  }
                }}
                disabled={savingReject}
              >
                {savingReject ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnDark} />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
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

  tabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  tabButtonTextActive: {
    color: theme.colors.textOnDark,
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
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },

  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    ...theme.shadows.soft,
  },
  itemCardTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerBold",
  },
  itemMeta: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
    lineHeight: 18,
  },

  punishmentBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  punishmentLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  punishmentText: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },

  rejectReasonBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
  },
  rejectReasonLabel: {
    color: theme.colors.error,
    fontSize: 11,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  rejectReasonText: {
    marginTop: 6,
    color: theme.colors.error,
    fontSize: 14,
    fontFamily: "MullerMedium",
    textTransform: "capitalize",
  },

  rowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  addActionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.14)",
    backgroundColor: theme.colors.successSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addActionText: {
    color: theme.colors.success,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  completeActionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.14)",
    backgroundColor: theme.colors.successSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  completeActionText: {
    color: theme.colors.success,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  rejectActionBtn: {
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
  rejectActionText: {
    color: theme.colors.error,
    fontSize: 13,
    fontFamily: "MullerBold",
  },

  statusPillSuccess: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusPillSuccessText: {
    color: theme.colors.success,
    fontSize: 12,
    fontFamily: "MullerBold",
  },
  statusPillDanger: {
    marginTop: 14,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusPillDangerText: {
    color: theme.colors.error,
    fontSize: 12,
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
    borderTopWidth: 1,
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
  modalBody: {
    padding: 16,
    gap: 14,
    paddingBottom: 26,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  textarea: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: 14,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
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
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
  },
  modalItemText: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: "MullerMedium",
  },
  modalItemTextActive: {
    color: theme.colors.primary,
    fontFamily: "MullerBold",
  },
});