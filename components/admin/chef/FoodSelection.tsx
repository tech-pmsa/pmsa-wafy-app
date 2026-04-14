import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  Plus,
  Save,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Sparkles,
  Soup,
  ClipboardList,
  Users,
} from "lucide-react-native";
import { FoodSelectionPdfExport } from "@/components/admin/chef/FoodSelectionPdfExport";

export interface FoodItem {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

export interface KitchenStudent {
  student_uid: string;
  name: string;
  cic: string | null;
  class_id: string;
  batch: string | null;
  council: string | null;
  day_present: boolean;
  noon_present: boolean;
  night_present: boolean;
}

export interface StudentFoodPreference {
  id: string;
  student_uid: string;
  food_item_id: string;
  is_needed: boolean;
}

interface Props {
  foods: FoodItem[];
  students: KitchenStudent[];
  preferences: StudentFoodPreference[];
  onRefresh: () => Promise<void>;
}

function NativePicker({
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
  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.modalClose}
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

function MiniInfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
}) {
  return (
    <View style={styles.miniInfoCard}>
      <View style={styles.miniInfoIconWrap}>
        <Icon size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.miniInfoTextWrap}>
        <Text style={styles.miniInfoValue}>{value}</Text>
        <Text style={styles.miniInfoLabel}>{label}</Text>
      </View>
    </View>
  );
}

