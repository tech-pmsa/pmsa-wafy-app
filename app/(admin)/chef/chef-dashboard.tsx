import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  Sparkles,
} from "lucide-react-native";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";

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
}

interface TableViewData {
  table: KitchenTable;
  seats: TableSeatView[];
  presentCount: number;
  absentCount: number;
  totalNeededPlates: number;
}

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

  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

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
    "muhamet",
    "mohd",
    "md",
    "syed",
    "sayyid",
    "ahammed",
    "abdul",
    "abdhul",
    "al",
    "mohamed",
    "ahmad",
  ]);

  if (commonFirstReligiousNames.has(first)) {
    const secondMeaningful = parts.find((part, index) => index > 0 && !isInitialPart(part));
    if (secondMeaningful) return toNameCase(secondMeaningful);
  }

  if (!isInitialPart(parts[1])) {
    return toNameCase(parts[0]);
  }

  return toNameCase(parts[0]);
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  tone = "primary",
}: {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  description: string;
  tone?: "primary" | "success" | "danger";
}) {
  const toneMap = {
    primary: {
      bg: theme.colors.primarySoft,
      color: theme.colors.primary,
    },
    success: {
      bg: theme.colors.successSoft,
      color: theme.colors.success,
    },
    danger: {
      bg: theme.colors.errorSoft,
      color: theme.colors.error,
    },
  } as const;

  const current = toneMap[tone];

  return (
    <View style={styles.statCard}>
      <View style={styles.statTopRow}>
        <View style={styles.statTextWrap}>
          <Text style={styles.statLabel}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statDescription}>{description}</Text>
        </View>

        <View style={[styles.statIconWrap, { backgroundColor: current.bg }]}>
          <Icon size={18} color={current.color} />
        </View>
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
    if (seat.present) {
      bgColor = theme.colors.success;
      borderColor = theme.colors.success;
      textColor = theme.colors.textOnDark;
    } else {
      bgColor = theme.colors.error;
      borderColor = theme.colors.error;
      textColor = theme.colors.textOnDark;
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onMobileClick(seat)}
      style={[styles.seatBubble, { backgroundColor: bgColor, borderColor }]}
    >
      <Text style={[styles.seatBubbleNum, { color: textColor }]}>
        S{seat.seatNumber}
      </Text>
      <Text style={[styles.seatBubbleName, { color: textColor }]} numberOfLines={1}>
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
        <View style={[styles.badge, styles.badgeSuccess]}>
          <Text style={styles.badgeText}>Present {tableData.presentCount}</Text>
        </View>
        <View style={[styles.badge, styles.badgeDanger]}>
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
          <SeatBubble key={n} seat={seatMap.get(n)!} onMobileClick={onMobileSeatClick} />
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
  const scrollRef = useRef<ScrollView>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [tables, setTables] = useState<KitchenTable[]>([]);
  const [assignments, setAssignments] = useState<KitchenSeatAssignment[]>([]);
  const [students, setStudents] = useState<KitchenStudentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [mealTab, setMealTab] = useState<MealTab>("day");
  const [selectedSeat, setSelectedSeat] = useState<TableSeatView | null>(null);

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

  useEffect(() => {
    if (authUser?.id) fetchProfile();
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) fetchDashboardData();
  }, [profile, fetchDashboardData]);

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
        const student = assignment ? studentMap.get(assignment.student_uid) || null : null;
        const present = getMealPresence(student, mealTab);
        return { seatNumber, enabled: true, student, present };
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
  }, [tables, assignments, studentMap, mealTab]);

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
      presentMembers: uniqueStudents.filter((s) => getMealPresence(s, mealTab) === true)
        .length,
      absentMembers: uniqueStudents.filter((s) => getMealPresence(s, mealTab) === false)
        .length,
    };
  }, [assignments, studentMap, mealTab]);

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

  if (profileLoading || loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Kitchen...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
                <ChefHat size={28} color={theme.colors.primary} />
              </View>

              <TouchableOpacity onPress={fetchDashboardData} style={styles.refreshBtn}>
                <RefreshCcw size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroPill}>
              <Sparkles size={13} color={theme.colors.accent} />
              <Text style={styles.heroPillText}>Kitchen Overview</Text>
            </View>

            <Text style={styles.heroTitle}>Kitchen Dashboard</Text>
            <Text style={styles.heroSubtitle}>
              Live plate count and table-wise meal status for{" "}
              {mealTab === "day" ? "Day" : mealTab === "noon" ? "Noon" : "Night"}.
            </Text>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => setMealTab("day")}
              style={[styles.tab, mealTab === "day" && styles.tabActive]}
              activeOpacity={0.84}
            >
              <Sun
                size={16}
                color={mealTab === "day" ? theme.colors.textOnDark : theme.colors.textSecondary}
              />
              <Text style={[styles.tabText, mealTab === "day" && styles.tabTextActive]}>
                BreakFast
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMealTab("noon")}
              style={[styles.tab, mealTab === "noon" && styles.tabActive]}
              activeOpacity={0.84}
            >
              <UtensilsCrossed
                size={16}
                color={
                  mealTab === "noon" ? theme.colors.textOnDark : theme.colors.textSecondary
                }
              />
              <Text style={[styles.tabText, mealTab === "noon" && styles.tabTextActive]}>
                Lunch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMealTab("night")}
              style={[styles.tab, mealTab === "night" && styles.tabActive]}
              activeOpacity={0.84}
            >
              <MoonStar
                size={16}
                color={
                  mealTab === "night" ? theme.colors.textOnDark : theme.colors.textSecondary
                }
              />
              <Text style={[styles.tabText, mealTab === "night" && styles.tabTextActive]}>
                Dinner
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              title="Total Members"
              value={summary.totalMembers}
              description="Assigned to tables"
              icon={Users}
              tone="primary"
            />
            <StatCard
              title="Present Members"
              value={summary.presentMembers}
              description="Will eat"
              icon={UtensilsCrossed}
              tone="success"
            />
            <StatCard
              title="Absent Members"
              value={summary.absentMembers}
              description="Will not eat"
              icon={AlertCircle}
              tone="danger"
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

                <View style={styles.tableStack}>
                  {row.tables.map((tableData) => (
                    <View key={tableData.table.id} style={styles.tableCard}>
                      <View style={styles.tableCardHeader}>
                        <Text style={styles.tableCardTitle}>
                          {tableData.table.table_name || `Table ${tableData.table.table_number}`}
                        </Text>
                      </View>
                      <TableLayout tableData={tableData} onMobileSeatClick={setSelectedSeat} />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <FloatingScrollToggle
          direction={scrollDirection}
          onPress={handleFloatingPress}
        />
      </View>

      <Modal
        visible={!!selectedSeat}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSeat(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seat {selectedSeat?.seatNumber}</Text>
              <TouchableOpacity
                onPress={() => setSelectedSeat(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.84}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {!selectedSeat?.student ? (
              <Text style={styles.modalText}>Empty seat</Text>
            ) : (
              <View style={styles.modalInfoStack}>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Name: </Text>
                  {selectedSeat.student.name}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Class: </Text>
                  {selectedSeat.student.class_id}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>CIC: </Text>
                  {selectedSeat.student.cic || "—"}
                </Text>
                <Text style={styles.modalText}>
                  <Text style={styles.modalLabel}>Status: </Text>
                  <Text
                    style={[
                      styles.modalStatus,
                      {
                        color: selectedSeat.present
                          ? theme.colors.success
                          : theme.colors.error,
                      },
                    ]}
                  >
                    {selectedSeat.present ? "Present" : "Absent"}
                  </Text>
                </Text>
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
  loadingCard: {
    minWidth: 180,
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
    marginTop: 14,
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
    alignItems: "center",
    justifyContent: "space-between",
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

  tabsRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    padding: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.soft,
  },
  tabText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.textOnDark,
  },

  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  statTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    fontFamily: "MullerMedium",
  },
  statValue: {
    fontSize: 24,
    lineHeight: 30,
    color: theme.colors.text,
    fontFamily: "MullerBold",
    marginVertical: 4,
  },
  statDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
    fontFamily: "MullerMedium",
    textTransform: "uppercase",
  },
  statIconWrap: {
    padding: 10,
    borderRadius: 14,
  },

  emptyCard: {
    alignItems: "center",
    padding: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "MullerBold",
    marginTop: 12,
    color: theme.colors.text,
  },
  emptyDesc: {
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontFamily: "MullerMedium",
  },

  rowSection: {
    marginBottom: 24,
  },
  rowTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    marginBottom: 12,
  },
  tableStack: {
    gap: 16,
  },
  tableCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  tableCardHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
    paddingBottom: 12,
  },
  tableCardTitle: {
    fontSize: 16,
    lineHeight: 20,
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
    width: 170,
    backgroundColor: theme.colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: "center",
  },
  tableCenterTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    textAlign: "center",
  },
  platesNeededBox: {
    backgroundColor: theme.colors.accentSoft,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 12,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.18)",
  },
  platesNeededLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "MullerBold",
    color: theme.colors.accent,
    textTransform: "uppercase",
  },
  platesNeededValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: "MullerBold",
    color: theme.colors.text,
    marginTop: 2,
  },
  tableBadgesRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeSuccess: {
    backgroundColor: theme.colors.success,
  },
  badgeDanger: {
    backgroundColor: theme.colors.error,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "MullerBold",
    color: theme.colors.textOnDark,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.floating,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalInfoStack: {
    gap: 8,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
  },
  modalLabel: {
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  modalStatus: {
    fontFamily: "MullerBold",
  },
});