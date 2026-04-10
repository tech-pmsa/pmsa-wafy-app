import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert as NativeAlert,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { format, startOfMonth, endOfMonth, parse } from "date-fns";
import {
  CalendarIcon,
  UserPlus,
  Download,
  Trash2,
  Save,
  Search,
  Clock,
  BedDouble,
  X,
  Edit,
  XCircle,
  ShieldCheck,
} from "lucide-react-native";
import { Switch } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { utils, write } from "xlsx";
import { theme } from "@/theme/theme";

interface StaffMember {
  id: string;
  name: string;
  designation: string | null;
}
interface AttendanceRecord {
  staff_id: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  is_staying: boolean;
}

const formatDisplayTime = (t: string | null) =>
  t ? format(parse(t, "HH:mm:ss", new Date()), "hh:mm a") : "Set Time";

export default function StaffRegisterPage() {
  const { role, loading: userLoading } = useUserData();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, AttendanceRecord>
  >({});

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [activeTimePicker, setActiveTimePicker] = useState<{
    staffId: string;
    field: "time_in" | "time_out";
    currentValue: Date;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffDesignation, setNewStaffDesignation] = useState("");

  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    const formattedDate = format(date, "yyyy-MM-dd");

    const [{ data: staffData }, { data: attendanceData }] = await Promise.all([
      supabase.from("staff").select("*").eq("is_active", true).order("name"),
      supabase.from("staff_attendance").select("*").eq("date", formattedDate),
    ]);

    if (staffData) setStaffList(staffData);
    else setStaffList([]);

    if (attendanceData) {
      const recordsMap = attendanceData.reduce((acc, record: any) => {
        acc[record.staff_id] = record;
        return acc;
      }, {} as Record<string, AttendanceRecord>);

      setAttendanceRecords(recordsMap);
    } else {
      setAttendanceRecords({});
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  const handleAttendanceChange = (
    staffId: string,
    field: "time_in" | "time_out" | "is_staying",
    value: string | boolean | null
  ) => {
    const existingRecord = attendanceRecords[staffId] || {
      staff_id: staffId,
      date: format(selectedDate, "yyyy-MM-dd"),
      time_in: null,
      time_out: null,
      is_staying: false,
    };

    const updatedRecord = { ...existingRecord, [field]: value };

    setAttendanceRecords((prev) => ({
      ...prev,
      [staffId]: updatedRecord as AttendanceRecord,
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const recordsToUpsert = Object.values(attendanceRecords);

    if (recordsToUpsert.length === 0) {
      NativeAlert.alert("Notice", "No changes to save.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase
      .from("staff_attendance")
      .upsert(recordsToUpsert, { onConflict: "staff_id,date" });

    if (error) NativeAlert.alert("Error", error.message);
    else NativeAlert.alert("Success", "Attendance saved successfully!");

    setIsSaving(false);
  };

  const handleAddNewStaff = async () => {
    if (!newStaffName.trim()) return;

    const { data, error } = await supabase
      .from("staff")
      .insert({
        name: newStaffName.trim(),
        designation: newStaffDesignation.trim(),
      })
      .select()
      .single();

    if (error) {
      NativeAlert.alert("Error", error.message);
    } else if (data) {
      NativeAlert.alert("Success", `${data.name} added to staff list.`);
      setStaffList((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewStaffName("");
      setNewStaffDesignation("");
      setIsAddStaffOpen(false);
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !editingStaff.name.trim()) return;

    const { error } = await supabase
      .from("staff")
      .update({
        name: editingStaff.name.trim(),
        designation: editingStaff.designation,
      })
      .eq("id", editingStaff.id);

    if (error) {
      NativeAlert.alert("Error", error.message);
    } else {
      NativeAlert.alert("Success", "Staff details updated.");
      setStaffList((prev) =>
        prev
          .map((s) => (s.id === editingStaff.id ? editingStaff : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setIsEditStaffOpen(false);
      setEditingStaff(null);
    }
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    NativeAlert.alert(
      "Remove Staff",
      `Are you sure you want to remove ${staff.name}? This will hide them from the active list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("staff")
              .update({ is_active: false })
              .eq("id", staff.id);

            if (error) NativeAlert.alert("Error", error.message);
            else {
              setStaffList((prev) => prev.filter((s) => s.id !== staff.id));
              NativeAlert.alert("Success", `${staff.name} removed.`);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      const { data, error } = await supabase
        .from("staff_attendance")
        .select("date, time_in, time_out, is_staying, staff(name, designation)")
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date", { ascending: true });

      if (error || !data || data.length === 0) {
        return NativeAlert.alert(
          "Notice",
          "No data available to export for this month."
        );
      }

      const formatTimeForExport = (time: string | null, isStaying: boolean) => {
        if (time) return format(parse(time, "HH:mm:ss", new Date()), "hh:mm a");
        if (isStaying) return "Staying";
        return "";
      };

      const exportData = data.map((rec: any) => ({
        Date: format(new Date(rec.date), "dd-MM-yyyy"),
        Name: rec.staff?.name,
        Designation: rec.staff?.designation,
        "Time In": formatTimeForExport(rec.time_in, rec.is_staying),
        "Time Out": formatTimeForExport(rec.time_out, rec.is_staying),
      }));

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Attendance");
      const wbout = write(workbook, { type: "base64", bookType: "xlsx" });

      const uri = `${FileSystem.cacheDirectory}Staff_Attendance_${format(
        selectedDate,
        "MMM_yyyy"
      )}.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, { dialogTitle: "Export Staff Register" });
    } catch (e: any) {
      NativeAlert.alert("Export Failed", e.message);
    }
  };

  const handleDeleteMonthData = () => {
    NativeAlert.alert(
      "Confirm Delete",
      `Delete all records for ${format(selectedDate, "MMMM yyyy")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd");
            const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd");

            const { error } = await supabase
              .from("staff_attendance")
              .delete()
              .gte("date", monthStart)
              .lte("date", monthEnd);

            if (error) NativeAlert.alert("Error", error.message);
            else {
              NativeAlert.alert("Deleted", "Data cleared.");
              fetchData(selectedDate);
            }
          },
        },
      ]
    );
  };

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return staffList;
    return staffList.filter((staff) =>
      staff.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [staffList, searchQuery]);

  if (userLoading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading Staff Register...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (role !== "officer") {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["top"]}>
        <Text style={styles.stateText}>Access Denied.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderIconWrap}>
          <ShieldCheck size={24} color={theme.colors.primary} />
        </View>
        <Text style={styles.pageTitle}>Staff Register</Text>
        <Text style={styles.pageSubtitle}>
          Manage daily attendance for staff.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.controlsCard}>
          <Text style={styles.cardTitle}>Controls</Text>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            <CalendarIcon size={18} color={theme.colors.textSecondary} />
            <Text style={styles.dateButtonText}>{format(selectedDate, "PPP")}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              onChange={(e, d) => {
                setShowDatePicker(Platform.OS === "ios");
                if (d) setSelectedDate(d);
              }}
            />
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setIsAddStaffOpen(true)}
              style={styles.secondaryActionButton}
            >
              <UserPlus size={17} color={theme.colors.text} />
              <Text style={styles.secondaryActionButtonText}>Add Staff</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleExport}
              style={styles.secondaryActionButton}
            >
              <Download size={17} color={theme.colors.text} />
              <Text style={styles.secondaryActionButtonText}>Export Month</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleSaveAll}
            disabled={isSaving}
            style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.textOnDark} />
            ) : (
              <Save size={17} color={theme.colors.textOnDark} />
            )}
            <Text style={styles.primaryButtonText}>Save All Changes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
            placeholderTextColor={
              theme.colors.inputPlaceholder ?? theme.colors.textMuted
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading register...</Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {filteredStaff.map((staff) => {
              const record = attendanceRecords[staff.id] || ({} as any);

              return (
                <View key={staff.id} style={styles.staffCard}>
                  <View style={styles.staffHeader}>
                    <View style={styles.staffHeaderMain}>
                      <Text style={styles.staffName}>{staff.name}</Text>
                      <Text style={styles.staffDesignation}>
                        {staff.designation || "N/A"}
                      </Text>
                    </View>

                    <View style={styles.inlineActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setEditingStaff(staff);
                          setIsEditStaffOpen(true);
                        }}
                      >
                        <Edit size={18} color={theme.colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteStaff(staff)}
                      >
                        <Trash2 size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.attendanceRow}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>In Time</Text>
                      <View style={styles.timeInputWrap}>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() =>
                            setActiveTimePicker({
                              staffId: staff.id,
                              field: "time_in",
                              currentValue: record.time_in
                                ? parse(record.time_in, "HH:mm:ss", new Date())
                                : new Date(),
                            })
                          }
                          style={styles.timeInputButton}
                        >
                          <Clock size={12} color={theme.colors.textMuted} />
                          <Text
                            style={[
                              styles.timeInputText,
                              !record.time_in && styles.timeInputTextMuted,
                            ]}
                          >
                            {formatDisplayTime(record.time_in)}
                          </Text>
                        </TouchableOpacity>

                        {record.time_in && (
                          <TouchableOpacity
                            onPress={() =>
                              handleAttendanceChange(staff.id, "time_in", null)
                            }
                            style={styles.clearTimeButton}
                          >
                            <XCircle size={15} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>Out Time</Text>
                      <View style={styles.timeInputWrap}>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() =>
                            setActiveTimePicker({
                              staffId: staff.id,
                              field: "time_out",
                              currentValue: record.time_out
                                ? parse(record.time_out, "HH:mm:ss", new Date())
                                : new Date(),
                            })
                          }
                          style={styles.timeInputButton}
                        >
                          <Clock size={12} color={theme.colors.textMuted} />
                          <Text
                            style={[
                              styles.timeInputText,
                              !record.time_out && styles.timeInputTextMuted,
                            ]}
                          >
                            {formatDisplayTime(record.time_out)}
                          </Text>
                        </TouchableOpacity>

                        {record.time_out && (
                          <TouchableOpacity
                            onPress={() =>
                              handleAttendanceChange(staff.id, "time_out", null)
                            }
                            style={styles.clearTimeButton}
                          >
                            <XCircle size={15} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.stayingBlock}>
                      <View style={styles.stayingTopRow}>
                        <BedDouble size={13} color={theme.colors.textMuted} />
                        <Text style={styles.timeLabel}>Staying</Text>
                      </View>

                      <Switch
                        value={record.is_staying || false}
                        onValueChange={(v) =>
                          handleAttendanceChange(staff.id, "is_staying", v)
                        }
                        trackColor={{
                          false: theme.colors.border,
                          true: theme.colors.primary,
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.dangerCard}>
          <View style={styles.dangerHeader}>
            <Trash2 size={22} color={theme.colors.error} />
            <Text style={styles.dangerTitle}>Delete Month's Data</Text>
          </View>
          <Text style={styles.dangerText}>
            Permanently delete all attendance records for{" "}
            {format(selectedDate, "MMMM yyyy")}.
          </Text>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleDeleteMonthData}
            style={styles.dangerButton}
          >
            <Text style={styles.dangerButtonText}>Delete Records</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {activeTimePicker && (
        <DateTimePicker
          value={activeTimePicker.currentValue}
          mode="time"
          display="spinner"
          onChange={(_event, date) => {
            if (Platform.OS === "android") setActiveTimePicker(null);
            if (date) {
              handleAttendanceChange(
                activeTimePicker.staffId,
                activeTimePicker.field,
                format(date, "HH:mm:ss")
              );
            }
          }}
        />
      )}

      {Platform.OS === "ios" && activeTimePicker && (
        <View style={styles.iosConfirmBar}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => setActiveTimePicker(null)}
            style={styles.iosConfirmButton}
          >
            <Text style={styles.iosConfirmButtonText}>Confirm Time</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={isAddStaffOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddStaffOpen(false)}
      >
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalPageHeader}>
            <Text style={styles.modalPageTitle}>Add Staff Member</Text>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setIsAddStaffOpen(false)}
              style={styles.modalCloseCircle}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.formStack}>
            <View>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={newStaffName}
                onChangeText={setNewStaffName}
                placeholder="Enter full name"
                placeholderTextColor={
                  theme.colors.inputPlaceholder ?? theme.colors.textMuted
                }
              />
            </View>

            <View>
              <Text style={styles.fieldLabel}>Designation</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Principal"
                placeholderTextColor={
                  theme.colors.inputPlaceholder ?? theme.colors.textMuted
                }
                value={newStaffDesignation}
                onChangeText={setNewStaffDesignation}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleAddNewStaff}
              disabled={!newStaffName.trim()}
              style={[
                styles.primaryButtonFull,
                !newStaffName.trim() && styles.primaryButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>Add Staff</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isEditStaffOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setIsEditStaffOpen(false);
          setEditingStaff(null);
        }}
      >
        <SafeAreaView style={styles.modalScreen}>
          <View style={styles.modalPageHeader}>
            <Text style={styles.modalPageTitle}>Edit Staff Member</Text>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => {
                setIsEditStaffOpen(false);
                setEditingStaff(null);
              }}
              style={styles.modalCloseCircle}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {editingStaff && (
            <View style={styles.formStack}>
              <View>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editingStaff.name}
                  onChangeText={(value) =>
                    setEditingStaff((prev) =>
                      prev ? { ...prev, name: value } : prev
                    )
                  }
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Designation</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editingStaff.designation || ""}
                  onChangeText={(value) =>
                    setEditingStaff((prev) =>
                      prev ? { ...prev, designation: value } : prev
                    )
                  }
                  placeholder="e.g. Principal"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder ?? theme.colors.textMuted
                  }
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.86}
                onPress={handleUpdateStaff}
                disabled={!editingStaff.name.trim()}
                style={[
                  styles.primaryButtonFull,
                  !editingStaff.name.trim() && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  bgOrbPrimary: {
    position: "absolute",
    top: 120,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryTint,
  },
  bgOrbAccent: {
    position: "absolute",
    bottom: 110,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: theme.colors.accentTint,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 380,
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
  stateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  pageHeaderIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginBottom: 12,
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  pageSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  controlsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    marginBottom: 12,
  },
  dateButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  dateButtonText: {
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryActionButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonFull: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 14,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 26,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  stack: {
    gap: 12,
    marginBottom: 18,
  },
  staffCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.soft,
  },
  staffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  staffHeaderMain: {
    flex: 1,
  },
  staffName: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
  },
  staffDesignation: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 4,
  },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
    marginBottom: 6,
  },
  timeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
  },
  timeInputButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  timeInputText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  timeInputTextMuted: {
    color: theme.colors.textMuted,
  },
  clearTimeButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  stayingBlock: {
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 74,
  },
  stayingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 7,
  },
  dangerCard: {
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 10,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  dangerTitle: {
    color: theme.colors.error,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  dangerText: {
    color: theme.colors.error,
    opacity: 0.9,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    marginBottom: 14,
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  iosConfirmBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 26,
  },
  iosConfirmButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  iosConfirmButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modalPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  modalPageTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  modalCloseCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  formStack: {
    gap: 14,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  fieldInput: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerMedium",
    ...theme.shadows.soft,
  },
});