import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import {
  AlertCircle,
  ChefHat,
  RefreshCcw,
  Users,
  UtensilsCrossed,
  Sun,
  MoonStar,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react-native";

type MealTab = "day" | "noon" | "night";

interface AdminProfile {
  uid: string;
  role: string;
  name: string | null;
}

interface KitchenTable {
  id: string;
  table_number: number;
  table_name: string | null;
  is_active: boolean;
  row_number: number;
  row_position: "left" | "middle" | "right";
  orientation: "horizontal" | "vertical";
  active_seat_count: number;
  display_order: number;
}

interface KitchenStudentLite {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface KitchenSeatAssignment {
  id: string;
  student_uid: string;
  kitchen_table_id: string;
  seat_number: number;
}

interface TableSeatView {
  seatNumber: number;
  enabled: boolean;
  student: KitchenStudentLite | null;
  present: boolean | null;
  isTemporary: boolean;
  temporaryKind: "present" | "absent" | null;
}

interface TableViewData {
  table: KitchenTable;
  seats: TableSeatView[];
  presentCount: number;
  absentCount: number;
  totalNeededPlates: number;
}

interface SelectedSeatState {
  tableId: string;
  seatNumber: number;
}

interface TempOverride {
  present: boolean;
  expiresAt: number;
}

const TEMP_OVERRIDE_STORAGE_KEY = "chef_dashboard_temp_presence_overrides_v1";
const TEMP_OVERRIDE_DURATION_MS = 2 * 60 * 60 * 1000;

function getMealPresence(student: KitchenStudentLite | null, meal: MealTab): boolean | null {
  if (!student) return null;
  if (meal === "day") return student.day_present;
  if (meal === "noon") return student.noon_present;
  return student.night_present;
}

function toNameCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isInitialPart(value: string) {
  const clean = value.replace(/\./g, "").trim();
  return clean.length <= 1;
}

function getSeatDisplayName(fullName: string | null | undefined) {
  if (!fullName?.trim()) return "Empty";

  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "Empty";
  if (parts.length === 1) return toNameCase(parts[0]);

  const first = parts[0].toLowerCase();

  const commonFirstReligiousNames = new Set([
    "muhammed",
    "mohammed",
    "muhamad",
    "muhammad",
    "mohamad",
    "mohammad",
    "mohd",
    "md",
  ]);

  if (commonFirstReligiousNames.has(first)) {
    const secondMeaningful = parts.find(
      (part, index) => index > 0 && !isInitialPart(part)
    );
    if (secondMeaningful) return toNameCase(secondMeaningful);
  }

  return toNameCase(parts[0]);
}

function getOverrideKey(studentUid: string, meal: MealTab) {
  return `${studentUid}__${meal}`;
}

function cleanExpiredOverrides(input: Record<string, TempOverride>) {
  const now = Date.now();
  const cleaned: Record<string, TempOverride> = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value.expiresAt > now) {
      cleaned[key] = value;
    }
  });

  return cleaned;
}

function getEffectiveSeatPresence(
  student: KitchenStudentLite | null,
  meal: MealTab,
  overrides: Record<string, TempOverride>
): {
  present: boolean | null;
  isTemporary: boolean;
  temporaryKind: "present" | "absent" | null;
} {
  if (!student) {
    return {
      present: null,
      isTemporary: false,
      temporaryKind: null,
    };
  }

  const override = overrides[getOverrideKey(student.student_uid, meal)];

  if (override && override.expiresAt > Date.now()) {
    return {
      present: override.present,
      isTemporary: true,
      temporaryKind: override.present ? "present" : "absent",
    };
  }

  return {
    present: getMealPresence(student, meal),
    isTemporary: false,
    temporaryKind: null,
  };
}

function formatTimeLeft(expiresAt: number) {
  const diff = Math.max(0, expiresAt - Date.now());
  const totalMinutes = Math.ceil(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
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
        <View style={styles.statCardIconWrap}>{icon}</View>
      </View>
    </View>
  );
}

