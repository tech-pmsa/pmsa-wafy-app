import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  TextInput,
  StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, X } from "lucide-react-native";
import { theme } from "@/theme/theme";

const CONFIRMATION_PHRASE = "CLEAR ALL ATTENDANCE";

export default function ClearAttendance() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearAttendance = async () => {
    if (confirmationInput !== CONFIRMATION_PHRASE) {
      return NativeAlert.alert("Error", "Confirmation phrase does not match.");
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "clear_attendance" },
      });

      if (error) throw error;

      NativeAlert.alert(
        "Success",
        "All attendance data has been successfully cleared."
      );
      setIsDialogOpen(false);
      setConfirmationInput("");
    } catch (error: any) {
      NativeAlert.alert("Deletion Failed", error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <View style={styles.rootCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <Trash2 size={20} color={theme.colors.error} />
          </View>
          <Text style={styles.headerTitle}>Clear All Attendance</Text>
        </View>

        <Text style={styles.description}>
          This will permanently delete all attendance records for all students.
          This cannot be undone.
        </Text>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => setIsDialogOpen(true)}
          style={styles.dangerButton}
        >
          <Trash2 size={17} color={theme.colors.error} />
          <Text style={styles.dangerButtonText}>Clear Data</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isDialogOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Are you sure?</Text>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setIsDialogOpen(false)}
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              This is a critical action. You are about to permanently delete all
              attendance records. Type{" "}
              <Text style={styles.modalStrong}>{CONFIRMATION_PHRASE}</Text> to
              confirm.
            </Text>

            <TextInput
              style={styles.input}
              placeholder={CONFIRMATION_PHRASE}
              placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
              value={confirmationInput}
              onChangeText={setConfirmationInput}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              onPress={handleClearAttendance}
              activeOpacity={0.86}
              disabled={isDeleting || confirmationInput !== CONFIRMATION_PHRASE}
              style={[
                styles.primaryDangerButton,
                confirmationInput !== CONFIRMATION_PHRASE &&
                  styles.primaryDangerButtonDisabled,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={theme.colors.textOnDark} />
              ) : null}

              <Text
                style={[
                  styles.primaryDangerButtonText,
                  confirmationInput !== CONFIRMATION_PHRASE &&
                    styles.primaryDangerButtonTextDisabled,
                ]}
              >
                Confirm & Delete
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
    marginBottom: 14,
  },
  headerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    marginLeft: 12,
    color: theme.colors.error,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
    marginBottom: 16,
  },
  dangerButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dangerButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
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
    color: theme.colors.error,
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
    fontFamily: "MullerBold",
    marginBottom: 16,
  },
  primaryDangerButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.error,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryDangerButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  primaryDangerButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  primaryDangerButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});