const FoodChip = memo(function FoodChip({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.foodToggle,
        checked ? styles.foodToggleActive : styles.foodToggleInactive,
      ]}
      activeOpacity={0.84}
    >
      {checked ? (
        <Check size={14} color={theme.colors.textOnDark} />
      ) : (
        <X size={14} color={theme.colors.error} />
      )}
      <Text
        style={[
          styles.foodToggleText,
          checked ? styles.foodToggleTextActive : styles.foodToggleTextInactive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const StudentFoodCard = memo(function StudentFoodCard({
  student,
  foods,
  drafts,
  onToggle,
}: {
  student: KitchenStudent;
  foods: FoodItem[];
  drafts: Record<string, boolean>;
  onToggle: (studentUid: string, foodId: string) => void;
}) {
  return (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentCic}>CIC: {student.cic || "—"}</Text>
      </View>

      <View style={styles.foodGrid}>
        {foods.map((food) => {
          const key = `${student.student_uid}-${food.id}`;
          const checked = drafts[key] ?? true;

          return (
            <FoodChip
              key={food.id}
              label={food.name}
              checked={checked}
              onPress={() => onToggle(student.student_uid, food.id)}
            />
          );
        })}
      </View>
    </View>
  );
});

const ClassSection = memo(function ClassSection({
  classId,
  students,
  foods,
  drafts,
  onToggle,
}: {
  classId: string;
  students: KitchenStudent[];
  foods: FoodItem[];
  drafts: Record<string, boolean>;
  onToggle: (studentUid: string, foodId: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.classHeader}>
        <View>
          <Text style={styles.classTitle}>{classId}</Text>
          <Text style={styles.classSubtitle}>{students.length} students</Text>
        </View>
      </View>

      <View style={styles.studentList}>
        {students.map((student) => (
          <StudentFoodCard
            key={student.student_uid}
            student={student}
            foods={foods}
            drafts={drafts}
            onToggle={onToggle}
          />
        ))}
      </View>
    </View>
  );
});

export default function FoodSelection({
  foods,
  students,
  preferences,
  onRefresh,
}: Props) {
  const [newFoodName, setNewFoodName] = useState("");
  const [editingFoodId, setEditingFoodId] = useState("");
  const [editingFoodName, setEditingFoodName] = useState("");
  const [selectedDeleteFoodId, setSelectedDeleteFoodId] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [workingAction, setWorkingAction] = useState<
    "add" | "edit" | "delete" | null
  >(null);

  const foodsSorted = useMemo(
    () =>
      [...foods]
        .filter((f) => f.is_active)
        .sort(
          (a, b) =>
            a.display_order - b.display_order || a.name.localeCompare(b.name)
        ),
    [foods]
  );

  const groupedStudents = useMemo(() => {
    const grouped: Record<string, KitchenStudent[]> = {};

    [...students]
      .sort((a, b) => {
        const classCmp = a.class_id.localeCompare(b.class_id, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        if (classCmp !== 0) return classCmp;

        return (a.cic || "").localeCompare(b.cic || "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      })
      .forEach((student) => {
        if (!grouped[student.class_id]) grouped[student.class_id] = [];
        grouped[student.class_id].push(student);
      });

    return grouped;
  }, [students]);

  const prefMap = useMemo(() => {
    const map = new Map<string, StudentFoodPreference>();
    preferences.forEach((pref) => {
      map.set(`${pref.student_uid}-${pref.food_item_id}`, pref);
    });
    return map;
  }, [preferences]);

  const baseDrafts = useMemo(() => {
    const initial: Record<string, boolean> = {};
    preferences.forEach((pref) => {
      initial[`${pref.student_uid}-${pref.food_item_id}`] = pref.is_needed;
    });
    return initial;
  }, [preferences]);

  const [drafts, setDrafts] = useState<Record<string, boolean>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    setDrafts(baseDrafts);
    setChangedKeys(new Set());
    initializedRef.current = true;
  }, [baseDrafts]);

  const toggleDraft = useCallback(
    (studentUid: string, foodId: string) => {
      const key = `${studentUid}-${foodId}`;
      const baseValue = baseDrafts[key] ?? true;

      setDrafts((prev) => {
        const current = prev[key] ?? true;
        const nextValue = !current;
        return {
          ...prev,
          [key]: nextValue,
        };
      });

      setChangedKeys((prev) => {
        const next = new Set(prev);
        const currentValue = drafts[key] ?? true;
        const nextValue = !currentValue;

        if (nextValue === baseValue) next.delete(key);
        else next.add(key);

        return next;
      });
    },
    [baseDrafts, drafts]
  );

  const handleAddFood = async () => {
    const name = newFoodName.trim();
    if (!name) {
      return Alert.alert("Error", "Enter food name");
    }

    try {
      setWorkingAction("add");

      const maxOrder = foods.length
        ? Math.max(...foods.map((f) => f.display_order))
        : 0;

      const { error } = await supabase.from("food_items").insert({
        name,
        is_active: true,
        display_order: maxOrder + 1,
      });

      if (error) throw error;

      setNewFoodName("");
      await onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setWorkingAction(null);
    }
  };

  const handleEditFood = async () => {
    const name = editingFoodName.trim();
    if (!editingFoodId || !name) {
      return Alert.alert("Error", "Select a food and enter a new name");
    }

    try {
      setWorkingAction("edit");

      const { error } = await supabase
        .from("food_items")
        .update({ name })
        .eq("id", editingFoodId);

      if (error) throw error;

      setEditingFoodId("");
      setEditingFoodName("");
      await onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setWorkingAction(null);
    }
  };

  const handleDeleteFood = async () => {
    if (!selectedDeleteFoodId) {
      return Alert.alert("Error", "Select food to delete");
    }

    Alert.alert("Delete Food", "Are you sure you want to delete this food item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setWorkingAction("delete");

            const { error } = await supabase
              .from("food_items")
              .delete()
              .eq("id", selectedDeleteFoodId);

            if (error) throw error;

            setSelectedDeleteFoodId("");
            await onRefresh();
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setWorkingAction(null);
          }
        },
      },
    ]);
  };

  const handleSaveAll = async () => {
    if (changedKeys.size === 0) {
      return Alert.alert("Notice", "No food changes to save");
    }

    setSavingAll(true);

    try {
      for (const key of changedKeys) {
        const pref = prefMap.get(key);
        if (!pref) continue;

        const { error } = await supabase
          .from("student_food_preferences")
          .update({ is_needed: drafts[key] })
          .eq("id", pref.id);

        if (error) throw error;
      }

      Alert.alert("Success", "All food selections saved");
      await onRefresh();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSavingAll(false);
    }
  };

  const foodOptions = useMemo(
    () => foodsSorted.map((f) => ({ label: f.name, value: f.id })),
    [foodsSorted]
  );

  const summary = useMemo(() => {
    return {
      totalFoods: foodsSorted.length,
      totalStudents: students.length,
      totalClasses: Object.keys(groupedStudents).length,
      changed: changedKeys.size,
    };
  }, [foodsSorted.length, students.length, groupedStudents, changedKeys]);

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <Soup size={24} color={theme.colors.primary} />
          </View>

          <View style={styles.heroPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.heroPillText}>Food Selection</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Manage Food Preferences</Text>
        <Text style={styles.heroSubtitle}>
          Add food items, edit names, delete unused items, and manage student-wise
          food needs.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <MiniInfoCard label="Foods" value={`${summary.totalFoods}`} icon={Soup} />
        <MiniInfoCard label="Students" value={`${summary.totalStudents}`} icon={Users} />
        <MiniInfoCard label="Classes" value={`${summary.totalClasses}`} icon={ClipboardList} />
        <MiniInfoCard label="Changed" value={`${summary.changed}`} icon={Save} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Food Management</Text>
        <Text style={styles.cardDesc}>
          Add, rename, delete, and export food preference data.
        </Text>

        <View style={styles.controlGroup}>
          <Text style={styles.label}>Add Food</Text>
          <View style={styles.rowBox}>
            <TextInput
              style={styles.input}
              value={newFoodName}
              onChangeText={setNewFoodName}
              placeholder="New food name"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity
              onPress={handleAddFood}
              style={styles.btnSecondary}
              activeOpacity={0.84}
              disabled={workingAction === "add"}
            >
              {workingAction === "add" ? (
                <ActivityIndicator size="small" color={theme.colors.text} />
              ) : (
                <Plus size={16} color={theme.colors.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.label}>Edit Food</Text>
          <View style={styles.columnGap}>
            <NativePicker
              value={editingFoodId}
              options={foodOptions}
              placeholder="Select food"
              onSelect={(v) => {
                setEditingFoodId(v);
                setEditingFoodName(foodsSorted.find((f) => f.id === v)?.name || "");
              }}
            />

            <View style={styles.rowBox}>
              <TextInput
                style={styles.input}
                value={editingFoodName}
                onChangeText={setEditingFoodName}
                placeholder="New name"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TouchableOpacity
                onPress={handleEditFood}
                style={styles.btnSecondary}
                activeOpacity={0.84}
                disabled={workingAction === "edit"}
              >
                {workingAction === "edit" ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <Edit3 size={16} color={theme.colors.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.label}>Delete Food</Text>
          <View style={styles.rowBox}>
            <View style={styles.flexOne}>
              <NativePicker
                value={selectedDeleteFoodId}
                options={foodOptions}
                placeholder="Select food"
                onSelect={setSelectedDeleteFoodId}
              />
            </View>

            <TouchableOpacity
              onPress={handleDeleteFood}
              style={styles.btnDanger}
              activeOpacity={0.84}
              disabled={workingAction === "delete"}
            >
              {workingAction === "delete" ? (
                <ActivityIndicator size="small" color={theme.colors.error} />
              ) : (
                <Trash2 size={16} color={theme.colors.error} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.saveBar}>
          <View style={styles.changedInfo}>
            <Text style={styles.changedValue}>{changedKeys.size}</Text>
            <Text style={styles.changedText}>Pending changes</Text>
          </View>

          <TouchableOpacity
            onPress={handleSaveAll}
            disabled={savingAll || changedKeys.size === 0}
            style={[
              styles.btnPrimary,
              (savingAll || changedKeys.size === 0) && styles.dimmedButton,
            ]}
            activeOpacity={0.84}
          >
            {savingAll ? (
              <ActivityIndicator size="small" color={theme.colors.textOnDark} />
            ) : (
              <Save size={16} color={theme.colors.textOnDark} />
            )}
            <Text style={styles.btnPrimaryText}>
              {savingAll ? "Saving..." : "Save All Changes"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.exportWrap}>
          <FoodSelectionPdfExport
            foods={foodsSorted}
            students={students}
            preferences={preferences}
          />
        </View>
      </View>

      {Object.keys(groupedStudents).map((classId) => (
        <ClassSection
          key={classId}
          classId={classId}
          students={groupedStudents[classId]}
          foods={foodsSorted}
          drafts={drafts}
          onToggle={toggleDraft}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
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
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  heroSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },

  statsGrid: { gap: 10 },
  miniInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  miniInfoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  miniInfoTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  miniInfoValue: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  miniInfoLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },

  controlGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  rowBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  columnGap: { gap: 10 },
  flexOne: { flex: 1 },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    fontFamily: "MullerMedium",
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.text,
  },

  btnSecondary: {
    height: 48,
    width: 48,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDanger: {
    height: 48,
    width: 48,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    flex: 1,
    minHeight: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: {
    color: theme.colors.textOnDark,
    fontFamily: "MullerBold",
    fontSize: 14,
    lineHeight: 18,
  },
  dimmedButton: { opacity: 0.5 },

  saveBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceSoft,
    paddingTop: 16,
  },
  changedInfo: {
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  changedValue: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "MullerBold",
    color: theme.colors.accent,
  },
  changedText: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    color: theme.colors.accent,
    textAlign: "center",
  },
  exportWrap: { marginTop: 12 },

  classHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceSoft,
    paddingBottom: 12,
  },
  classTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  classSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  studentList: { gap: 12 },
  studentCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  studentInfo: { marginBottom: 10 },
  studentName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
    color: theme.colors.text,
  },
  studentCic: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "MullerMedium",
    color: theme.colors.textSecondary,
    marginTop: 3,
  },

  foodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  foodToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  foodToggleActive: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  foodToggleInactive: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  foodToggleText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    marginLeft: 4,
  },
  foodToggleTextActive: {
    color: theme.colors.textOnDark,
  },
  foodToggleTextInactive: {
    color: theme.colors.error,
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
    paddingHorizontal: 12,
  },
  pickerText: {
    fontFamily: "MullerMedium",
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
    paddingRight: 10,
  },
  pickerPlaceholder: {
    fontFamily: "MullerMedium",
    color: theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
    paddingRight: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
  },
  modalContent: {
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
  modalClose: {
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