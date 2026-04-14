import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";
import {
  Building2,
  RefreshCcw,
  Users,
  Sun,
  UtensilsCrossed,
  MoonStar,
  ChevronDown,
  X,
  Sparkles,
  AlertCircle,
  ClipboardList,
} from "lucide-react-native";

interface Profile {
  uid: string;
  role: string;
  name: string | null;
}

interface StudentRow {
  uid: string;
}

interface KitchenStudent {
  student_uid: string;
  name: string;
  class_id: string;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

interface FoodItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

interface StudentFoodPreference {
  id: string;
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "primary",
  fullWidth = false,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<any>;
  tone?: "primary" | "success" | "warning" | "danger";
  fullWidth?: boolean;
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
    <View style={[styles.statCard, fullWidth && styles.statCardFull]}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardTextWrap}>
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
          <Text style={styles.statCardDesc}>{description}</Text>
        </View>

        <View
          style={[
            styles.statCardIconWrap,
            {
              backgroundColor: current.bg,
              borderColor: current.border,
            },
          ]}
        >
          <Icon size={20} color={current.icon} />
        </View>
      </View>
    </View>
  );
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
        <Text
          style={value ? styles.pickerText : styles.pickerPlaceholder}
          numberOfLines={1}
        >
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
          <View style={styles.modalContentList}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.84}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.84}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      value === item.value && styles.pickerItemTextActive,
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

