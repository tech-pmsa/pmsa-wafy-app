import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert as NativeAlert,
  StyleSheet,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import {
  CalendarIcon,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  BedDouble,
  Users,
  Clock3,
} from "lucide-react-native";
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
  date: string;
  time_in: string | null;
  time_out: string | null;
  is_staying: boolean;
}

const formatTime12 = (time24: string | null): string => {
  if (!time24) return "-";

  try {
    const date = new Date(`1970-01-01T${time24}`);
    return format(date, "hh:mm a");
  } catch {
    return "Invalid Time";
  }
};

function StatusBadge({ record }: { record?: AttendanceRecord }) {
  if (record?.is_staying) {
    return (
      <View style={[styles.statusBadge, styles.statusBadgeStaying]}>
        <BedDouble size={14} color="#7E22CE" />
        <Text style={[styles.statusBadgeText, { color: "#7E22CE" }]}>
          Staying
        </Text>
      </View>
    );
  }

  if (record?.time_in || record?.time_out) {
    return (
      <View style={[styles.statusBadge, styles.statusBadgePresent]}>
        <CheckCircle2 size={14} color={theme.colors.success} />
        <Text style={[styles.statusBadgeText, { color: theme.colors.success }]}>
          Present
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.statusBadge, styles.statusBadgeAbsent]}>
      <XCircle size={14} color={theme.colors.error} />
      <Text style={[styles.statusBadgeText, { color: theme.colors.error }]}>
        Absent
      </Text>
    </View>
  );
}

export default function AllStaffRegister() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDataForDate = async () => {
      setLoading(true);

      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      const [{ data: staffData }, { data: attendanceData }] = await Promise.all([
        supabase.from("staff").select("*").eq("is_active", true).order("name"),
        supabase.from("staff_attendance").select("*").eq("date", formattedDate),
      ]);

      setStaffList(staffData || []);

      if (attendanceData) {
        const recordsMap = attendanceData.reduce((acc, record: any) => {
          acc[record.staff_id] = record;
          return acc;
        }, {} as Record<string, AttendanceRecord>);

        setRecords(recordsMap);
      } else {
        setRecords({});
      }

      setLoading(false);
    };

    fetchDataForDate();
  }, [selectedDate]);

  const filteredStaff = useMemo(() => {
    if (!searchTerm) return staffList;
    return staffList.filter((staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staffList, searchTerm]);

  const handleDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) setSelectedDate(date);
  };

  const handleExport = async () => {
    if (filteredStaff.length === 0) {
      NativeAlert.alert("Export Failed", "No data to export for the selected day.");
      return;
    }

    try {
      const exportData = filteredStaff.map((staff) => {
        const record = records[staff.id];

        return {
          Name: staff.name,
          Designation: staff.designation || "N/A",
          "Time In": record ? formatTime12(record.time_in) : "Absent",
          "Time Out": record ? formatTime12(record.time_out) : "Absent",
          Status: record?.is_staying ? "Staying" : record ? "Present" : "Absent",
        };
      });

      const worksheet = utils.json_to_sheet(exportData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Attendance");

      const wbout = write(workbook, { type: "base64", bookType: "xlsx" });

      const uri = `${FileSystem.cacheDirectory}Staff_Register_${format(
        selectedDate,
        "yyyy-MM-dd"
      )}.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Export Staff Register",
      });
    } catch (e) {
      NativeAlert.alert("Error", "Failed to generate Excel file.");
      console.error(e);
    }
  };

  return (
    <View style={styles.rootCard}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerIconWrap}>
          <Users size={22} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Daily Staff Register</Text>
      <Text style={styles.sectionSubtitle}>Overview of staff attendance.</Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => setShowDatePicker(true)}
          style={styles.dateButton}
        >
          <CalendarIcon size={18} color={theme.colors.textSecondary} />
          <Text style={styles.dateButtonText}>{format(selectedDate, "PPP")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleExport}
          style={styles.exportButton}
        >
          <Download size={17} color={theme.colors.textOnDark} />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      <View style={styles.searchWrap}>
        <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff by name..."
          placeholderTextColor={
            theme.colors.inputPlaceholder ?? theme.colors.textMuted
          }
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading register...</Text>
        </View>
      ) : filteredStaff.length === 0 ? (
        <View style={styles.emptyState}>
          <Search size={30} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No staff found</Text>
          <Text style={styles.emptyText}>
            There are no matching staff records for this day.
          </Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {filteredStaff.map((staff) => {
            const record = records[staff.id];

            return (
              <View key={staff.id} style={styles.staffCard}>
                <View style={styles.staffTopRow}>
                  <View style={styles.staffMain}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffDesignation}>
                      {staff.designation || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.staffBadgeWrap}>
                    <StatusBadge record={record} />
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <View style={styles.timeCard}>
                    <View style={styles.timeLabelRow}>
                      <Clock3 size={12} color={theme.colors.textMuted} />
                      <Text style={styles.timeLabel}>Time In</Text>
                    </View>
                    <Text style={styles.timeValue}>
                      {formatTime12(record?.time_in || null)}
                    </Text>
                  </View>

                  <View style={styles.timeCard}>
                    <View style={styles.timeLabelRow}>
                      <Clock3 size={12} color={theme.colors.textMuted} />
                      <Text style={styles.timeLabel}>Time Out</Text>
                    </View>
                    <Text style={styles.timeValue}>
                      {formatTime12(record?.time_out || null)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  headerTopRow: {
    marginBottom: 12,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 6,
    marginBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  dateButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  dateButtonText: {
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  exportButton: {
    minWidth: 110,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  exportButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
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
    paddingVertical: 28,
  },
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
  },
  emptyTitle: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  stack: { gap: 12, paddingBottom: 4 },
  staffCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadows.soft,
  },
  staffTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  staffMain: {
    flex: 1,
  },
  staffName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  staffDesignation: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  staffBadgeWrap: {
    paddingTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  statusBadgePresent: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  statusBadgeAbsent: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusBadgeStaying: {
    backgroundColor: "rgba(126,34,206,0.10)",
    borderColor: "rgba(126,34,206,0.18)",
  },
  statusBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  timeCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 12,
  },
  timeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 5,
  },
  timeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  timeValue: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
});