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
  ChefHat,
  Save,
  Plus,
  Trash2,
  Users,
  Armchair,
  LayoutGrid,
  Settings2,
  Link2Off,
  X,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Layers3,
  RefreshCcw,
  Lock,
} from "lucide-react-native";

import ChefSettingsPasswordGate, {
  resetChefSettingsAccess,
} from "@/components/admin/chef/ChefSettingsPasswordGate";

import { ChefTablesPdfExport } from "@/components/admin/chef/ChefTablesPdfExport";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";
import FoodSelection, { FoodItem, StudentFoodPreference } from "@/components/admin/chef/FoodSelection";

type RowPosition = "left" | "middle" | "right";
type Orientation = "horizontal" | "vertical";

interface KitchenTable { id: string; table_number: number; table_name: string | null; is_active: boolean; row_number: number; row_position: RowPosition; orientation: Orientation; active_seat_count: number; display_order: number; }
interface KitchenStudent { student_uid: string; name: string; cic: string | null; class_id: string; batch: string | null; council: string | null; day_present: boolean; noon_present: boolean; night_present: boolean; }
interface SeatAssignment { id: string; student_uid: string; kitchen_table_id: string; seat_number: number; }
type AssignmentFormValue = { tableId: string; seatNumber: string; };

function CustomPicker({ value, options, onSelect, placeholder, disabled }: { value: string; options: { label: string; value: string }[]; onSelect: (val: string) => void; placeholder: string; disabled?: boolean; }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;
  return (
    <>
      <TouchableOpacity style={[styles.pickerBtn, disabled && styles.pickerDisabled]} onPress={() => !disabled && setOpen(true)} activeOpacity={disabled ? 1 : 0.84}>
        <Text style={value ? styles.pickerText : styles.pickerPlaceholder} numberOfLines={1}>{selectedLabel}</Text>
        <ChevronDown size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentList}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.modalCloseBtn} activeOpacity={0.84}><X size={20} color={theme.colors.text} /></TouchableOpacity>
            </View>
            <FlatList data={options} keyExtractor={(item) => item.value} renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item.value); setOpen(false); }} activeOpacity={0.84}>
                <Text style={[styles.pickerItemText, value === item.value && styles.pickerItemTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            )} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function MiniStatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<any>; }) {
  return (
    <View style={styles.miniStatCard}>
      <View style={styles.miniStatIconWrap}><Icon size={18} color={theme.colors.primary} /></View>
      <View style={styles.miniStatTextWrap}>
        <Text style={styles.miniStatValue}>{value}</Text>
        <Text style={styles.miniStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string; }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function normalizeForm(value?: AssignmentFormValue | null) { return { tableId: value?.tableId || "", seatNumber: value?.seatNumber || "", }; }
function isSameForm(a?: AssignmentFormValue | null, b?: AssignmentFormValue | null) { const aa = normalizeForm(a); const bb = normalizeForm(b); return aa.tableId === bb.tableId && aa.seatNumber === bb.seatNumber; }

export default function KitchenSettingsPage() {
  const { user: authUser } = useUserData();
  const scrollRef = useRef<ScrollView>(null);

  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  const [tables, setTables] = useState<KitchenTable[]>([]);
  const [students, setStudents] = useState<KitchenStudent[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignment[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<StudentFoodPreference[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"layout" | "assignments" | "foods">("layout");
  const [switchingTab, setSwitchingTab] = useState(false);

  const [newTableCount, setNewTableCount] = useState("1");

  const [assignmentForm, setAssignmentForm] = useState<Record<string, AssignmentFormValue>>({});
  const [initialAssignmentForm, setInitialAssignmentForm] = useState<Record<string, AssignmentFormValue>>({});
  const [activeAssignmentClass, setActiveAssignmentClass] = useState<string>("");

  const [rowSavingMap, setRowSavingMap] = useState<Record<string, boolean>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [clearingVisible, setClearingVisible] = useState(false);
  const [gateKey, setGateKey] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: tablesData }, { data: studentsData }, { data: assignmentsData }, { data: foodsData }, { data: prefsData }
      ] = await Promise.all([
        supabase.from("kitchen_tables").select("*").order("row_number").order("display_order"),
        supabase.from("kitchen_students").select("*").order("class_id").order("name"),
        supabase.from("kitchen_seat_assignments").select("*"),
        supabase.from('food_items').select('*').order('display_order'),
        supabase.from('student_food_preferences').select('*')
      ]);

      const safeTables = (tablesData || []) as KitchenTable[];
      const safeStudents = (studentsData || []) as KitchenStudent[];
      const safeAssignments = (assignmentsData || []) as SeatAssignment[];

      setTables(safeTables);
      setStudents(safeStudents);
      setAssignments(safeAssignments);
      setFoods((foodsData || []) as FoodItem[]);
      setFoodPreferences((prefsData || []) as StudentFoodPreference[]);

      const nextForm: Record<string, AssignmentFormValue> = {};
      for (const student of safeStudents) {
        const existing = safeAssignments.find((a) => a.student_uid === student.student_uid);
        nextForm[student.student_uid] = { tableId: existing?.kitchen_table_id || "", seatNumber: existing?.seat_number ? String(existing.seat_number) : "", };
      }

      setAssignmentForm(nextForm);
      setInitialAssignmentForm(nextForm);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authUser?.id) fetchData(); }, [authUser?.id, fetchData]);

  const handleCreateTables = async () => {
    const count = Number(newTableCount);
    if (!Number.isInteger(count) || count <= 0) return Alert.alert("Error", "Enter a valid number");
    try {
      const maxTableNum = tables.length ? Math.max(...tables.map((t) => t.table_number)) : 0;
      const payload = Array.from({ length: count }, (_, i) => ({
        table_number: maxTableNum + i + 1, is_active: true, row_number: 1, row_position: "left", orientation: "horizontal", active_seat_count: 8, display_order: maxTableNum + i + 1,
      }));
      const { error } = await supabase.from("kitchen_tables").insert(payload);
      if (error) throw error;
      Alert.alert("Success", `${count} tables created`);
      setNewTableCount("1");
      await fetchData();
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const handleSaveTable = async (table: KitchenTable) => {
    try {
      const { error } = await supabase.from("kitchen_tables").update(table).eq("id", table.id);
      if (error) throw error;
      Alert.alert("Success", "Table saved successfully");
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const handleDeleteTable = (table: KitchenTable) => {
    Alert.alert("Delete Table", `Remove ${table.table_name || `Table ${table.table_number}`}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const { error } = await supabase.from("kitchen_tables").delete().eq("id", table.id);
          if (error) Alert.alert("Error", error.message); else fetchData();
        },
      },
    ]);
  };

  const saveAssignmentForStudent = async (studentUid: string) => {
    const form = normalizeForm(assignmentForm[studentUid]);
    const existing = assignments.find((a) => a.student_uid === studentUid);
    if (rowSavingMap[studentUid]) return;

    try {
      setRowSavingMap((prev) => ({ ...prev, [studentUid]: true }));
      if (!form.tableId || !form.seatNumber) {
        if (existing) {
          const { error } = await supabase.from("kitchen_seat_assignments").delete().eq("id", existing.id);
          if (error) throw error;
        }
      } else {
        const payload = { kitchen_table_id: form.tableId, seat_number: Number(form.seatNumber), student_uid: studentUid };
        if (existing) {
          const { error } = await supabase.from("kitchen_seat_assignments").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("kitchen_seat_assignments").insert(payload);
          if (error) throw error;
        }
      }
      setInitialAssignmentForm((prev) => ({ ...prev, [studentUid]: form }));
      await fetchData();
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setRowSavingMap((prev) => ({ ...prev, [studentUid]: false })); }
  };

  const studentClasses = useMemo(() => Array.from(new Set(students.map((s) => s.class_id || "Unassigned"))).sort(), [students]);
  useEffect(() => { if (studentClasses.length > 0 && !studentClasses.includes(activeAssignmentClass)) setActiveAssignmentClass(studentClasses[0]); }, [studentClasses, activeAssignmentClass]);

  const studentsByClass = useMemo(() => {
    return students.reduce<Record<string, KitchenStudent[]>>((acc, student) => {
      const key = student.class_id || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(student);
      return acc;
    }, {});
  }, [students]);

  const visibleAssignmentStudents = useMemo(() => studentsByClass[activeAssignmentClass] || [], [studentsByClass, activeAssignmentClass]);
  const visibleDirtyCount = useMemo(() => {
    return visibleAssignmentStudents.filter((student) => !isSameForm(assignmentForm[student.student_uid], initialAssignmentForm[student.student_uid])).length;
  }, [visibleAssignmentStudents, assignmentForm, initialAssignmentForm]);

  const handleSaveAllVisible = async () => {
    if (visibleAssignmentStudents.length === 0) return;
    if (visibleDirtyCount === 0) return Alert.alert("Nothing to Save", "No unsaved changes in this class.");

    try {
      setBulkSaving(true);
      for (const student of visibleAssignmentStudents) {
        const currentForm = normalizeForm(assignmentForm[student.student_uid]);
        const initialForm = normalizeForm(initialAssignmentForm[student.student_uid]);
        if (isSameForm(currentForm, initialForm)) continue;
        const existing = assignments.find((a) => a.student_uid === student.student_uid);

        if (!currentForm.tableId || !currentForm.seatNumber) {
          if (existing) await supabase.from("kitchen_seat_assignments").delete().eq("id", existing.id);
        } else {
          const payload = { kitchen_table_id: currentForm.tableId, seat_number: Number(currentForm.seatNumber), student_uid: student.student_uid };
          if (existing) await supabase.from("kitchen_seat_assignments").update(payload).eq("id", existing.id);
          else await supabase.from("kitchen_seat_assignments").insert(payload);
        }
      }
      Alert.alert("Success", `Saved ${visibleDirtyCount} updated assignment(s).`);
      await fetchData();
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setBulkSaving(false); }
  };

  const handleClearVisible = () => {
    if (visibleAssignmentStudents.length === 0) return;
    Alert.alert("Clear Visible Class", `Clear form values for all students in ${activeAssignmentClass}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive", onPress: () => {
          setClearingVisible(true);
          setAssignmentForm((prev) => {
            const next = { ...prev };
            visibleAssignmentStudents.forEach((student) => { next[student.student_uid] = { tableId: "", seatNumber: "" }; });
            return next;
          });
          setClearingVisible(false);
        }
      }
    ]);
  };

  const handleTabChange = (tab: "layout" | "assignments" | "foods") => {
    if (tab === activeTab) return;
    setSwitchingTab(true); setActiveTab(tab);
    setTimeout(() => setSwitchingTab(false), 120);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentY = contentOffset.y;
    const visibleHeight = layoutMeasurement.height;
    const totalHeight = contentSize.height;
    if (currentY + visibleHeight >= totalHeight - 80) setScrollDirection("up");
    else if (currentY <= 80) setScrollDirection("down");
  };

  const handleFloatingPress = () => {
    if (scrollDirection === "down") scrollRef.current?.scrollToEnd({ animated: true });
    else scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleLockSettings = () => {
    Alert.alert(
      "Lock Settings",
      "Do you want to lock chef settings now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Lock",
          style: "destructive",
          onPress: () => {
            resetChefSettingsAccess();
            setGateKey((prev) => prev + 1);
          },
        },
      ]
    );
  };

  const stats = useMemo(() => ({
    totalTables: tables.length,
    activeTables: tables.filter((t) => t.is_active).length,
    totalStudents: students.length,
    assignedStudents: assignments.length,
  }), [tables, students, assignments]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ChefSettingsPasswordGate key={gateKey}>
      <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
        <View style={styles.container}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroTopLeft}>
                  <View style={styles.heroIconWrap}>
                    <ChefHat size={28} color={theme.colors.primary} />
                  </View>

                  <View style={styles.heroTextBlock}>
                    <View style={styles.heroPill}>
                      <Sparkles size={13} color={theme.colors.accent} />
                      <Text style={styles.heroPillText}>Kitchen Configuration</Text>
                    </View>

                    <Text style={styles.heroTitle}>Chef Settings</Text>
                    <Text style={styles.heroSubtitle}>
                      Manage layout, seats, assignments, and food types.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroActionsWrap}>
                <ChefTablesPdfExport
                  tables={tables}
                  students={students}
                  assignments={assignments}
                />

                <TouchableOpacity
                  onPress={fetchData}
                  style={styles.heroActionButton}
                  activeOpacity={0.84}
                  disabled={loading}
                >
                  <RefreshCcw size={17} color={theme.colors.textSecondary} />
                  <Text style={styles.heroActionButtonText}>Refresh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLockSettings}
                  style={styles.heroActionButton}
                  activeOpacity={0.84}
                >
                  <Lock size={17} color={theme.colors.textSecondary} />
                  <Text style={styles.heroActionButtonText}>Lock Settings</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <MiniStatCard label="Tables" value={`${stats.totalTables}`} icon={LayoutGrid} />
              <MiniStatCard label="Active" value={`${stats.activeTables}`} icon={Armchair} />
              <MiniStatCard label="Students" value={`${stats.totalStudents}`} icon={Users} />
              <MiniStatCard label="Assigned" value={`${stats.assignedStudents}`} icon={Settings2} />
            </View>

            <View style={styles.tabsRow}>
              <TouchableOpacity onPress={() => handleTabChange("layout")} style={[styles.tab, activeTab === "layout" && styles.tabActive]} activeOpacity={0.84}>
                <Text style={[styles.tabText, activeTab === "layout" && styles.tabTextActive]}>Layout</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleTabChange("assignments")} style={[styles.tab, activeTab === "assignments" && styles.tabActive]} activeOpacity={0.84}>
                <Text style={[styles.tabText, activeTab === "assignments" && styles.tabTextActive]}>Assignments</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleTabChange("foods")} style={[styles.tab, activeTab === "foods" && styles.tabActive]} activeOpacity={0.84}>
                <Text style={[styles.tabText, activeTab === "foods" && styles.tabTextActive]}>Foods</Text>
              </TouchableOpacity>
            </View>

            {switchingTab ? (
              <View style={styles.transitionCard}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.transitionText}>Opening...</Text>
              </View>
            ) : activeTab === "layout" ? (
              <View style={styles.stack}>
                <View style={styles.card}>
                  <SectionTitle title="Create New Tables" subtitle="Default tables start with 8 seats horizontally." />
                  <View style={styles.createRow}>
                    <View style={styles.createInputWrap}>
                      <Text style={styles.label}>Count</Text>
                      <TextInput style={styles.input} value={newTableCount} onChangeText={setNewTableCount} keyboardType="number-pad" placeholder="Count" placeholderTextColor={theme.colors.textMuted} />
                    </View>
                    <TouchableOpacity onPress={handleCreateTables} style={styles.btnPrimary} activeOpacity={0.84}>
                      <Plus size={18} color={theme.colors.textOnDark} />
                      <Text style={styles.btnPrimaryText}>Add Tables</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {tables.map((table) => (
                  <View key={table.id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderTextWrap}>
                        <Text style={styles.cardTitle}>{table.table_name || `Table ${table.table_number}`}</Text>
                        <Text style={styles.cardDesc}>Configure row, position, orientation, and seats</Text>
                      </View>
                      <TouchableOpacity onPress={() => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, is_active: !t.is_active } : t))} style={[styles.statusBadge, table.is_active ? styles.badgeActive : styles.badgeInactive]} activeOpacity={0.84}>
                        <Text style={table.is_active ? styles.badgeTextActive : styles.badgeTextInactive}>{table.is_active ? "Active" : "Inactive"}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formGrid}>
                      <View style={styles.inputWrap}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput style={styles.input} value={table.table_name || ""} onChangeText={(val) => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, table_name: val } : t))} placeholderTextColor={theme.colors.textMuted} />
                      </View>
                      <View style={styles.inputWrap}>
                        <Text style={styles.label}>Row Number</Text>
                        <TextInput style={styles.input} value={String(table.row_number)} keyboardType="number-pad" onChangeText={(val) => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, row_number: Number(val) || 1 } : t))} placeholderTextColor={theme.colors.textMuted} />
                      </View>
                      <View style={styles.inputWrap}>
                        <Text style={styles.label}>Position</Text>
                        <CustomPicker value={table.row_position} placeholder="Position" options={[{ label: "Left", value: "left" }, { label: "Middle", value: "middle" }, { label: "Right", value: "right" }]} onSelect={(val) => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, row_position: val as RowPosition } : t))} />
                      </View>
                      <View style={styles.inputWrap}>
                        <Text style={styles.label}>Orientation</Text>
                        <CustomPicker value={table.orientation} placeholder="Orientation" options={[{ label: "Horizontal", value: "horizontal" }, { label: "Vertical", value: "vertical" }]} onSelect={(val) => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, orientation: val as Orientation } : t))} />
                      </View>
                      <View style={styles.inputWrap}>
                        <Text style={styles.label}>Seats</Text>
                        <CustomPicker value={String(table.active_seat_count)} placeholder="Seats" options={Array.from({ length: 10 }, (_, i) => ({ label: `${i + 1} Seats`, value: String(i + 1) }))} onSelect={(val) => setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, active_seat_count: Number(val) } : t))} />
                      </View>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => handleSaveTable(table)} style={styles.btnPrimary} activeOpacity={0.84}>
                        <Save size={16} color={theme.colors.textOnDark} /><Text style={styles.btnPrimaryText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteTable(table)} style={styles.btnDanger} activeOpacity={0.84}>
                        <Trash2 size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : activeTab === "assignments" ? (
              <View style={styles.stack}>
                <View style={styles.card}>
                  <SectionTitle title="Assignment by Class" subtitle="Open one class at a time for faster editing." />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classTabsRow}>
                    {studentClasses.map((classId) => (
                      <TouchableOpacity key={classId} onPress={() => setActiveAssignmentClass(classId)} style={[styles.classChip, activeAssignmentClass === classId && styles.classChipActive]} activeOpacity={0.84}>
                        <Layers3 size={14} color={activeAssignmentClass === classId ? theme.colors.textOnDark : theme.colors.primary} />
                        <Text style={[styles.classChipText, activeAssignmentClass === classId && styles.classChipTextActive]}>{classId}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.assignmentSummaryRow}>
                    <View style={styles.assignmentSummaryBox}><Text style={styles.assignmentSummaryValue}>{visibleAssignmentStudents.length}</Text><Text style={styles.assignmentSummaryLabel}>Visible Students</Text></View>
                    <View style={styles.assignmentSummaryBox}><Text style={styles.assignmentSummaryValue}>{visibleDirtyCount}</Text><Text style={styles.assignmentSummaryLabel}>Unsaved Changes</Text></View>
                  </View>

                  <View style={styles.bulkAssignmentRow}>
                    <TouchableOpacity onPress={handleSaveAllVisible} style={[styles.btnPrimary, (bulkSaving || visibleDirtyCount === 0) && styles.dimmedButton]} activeOpacity={0.84} disabled={bulkSaving || visibleDirtyCount === 0}>
                      {bulkSaving ? <ActivityIndicator size="small" color={theme.colors.textOnDark} /> : <CheckCircle2 size={16} color={theme.colors.textOnDark} />}
                      <Text style={styles.btnPrimaryText}>{bulkSaving ? "Saving..." : "Save All Visible"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClearVisible} style={[styles.btnOutlineWide, clearingVisible && styles.dimmedButton]} activeOpacity={0.84} disabled={clearingVisible}>
                      <Link2Off size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.btnOutlineWideText}>Clear Visible</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {visibleAssignmentStudents.map((student) => {
                  const form = assignmentForm[student.student_uid] || { tableId: "", seatNumber: "" };
                  const initialForm = initialAssignmentForm[student.student_uid] || { tableId: "", seatNumber: "" };
                  const isDirty = !isSameForm(form, initialForm);
                  const isSaving = !!rowSavingMap[student.student_uid];
                  const assignedTable = tables.find((t) => t.id === form.tableId);
                  const seatOptions = assignedTable ? Array.from({ length: assignedTable.active_seat_count }, (_, i) => ({ label: `Seat ${i + 1}`, value: String(i + 1) })) : [];

                  return (
                    <View key={student.student_uid} style={styles.card}>
                      <View style={styles.assignmentCardHeader}>
                        <View style={styles.cardHeaderTextWrap}>
                          <Text style={styles.cardTitle}>{student.name}</Text>
                          <Text style={styles.cardDesc}>{student.class_id} • CIC: {student.cic || "—"}</Text>
                        </View>
                        <View style={[styles.changeBadge, isDirty ? styles.changeBadgeActive : styles.changeBadgeIdle]}><Text style={[styles.changeBadgeText, isDirty ? styles.changeBadgeTextActive : styles.changeBadgeTextIdle]}>{isDirty ? "Edited" : "Saved"}</Text></View>
                      </View>

                      <View style={styles.formGrid}>
                        <View style={styles.inputWrap}>
                          <Text style={styles.label}>Select Table</Text>
                          <CustomPicker value={form.tableId} placeholder="Choose Table" options={tables.filter((t) => t.is_active).map((t) => ({ label: t.table_name || `Table ${t.table_number}`, value: t.id }))} onSelect={(val) => setAssignmentForm((prev) => ({ ...prev, [student.student_uid]: { tableId: val, seatNumber: "" } }))} />
                        </View>
                        <View style={styles.inputWrap}>
                          <Text style={styles.label}>Select Seat</Text>
                          <CustomPicker disabled={!form.tableId} value={form.seatNumber} placeholder="Choose Seat" options={seatOptions} onSelect={(val) => setAssignmentForm((prev) => ({ ...prev, [student.student_uid]: { ...prev[student.student_uid], seatNumber: val } }))} />
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity onPress={() => saveAssignmentForStudent(student.student_uid)} style={[styles.btnPrimary, (!isDirty || isSaving) && styles.dimmedButton]} activeOpacity={0.84} disabled={!isDirty || isSaving}>
                          {isSaving ? <ActivityIndicator size="small" color={theme.colors.textOnDark} /> : <Save size={16} color={theme.colors.textOnDark} />}
                          <Text style={styles.btnPrimaryText}>{isSaving ? "Saving..." : "Save"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAssignmentForm((prev) => ({ ...prev, [student.student_uid]: { tableId: "", seatNumber: "" } }))} style={styles.btnOutline} activeOpacity={0.84}>
                          <Link2Off size={16} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <FoodSelection foods={foods} students={students} preferences={foodPreferences} onRefresh={fetchData} />
            )}
          </ScrollView>
          <FloatingScrollToggle direction={scrollDirection} onPress={handleFloatingPress} />
        </View>
      </SafeAreaView>
    </ChefSettingsPasswordGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, position: "relative" },
  content: { padding: theme.spacing.lg, paddingBottom: 90 },

  loadingScreen: { flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: theme.spacing.lg },
  loadingCard: { minWidth: 180, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.medium },
  loadingText: { marginTop: 12, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 18, fontFamily: "MullerMedium" },

  heroCard: { padding: 20, borderRadius: 28, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 20, ...theme.shadows.medium },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.primaryTint },
  heroPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accentSoft, marginBottom: 12 },
  heroPillText: { color: theme.colors.accent, fontSize: 12, lineHeight: 16, fontFamily: "MullerBold" },
  heroTitle: { color: theme.colors.text, fontSize: 30, lineHeight: 36, fontFamily: "MullerBold" },
  heroSubtitle: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: "MullerMedium", marginTop: 8 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  miniStatCard: { flex: 1, minWidth: "47%", flexDirection: "row", alignItems: "center", backgroundColor: theme.colors.surface, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
  miniStatIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.primaryTint, alignItems: "center", justifyContent: "center" },
  miniStatTextWrap: { flex: 1, marginLeft: 12 },
  miniStatValue: { fontSize: 16, lineHeight: 20, fontFamily: "MullerBold", color: theme.colors.text },
  miniStatLabel: { fontSize: 12, lineHeight: 16, fontFamily: "MullerMedium", color: theme.colors.textSecondary, marginTop: 4 },

  tabsRow: { flexDirection: "row", backgroundColor: theme.colors.surfaceSoft, borderRadius: 18, padding: 5, marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  tab: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  tabActive: { backgroundColor: theme.colors.primary, ...theme.shadows.soft },
  tabText: { fontSize: 14, lineHeight: 18, fontFamily: "MullerBold", color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.textOnDark },

  transitionCard: { backgroundColor: theme.colors.surface, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 28, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", gap: 10, ...theme.shadows.soft },
  transitionText: { marginTop: 10, color: theme.colors.textSecondary, fontSize: 14, lineHeight: 18, fontFamily: "MullerMedium" },

  stack: { gap: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadows.soft },
  sectionTitleWrap: { marginBottom: 14 },
  sectionTitle: { fontSize: 18, lineHeight: 23, fontFamily: "MullerBold", color: theme.colors.text },
  sectionSubtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, fontFamily: "MullerMedium", color: theme.colors.textSecondary },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 },
  cardHeaderTextWrap: { flex: 1 },
  cardTitle: { fontSize: 16, lineHeight: 20, fontFamily: "MullerBold", color: theme.colors.text },
  cardDesc: { fontSize: 12, lineHeight: 17, fontFamily: "MullerMedium", color: theme.colors.textSecondary, marginTop: 4 },

  createRow: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  createInputWrap: { flex: 1 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  inputWrap: { flex: 1, minWidth: "47%" },
  label: { fontSize: 12, lineHeight: 16, fontFamily: "MullerMedium", color: theme.colors.textSecondary, marginBottom: 6 },
  input: { minHeight: 48, backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 12, fontFamily: "MullerMedium", color: theme.colors.text, fontSize: 14, lineHeight: 18 },

  cardActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  btnPrimary: { flex: 1, flexDirection: "row", minHeight: 48, backgroundColor: theme.colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8 },
  btnPrimaryText: { color: theme.colors.textOnDark, fontFamily: "MullerBold", fontSize: 14, lineHeight: 18 },
  btnDanger: { height: 48, width: 48, backgroundColor: theme.colors.errorSoft, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(220,38,38,0.14)" },
  btnOutline: { height: 48, width: 48, backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  btnOutlineWide: { flex: 1, minHeight: 48, backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  btnOutlineWideText: { color: theme.colors.textSecondary, fontFamily: "MullerBold", fontSize: 14, lineHeight: 18 },
  dimmedButton: { opacity: 0.6 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  badgeActive: { backgroundColor: theme.colors.successSoft, borderColor: "rgba(22,163,74,0.14)" },
  badgeInactive: { backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border },
  badgeTextActive: { color: theme.colors.success, fontSize: 12, lineHeight: 16, fontFamily: "MullerBold" },
  badgeTextInactive: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 16, fontFamily: "MullerBold" },

  classTabsRow: { gap: 8, paddingBottom: 12 },
  classChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border },
  classChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  classChipText: { color: theme.colors.primary, fontSize: 13, lineHeight: 17, fontFamily: "MullerBold" },
  classChipTextActive: { color: theme.colors.textOnDark },

  assignmentSummaryRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  assignmentSummaryBox: { flex: 1, borderRadius: 16, backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
  assignmentSummaryValue: { color: theme.colors.text, fontSize: 18, lineHeight: 22, fontFamily: "MullerBold" },
  assignmentSummaryLabel: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 16, fontFamily: "MullerMedium", marginTop: 4 },

  bulkAssignmentRow: { flexDirection: "row", gap: 10 },
  assignmentCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },

  changeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  changeBadgeActive: { backgroundColor: theme.colors.accentSoft, borderColor: "rgba(245,158,11,0.18)" },
  changeBadgeIdle: { backgroundColor: theme.colors.successSoft, borderColor: "rgba(22,163,74,0.14)" },
  changeBadgeText: { fontSize: 11, lineHeight: 14, fontFamily: "MullerBold" },
  changeBadgeTextActive: { color: theme.colors.accent },
  changeBadgeTextIdle: { color: theme.colors.success },

  pickerBtn: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.surfaceSoft, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, paddingHorizontal: 12 },
  pickerDisabled: { opacity: 0.5 },
  pickerText: { fontFamily: "MullerMedium", color: theme.colors.text, fontSize: 14, lineHeight: 18, flex: 1, paddingRight: 10 },
  pickerPlaceholder: { fontFamily: "MullerMedium", color: theme.colors.textMuted, fontSize: 14, lineHeight: 18, flex: 1, paddingRight: 10 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.46)", justifyContent: "flex-end" },
  modalContentList: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "60%", paddingBottom: 30, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.colors.border },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceSoft },
  modalTitle: { fontSize: 18, lineHeight: 23, fontFamily: "MullerBold", color: theme.colors.text },
  modalCloseBtn: { width: 40, height: 40, backgroundColor: theme.colors.surfaceSoft, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border },
  pickerItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceSoft },
  pickerItemText: { fontSize: 16, lineHeight: 20, fontFamily: "MullerMedium", color: theme.colors.text },
  pickerItemTextActive: { fontFamily: "MullerBold", color: theme.colors.primary },
  heroTopLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroActionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroActionButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroActionButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
});