export default function MainOfficePage() {
  const { user: authUser } = useUserData();
  const scrollRef = useRef<ScrollView>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [kitchenStudents, setKitchenStudents] = useState<KitchenStudent[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<StudentFoodPreference[]>([]);
  const [selectedFoodId, setSelectedFoodId] = useState("default");

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

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
      if (!data || data.role !== "main") throw new Error("Not allowed");

      setProfile(data as Profile);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setProfileLoading(false);
    }
  }, [authUser?.id]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        { data: studentsData, error: studentsError },
        { data: kitchenData, error: kitchenError },
        { data: foodsData, error: foodsError },
        { data: prefsData, error: prefsError },
      ] = await Promise.all([
        supabase.from("students").select("uid"),
        supabase
          .from("kitchen_students")
          .select("student_uid, name, class_id, day_present, noon_present, night_present"),
        supabase
          .from("food_items")
          .select("id, name, is_active, display_order")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("student_food_preferences")
          .select("id, student_uid, food_item_id, is_needed"),
      ]);

      if (studentsError) throw studentsError;
      if (kitchenError) throw kitchenError;
      if (foodsError) throw foodsError;
      if (prefsError) throw prefsError;

      setStudents((studentsData || []) as StudentRow[]);
      setKitchenStudents((kitchenData || []) as KitchenStudent[]);
      setFoods((foodsData || []) as FoodItem[]);
      setFoodPreferences((prefsData || []) as StudentFoodPreference[]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (authUser?.id) fetchProfile();
  }, [authUser?.id, fetchProfile]);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile, fetchData]);

  const summary = useMemo(() => {
    const totalPresent = kitchenStudents.filter(
      (s) => s.day_present || s.noon_present || s.night_present
    ).length;

    const totalAbsent = kitchenStudents.filter(
      (s) => !s.day_present && !s.noon_present && !s.night_present
    ).length;

    const dayPresent = kitchenStudents.filter((s) => s.day_present).length;
    const noonPresent = kitchenStudents.filter((s) => s.noon_present).length;
    const nightPresent = kitchenStudents.filter((s) => s.night_present).length;

    let finalFoodPresent = 0;

    if (selectedFoodId !== "default") {
      const presentDayStudentIds = new Set(
        kitchenStudents
          .filter((s) => s.day_present)
          .map((s) => s.student_uid)
      );

      const neededStudentIds = new Set(
        foodPreferences
          .filter(
            (p) => p.food_item_id === selectedFoodId && p.is_needed === true
          )
          .map((p) => p.student_uid)
      );

      finalFoodPresent = Array.from(presentDayStudentIds).filter((id) =>
        neededStudentIds.has(id)
      ).length;
    }

    return {
      totalStudents: students.length,
      totalPresent,
      totalAbsent,
      dayPresent,
      noonPresent,
      nightPresent,
      finalFoodPresent,
    };
  }, [students, kitchenStudents, foodPreferences, selectedFoodId]);

  const foodOptions = useMemo(
    () => [
      { label: "Default", value: "default" },
      ...foods.map((f) => ({ label: f.name, value: f.id })),
    ],
    [foods]
  );

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
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
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
                <Building2 size={28} color={theme.colors.primary} />
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
              <Text style={styles.heroPillText}>Live Overview</Text>
            </View>

            <Text style={styles.heroTitle}>Main Office Dashboard</Text>
            <Text style={styles.heroSubtitle}>
              Live kitchen attendance and food requirement summary.
            </Text>
          </View>

          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <View style={styles.filterHeaderIconWrap}>
                <ClipboardList size={18} color={theme.colors.primary} />
              </View>

              <View style={styles.filterHeaderTextWrap}>
                <Text style={styles.filterTitle}>Food Requirement Filter</Text>
                <Text style={styles.filterSubtitle}>
                  Select a food item to calculate how many day-present students need it.
                </Text>
              </View>
            </View>

            <CustomPicker
              value={selectedFoodId}
              placeholder="Select Food"
              options={foodOptions}
              onSelect={setSelectedFoodId}
            />
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              title="Total Students"
              value={summary.totalStudents}
              description="Total in college"
              icon={Users}
              tone="primary"
            />
            <StatCard
              title="Total Present"
              value={summary.totalPresent}
              description="Present any time"
              icon={Users}
              tone="success"
            />
            <StatCard
              title="Total Absent"
              value={summary.totalAbsent}
              description="Absent all day"
              icon={AlertCircle}
              tone="danger"
            />
            <StatCard
              title="Day Present"
              value={summary.dayPresent}
              description="Morning count"
              icon={Sun}
              tone="primary"
            />
            <StatCard
              title="Noon Present"
              value={summary.noonPresent}
              description="Lunch count"
              icon={UtensilsCrossed}
              tone="primary"
            />
            <StatCard
              title="Night Present"
              value={summary.nightPresent}
              description="Dinner count"
              icon={MoonStar}
              tone="primary"
            />
            <StatCard
              title="Final Food Present"
              value={summary.finalFoodPresent}
              description={
                selectedFoodId === "default"
                  ? "Select a food to calculate"
                  : "Day present students needing selected food"
              }
              icon={UtensilsCrossed}
              tone="warning"
              fullWidth
            />
          </View>
        </ScrollView>

        <FloatingScrollToggle
          direction={scrollDirection}
          onPress={handleFloatingPress}
        />
      </View>
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
    marginTop: 12,
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
    lineHeight: 16,
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

  filterCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 20,
    ...theme.shadows.soft,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  filterHeaderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginRight: 12,
  },
  filterHeaderTextWrap: {
    flex: 1,
  },
  filterTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  filterSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  statCardFull: {
    width: "100%",
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statCardTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  statCardTitle: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    fontFamily: "MullerMedium",
  },
  statCardValue: {
    fontSize: 25,
    lineHeight: 31,
    color: theme.colors.text,
    fontFamily: "MullerBold",
    marginVertical: 4,
  },
  statCardDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textMuted,
    fontFamily: "MullerMedium",
  },
  statCardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  pickerBtn: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  pickerText: {
    fontFamily: "MullerMedium",
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    paddingRight: 12,
  },
  pickerPlaceholder: {
    fontFamily: "MullerMedium",
    color: theme.colors.textMuted,
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
    paddingRight: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
  },
  modalContentList: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
    paddingBottom: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
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
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
  },
  pickerItemText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    color: theme.colors.text,
  },
  pickerItemTextActive: {
    fontFamily: "MullerBold",
    color: theme.colors.primary,
  },
});