function SeatBubble({
  seat,
  onMobileClick,
}: {
  seat: TableSeatView;
  onMobileClick: (seat: TableSeatView) => void;
}) {
  const hasStudent = !!seat.student;

  let bgColor = theme.colors.surfaceSoft;
  let borderColor = theme.colors.border;
  let textColor = theme.colors.textMuted;

  if (hasStudent) {
    if (seat.isTemporary && seat.present === false) {
      bgColor = "#F59E0B";
      borderColor = "#F59E0B";
      textColor = "#FFFFFF";
    } else if (seat.present) {
      bgColor = theme.colors.success;
      borderColor = theme.colors.success;
      textColor = "#FFFFFF";
    } else {
      bgColor = theme.colors.error;
      borderColor = theme.colors.error;
      textColor = "#FFFFFF";
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onMobileClick(seat)}
      style={[styles.seatBubble, { backgroundColor: bgColor, borderColor }]}
    >
      <Text style={[styles.seatBubbleNum, { color: textColor }]}>
        S{seat.seatNumber}
      </Text>
      <Text
        style={[styles.seatBubbleName, { color: textColor }]}
        numberOfLines={1}
      >
        {seat.student ? getSeatDisplayName(seat.student.name) : "Empty"}
      </Text>
    </TouchableOpacity>
  );
}

function TableCenter({ tableData }: { tableData: TableViewData }) {
  return (
    <View style={styles.tableCenter}>
      <Text style={styles.tableCenterTitle}>
        {tableData.table.table_name || `Table ${tableData.table.table_number}`}
      </Text>

      <View style={styles.platesNeededBox}>
        <Text style={styles.platesNeededLabel}>Plates Needed</Text>
        <Text style={styles.platesNeededValue}>{tableData.totalNeededPlates}</Text>
      </View>

      <View style={styles.tableBadgesRow}>
        <View style={[styles.badge, { backgroundColor: theme.colors.success }]}>
          <Text style={styles.badgeText}>Present {tableData.presentCount}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
          <Text style={styles.badgeText}>Absent {tableData.absentCount}</Text>
        </View>
      </View>
    </View>
  );
}

function TableLayout({
  tableData,
  onMobileSeatClick,
}: {
  tableData: TableViewData;
  onMobileSeatClick: (seat: TableSeatView) => void;
}) {
  const isVertical = tableData.table.orientation === "vertical";
  const seatMap = new Map<number, TableSeatView>(
    tableData.seats.map((seat) => [seat.seatNumber, seat])
  );
  const count = tableData.table.active_seat_count;

  let topSeats: number[] = [];
  let bottomSeats: number[] = [];
  let leftSeats: number[] = [];
  let rightSeats: number[] = [];

  if (isVertical) {
    if (count <= 8) {
      leftSeats = [1, 2, 3, 4];
      rightSeats = [5, 6, 7, 8];
    } else if (count === 9) {
      leftSeats = [1, 2, 3, 4];
      rightSeats = [5, 6, 7, 8];
      topSeats = [9];
    } else {
      leftSeats = [1, 2, 3, 4];
      rightSeats = [5, 6, 7, 8];
      topSeats = [9];
      bottomSeats = [10];
    }
  } else {
    if (count <= 8) {
      topSeats = [1, 2, 3, 4];
      bottomSeats = [5, 6, 7, 8];
    } else if (count === 9) {
      topSeats = [1, 2, 3, 4];
      bottomSeats = [5, 6, 7, 8];
      rightSeats = [9];
    } else {
      topSeats = [1, 2, 3, 4];
      bottomSeats = [5, 6, 7, 8];
      leftSeats = [10];
      rightSeats = [9];
    }
  }

  const renderSeatRow = (seats: number[], isRow: boolean) => (
    <View style={isRow ? styles.seatRow : styles.seatCol}>
      {seats
        .filter((n) => seatMap.has(n))
        .map((n) => (
          <SeatBubble
            key={n}
            seat={seatMap.get(n)!}
            onMobileClick={onMobileSeatClick}
          />
        ))}
    </View>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tableScrollArea}
    >
      {isVertical ? (
        <View style={styles.verticalWrap}>
          {topSeats.length > 0 && renderSeatRow(topSeats, true)}
          <View style={styles.horizontalWrap}>
            {renderSeatRow(leftSeats, false)}
            <TableCenter tableData={tableData} />
            {renderSeatRow(rightSeats, false)}
          </View>
          {bottomSeats.length > 0 && renderSeatRow(bottomSeats, true)}
        </View>
      ) : (
        <View style={styles.horizontalWrap}>
          {leftSeats.length > 0 && renderSeatRow(leftSeats, false)}
          <View style={styles.verticalWrap}>
            {renderSeatRow(topSeats, true)}
            <TableCenter tableData={tableData} />
            {renderSeatRow(bottomSeats, true)}
          </View>
          {rightSeats.length > 0 && renderSeatRow(rightSeats, false)}
        </View>
      )}
    </ScrollView>
  );
}

