import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, Unlock, X } from "lucide-react-native";
import { theme } from "@/theme/theme";

export default function UnlockAttendance() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from("students").select("class_id");

      if (data) {
        const uniqueClasses = [...new Set(data.map((item) => item.class_id).filter(Boolean))].sort();
        setClasses(uniqueClasses as string[]);
      }
    };

    fetchClasses();
  }, []);

  const handleUnlock = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "unlock_attendance",
          class_id: selectedClass,
          date: format(selectedDate, "yyyy-MM-dd"),
          reason,
        },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      NativeAlert.alert("Success", "Attendance unlocked.");
      setSelectedClass("");
      setReason("");
      setConfirmationText("");
      setIsModalOpen(false);
    } catch (error: any) {
      NativeAlert.alert("Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confPhrase = `unlock ${selectedClass}`;

  return (
    <>
      <View style={styles.rootCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <AlertTriangle size={20} color={theme.colors.warning} />
          </View>
          <Text style={styles.headerTitle}>Unlock Attendance</Text>
        </View>

        <Text style={styles.sectionLabel}>Select Class</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedClass}
            onValueChange={setSelectedClass}
            style={{ color: theme.colors.text }}
          >
            <Picker.Item label="Select class..." value="" color={theme.colors.textMuted} />
            {classes.map((cls) => (
              <Picker.Item key={cls} label={cls} value={cls} color={theme.colors.text} />
            ))}
          </Picker>
        </View>

        <Text style={styles.sectionLabel}>Select Date</Text>
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
            maximumDate={new Date()}
            onChange={(e, d) => {
              setShowDatePicker(Platform.OS === "ios");
              if (d) setSelectedDate(d);
            }}
          />
        )}

        <Text style={styles.sectionLabel}>Reason</Text>
        <TextInput
          style={styles.input}
          placeholder="Reason for unlocking"
          placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          disabled={!selectedClass || !reason}
          activeOpacity={0.86}
          style={[
            styles.primaryButton,
            (!selectedClass || !reason) && styles.primaryButtonDisabled,
          ]}
        >
          <Unlock
            size={17}
            color={
              !selectedClass || !reason
                ? theme.colors.textMuted
                : theme.colors.textOnDark
            }
          />
          <Text
            style={[
              styles.primaryButtonText,
              (!selectedClass || !reason) && styles.primaryButtonTextDisabled,
            ]}
          >
            Unlock Day
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Confirm Unlock</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setIsModalOpen(false)}
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Type <Text style={styles.modalStrong}>{confPhrase}</Text> to unlock{" "}
              {selectedClass}.
            </Text>

            <TextInput
              style={styles.input}
              placeholder={confPhrase}
              placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
              value={confirmationText}
              onChangeText={setConfirmationText}
            />

            <TouchableOpacity
              onPress={handleUnlock}
              activeOpacity={0.86}
              disabled={
                isLoading ||
                confirmationText.toLowerCase() !== confPhrase.toLowerCase()
              }
              style={[
                styles.primaryButton,
                confirmationText.toLowerCase() !== confPhrase.toLowerCase() &&
                  styles.primaryButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.textOnDark} />
              ) : null}

              <Text
                style={[
                  styles.primaryButtonText,
                  confirmationText.toLowerCase() !== confPhrase.toLowerCase() &&
                    styles.primaryButtonTextDisabled,
                ]}
              >
                Confirm & Unlock
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rootCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 18,
    ...theme.shadows.soft,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.warningSoft,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    marginLeft: 12,
    color: theme.colors.warning,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
    marginLeft: 2,
  },
  pickerWrap: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  dateButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  dateButtonText: {
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.warning,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  primaryButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: theme.colors.warning,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
    marginBottom: 14,
  },
  modalStrong: {
    color: theme.colors.text,
    fontFamily: "MullerBold",
  },
});