export default function ChefDashboardPage() {
  const { user: authUser } = useUserData();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [tables, setTables] = useState<KitchenTable[]>([]);
  const [assignments, setAssignments] = useState<KitchenSeatAssignment[]>([]);
  const [students, setStudents] = useState<KitchenStudentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [mealTab, setMealTab] = useState<MealTab>("day");
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatState | null>(null);
  const [tempOverrides, setTempOverrides] = useState<Record<string, TempOverride>>(
    {}
  );
  const [overrideLoaded, setOverrideLoaded] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!authUser?.id) return;
    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("uid, role, name")
        .eq("uid", authUser.id)
        .single();

      if (error) throw error;
      if (!data || !["chef", "officer"].includes(data.role)) {
        throw new Error("Not allowed");
      }

      setProfile(data as AdminProfile);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setProfileLoading(false);
    }
  }, [authUser?.id]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const [{ data: tablesData }, { data: assignmentsData }, { data: studentsData }] =
        await Promise.all([
          supabase
            .from("kitchen_tables")
            .select("*")
            .eq("is_active", true)
            .order("row_number")
            .order("display_order"),
          supabase.from("kitchen_seat_assignments").select("*"),
          supabase
            .from("kitchen_students")
            .select(
              "student_uid, name, cic, class_id, day_present, noon_present, night_present"
            ),
        ]);

      setTables((tablesData || []) as KitchenTable[]);
      setAssignments((assignmentsData || []) as KitchenSeatAssignment[]);
      setStudents((studentsData || []) as KitchenStudentLite[]);
    } catch (err: any) {
      Alert.alert("Data Error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTempOverrides = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(TEMP_OVERRIDE_STORAGE_KEY);
      if (!raw) {
        setTempOverrides({});
        setOverrideLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, TempOverride>;
      const cleaned = cleanExpiredOverrides(parsed);

      setTempOverrides(cleaned);
      await AsyncStorage.setItem(
        TEMP_OVERRIDE_STORAGE_KEY,
        JSON.stringify(cleaned)
      );
    } catch {
      setTempOverrides({});
    } finally {
      setOverrideLoaded(true);
    }
  }, []);

  const saveTempOverrides = useCallback(
    async (next: Record<string, TempOverride>) => {
      const cleaned = cleanExpiredOverrides(next);
      setTempOverrides(cleaned);
      await AsyncStorage.setItem(
        TEMP_OVERRIDE_STORAGE_KEY,
        JSON.stringify(cleaned)
      );
    },
    []
  );

  const setTemporarySeatStatus = useCallback(
    async (studentUid: string, present: boolean) => {
      const key = getOverrideKey(studentUid, mealTab);

      const next = {
        ...tempOverrides,
        [key]: {
          present,
          expiresAt: Date.now() + TEMP_OVERRIDE_DURATION_MS,
        },
      };

      await saveTempOverrides(next);
    },
    [mealTab, tempOverrides, saveTempOverrides]
  );

  useEffect(() => {
    if (authUser?.id) fetchProfile();
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) fetchDashboardData();
  }, [profile, fetchDashboardData]);

  useEffect(() => {
    loadTempOverrides();
  }, [loadTempOverrides]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const cleaned = cleanExpiredOverrides(tempOverrides);
      const currentKeys = Object.keys(tempOverrides);
      const cleanedKeys = Object.keys(cleaned);

      if (currentKeys.length !== cleanedKeys.length) {
        setTempOverrides(cleaned);
        await AsyncStorage.setItem(
          TEMP_OVERRIDE_STORAGE_KEY,
          JSON.stringify(cleaned)
        );
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [tempOverrides]);

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.student_uid, s])),
    [students]
  );

  const tableDataList = useMemo<TableViewData[]>(() => {
    return tables.map((table) => {
      const seatNumbers = Array.from(
        { length: table.active_seat_count },
        (_, i) => i + 1
      );
      const tableAssignments = assignments.filter(
        (a) => a.kitchen_table_id === table.id
      );

      const seats: TableSeatView[] = seatNumbers.map((seatNumber) => {
        const assignment = tableAssignments.find((a) => a.seat_number === seatNumber);
        const student = assignment
          ? studentMap.get(assignment.student_uid) || null
          : null;

        const effective = getEffectiveSeatPresence(student, mealTab, tempOverrides);

        return {
          seatNumber,
          enabled: true,
          student,
          present: effective.present,
          isTemporary: effective.isTemporary,
          temporaryKind: effective.temporaryKind,
        };
      });

      const assignedSeats = seats.filter((s) => s.student);
      const presentCount = assignedSeats.filter((s) => s.present === true).length;
      const absentCount = assignedSeats.filter((s) => s.present === false).length;

      return {
        table,
        seats,
        presentCount,
        absentCount,
        totalNeededPlates: presentCount,
      };
    });
  }, [tables, assignments, studentMap, mealTab, tempOverrides]);

  const groupedRows = useMemo(() => {
    const rows = new Map<number, TableViewData[]>();

    for (const table of tableDataList) {
      const current = rows.get(table.table.row_number) || [];
      current.push(table);
      rows.set(table.table.row_number, current);
    }

    return Array.from(rows.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rowNumber, rowTables]) => ({
        rowNumber,
        tables: rowTables.sort((a, b) => {
          const orderMap = { left: 1, middle: 2, right: 3 };
          return orderMap[a.table.row_position] - orderMap[b.table.row_position];
        }),
      }));
  }, [tableDataList]);

  const summary = useMemo(() => {
    const assignedStudentIds = new Set(assignments.map((a) => a.student_uid));
    const uniqueStudents = Array.from(assignedStudentIds)
      .map((id) => studentMap.get(id))
      .filter(Boolean) as KitchenStudentLite[];

    return {
      totalMembers: uniqueStudents.length,
      presentMembers: uniqueStudents.filter(
        (s) => getEffectiveSeatPresence(s, mealTab, tempOverrides).present === true
      ).length,
      absentMembers: uniqueStudents.filter(
        (s) => getEffectiveSeatPresence(s, mealTab, tempOverrides).present === false
      ).length,
    };
  }, [assignments, studentMap, mealTab, tempOverrides]);

  const selectedSeatData = useMemo(() => {
    if (!selectedSeat) return null;

    const table = tableDataList.find((t) => t.table.id === selectedSeat.tableId);
    if (!table) return null;

    return table.seats.find((s) => s.seatNumber === selectedSeat.seatNumber) || null;
  }, [selectedSeat, tableDataList]);

  const selectedSeatOverride = useMemo(() => {
    if (!selectedSeatData?.student) return null;
    const key = getOverrideKey(selectedSeatData.student.student_uid, mealTab);
    return tempOverrides[key] || null;
  }, [selectedSeatData, tempOverrides, mealTab]);

  if (profileLoading || loading || !overrideLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Kitchen...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ChefHat size={28} color={theme.colors.primary} />
              <Text style={styles.heroTitle}>Chef Dashboard</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              Live plate count for{" "}
              {mealTab === "day" ? "Day" : mealTab === "noon" ? "Noon" : "Night"}
            </Text>
          </View>

          <TouchableOpacity onPress={fetchDashboardData} style={styles.refreshBtn}>
            <RefreshCcw size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setMealTab("day")}
            style={[styles.tab, mealTab === "day" && styles.tabActive]}
          >
            <Sun
              size={16}
              color={mealTab === "day" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[styles.tabText, mealTab === "day" && styles.tabTextActive]}
            >
              Day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMealTab("noon")}
            style={[styles.tab, mealTab === "noon" && styles.tabActive]}
          >
            <UtensilsCrossed
              size={16}
              color={mealTab === "noon" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[styles.tabText, mealTab === "noon" && styles.tabTextActive]}
            >
              Noon
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMealTab("night")}
            style={[styles.tab, mealTab === "night" && styles.tabActive]}
          >
            <MoonStar
              size={16}
              color={mealTab === "night" ? "#fff" : theme.colors.textSecondary}
            />
            <Text
              style={[styles.tabText, mealTab === "night" && styles.tabTextActive]}
            >
              Night
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total Members"
            value={summary.totalMembers}
            description="Assigned to tables"
            icon={<Users size={20} color={theme.colors.primary} />}
          />
          <StatCard
            title="Present Members"
            value={summary.presentMembers}
            description="Will eat"
            icon={<UtensilsCrossed size={20} color={theme.colors.primary} />}
          />
          <StatCard
            title="Absent Members"
            value={summary.absentMembers}
            description="Will not eat"
            icon={<AlertCircle size={20} color={theme.colors.primary} />}
          />
        </View>

        {groupedRows.length === 0 ? (
          <View style={styles.emptyCard}>
            <ChefHat size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No tables found</Text>
            <Text style={styles.emptyDesc}>Set up tables in chef settings.</Text>
          </View>
        ) : (
          groupedRows.map((row) => (
            <View key={row.rowNumber} style={styles.rowSection}>
              <Text style={styles.rowTitle}>Row {row.rowNumber}</Text>

              {row.tables.map((tableData) => (
                <View key={tableData.table.id} style={styles.tableCard}>
                  <View style={styles.tableCardHeader}>
                    <Text style={styles.tableCardTitle}>
                      {tableData.table.table_name || `Table ${tableData.table.table_number}`}
                    </Text>
                  </View>

                  <TableLayout
                    tableData={tableData}
                    onMobileSeatClick={(seat) =>
                      setSelectedSeat({
                        tableId: tableData.table.id,
                        seatNumber: seat.seatNumber,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selectedSeat}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSeat(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Seat {selectedSeatData?.seatNumber ?? ""}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedSeat(null)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {!selectedSeatData?.student ? (
              <Text style={styles.modalText}>Empty seat</Text>
            ) : (
              <View style={styles.modalBodyStack}>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Name: </Text>
                  {selectedSeatData.student.name}
                </Text>

                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Class: </Text>
                  {selectedSeatData.student.class_id}
                </Text>

                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>CIC: </Text>
                  {selectedSeatData.student.cic || "—"}
                </Text>

                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Status: </Text>
                  <Text
                    style={{
                      color:
                        selectedSeatData.isTemporary && selectedSeatData.present === false
                          ? "#F59E0B"
                          : selectedSeatData.present
                          ? theme.colors.success
                          : theme.colors.error,
                      fontFamily: "MullerBold",
                    }}
                  >
                    {selectedSeatData.isTemporary
                      ? selectedSeatData.present
                        ? "Temporary Present"
                        : "Temporary Absent"
                      : selectedSeatData.present
                      ? "Present"
                      : "Absent"}
                  </Text>
                </Text>

                {selectedSeatOverride ? (
                  <View style={styles.tempInfoCard}>
                    <Text style={styles.tempInfoText}>
                      Temporary override active for {formatTimeLeft(selectedSeatOverride.expiresAt)}.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.tempActionRow}>
                  <TouchableOpacity
                    style={styles.tempPresentButton}
                    activeOpacity={0.84}
                    onPress={async () => {
                      if (!selectedSeatData.student) return;
                      await setTemporarySeatStatus(
                        selectedSeatData.student.student_uid,
                        true
                      );
                    }}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.tempPresentButtonText}>
                      Temporary Present
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tempAbsentButton}
                    activeOpacity={0.84}
                    onPress={async () => {
                      if (!selectedSeatData.student) return;
                      await setTemporarySeatStatus(
                        selectedSeatData.student.student_uid,
                        false
                      );
                    }}
                  >
                    <XCircle size={16} color="#FFFFFF" />
                    <Text style={styles.tempAbsentButtonText}>
                      Temporary Absent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    paddingBottom: 60,
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontFamily: "MullerBold",
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: "MullerMedium",
    marginTop: 4,
  },
  refreshBtn: {
    padding: 10,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  tabsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },

  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statCardTextWrap: {
    flex: 1,
  },
  statCardTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontFamily: "MullerMedium",
  },
  statCardValue: {
    fontSize: 24,
    color: theme.colors.text,
    fontFamily: "MullerBold",
    marginVertical: 4,
  },
  statCardDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statCardIconWrap: {
    backgroundColor: theme.colors.primaryTint,
    padding: 10,
    borderRadius: theme.radius.md,
  },

  emptyCard: {
    alignItems: "center",
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "MullerBold",
    marginTop: 12,
    color: theme.colors.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  rowSection: {
    marginBottom: 24,
  },
  rowTitle: {
    fontSize: 20,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    marginBottom: 12,
  },

  tableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  tableCardHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
    paddingBottom: 12,
  },
  tableCardTitle: {
    fontSize: 16,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },

  tableScrollArea: {
    paddingVertical: 10,
    alignItems: "center",
    minWidth: "100%",
  },
  horizontalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  verticalWrap: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  seatRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  seatCol: {
    flexDirection: "column",
    gap: 8,
    justifyContent: "center",
  },

  seatBubble: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  seatBubbleNum: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "MullerBold",
    opacity: 0.95,
  },
  seatBubbleName: {
    fontSize: 8,
    lineHeight: 10,
    fontFamily: "MullerMedium",
    textAlign: "center",
    marginTop: 1,
    maxWidth: "100%",
  },

  tableCenter: {
    width: 160,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: "center",
  },
  tableCenterTitle: {
    fontSize: 16,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    textAlign: "center",
  },
  platesNeededBox: {
    backgroundColor: "#fef08a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    alignItems: "center",
    width: "100%",
  },
  platesNeededLabel: {
    fontSize: 10,
    fontFamily: "MullerBold",
    color: "#000",
    textTransform: "uppercase",
  },
  platesNeededValue: {
    fontSize: 28,
    fontFamily: "MullerBold",
    color: "#000",
  },
  tableBadgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "MullerBold",
    color: "#fff",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  modalCloseBtn: {
    padding: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
  },
  modalBodyStack: {
    gap: 8,
  },
  modalText: {
    fontSize: 15,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  modalLabel: {
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },

  tempInfoCard: {
    marginTop: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.18)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tempInfoText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
    color: "#92400E",
  },

  tempActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  tempPresentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tempPresentButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "MullerBold",
  },
  tempAbsentButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tempAbsentButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "MullerBold",
  },
});