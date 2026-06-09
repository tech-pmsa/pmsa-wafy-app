import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
  StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/lib/supabaseClient";
import { ChevronsRight, X } from "lucide-react-native";
import { theme } from "@/theme/theme";

function classNameFromDesignation(value: any) {
  return String(value || "").trim().replace(/\s+Class$/i, "");
}

export function PromoteClassModal({
  isOpen,
  setIsOpen,
  currentClass,
  onSave,
}: any) {
  const [toClass, setToClass] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      setClassesLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("designation")
          .eq("role", "class")
          .not("designation", "is", null)
          .order("designation", { ascending: true });

        if (error) throw error;

        const designations = Array.from(
          new Set(
            (data || [])
              .map((row: any) => classNameFromDesignation(row.designation))
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

        setClasses(designations);
      } catch (err: any) {
        NativeAlert.alert("Error", err.message || "Failed to load class list.");
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    };

    if (isOpen) {
      setToClass("");
      loadClasses();
    }
  }, [isOpen]);

  const handlePromote = async () => {
    if (!toClass) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "promote_class", from_class: currentClass, to_class: toClass },
      });

      if (error) {
        let message = error.message;

        try {
          const response = (error as any).context as Response | undefined;
          const body = response ? await response.clone().json() : null;
          if (body?.error) message = body.error;
        } catch {
          // Keep the SDK error message when the response body is unavailable.
        }

        throw new Error(message);
      }

      NativeAlert.alert(
        "Success",
        data?.message || `Promoted all students from ${currentClass} to ${toClass}.`
      );
      onSave();
      setIsOpen(false);
    } catch (e: any) {
      NativeAlert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.topRow}>
            <View style={styles.titlePill}>
              <ChevronsRight size={18} color={theme.colors.primary} />
              <Text style={styles.titlePillText}>Promote Class</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Select the new class to move all students from{" "}
            <Text style={styles.descriptionStrong}>{currentClass}</Text>.
          </Text>

          <View style={styles.pickerWrap}>
            {classesLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading classes...</Text>
              </View>
            ) : (
              <Picker
                selectedValue={toClass}
                onValueChange={setToClass}
                style={{ color: theme.colors.text }}
              >
                <Picker.Item label="Select destination" value="" color={theme.colors.textMuted} />
                {classes
                  .filter((c) => c !== currentClass)
                  .map((cls) => (
                    <Picker.Item key={cls} label={cls} value={cls} color={theme.colors.text} />
                  ))}
              </Picker>
            )}
          </View>

          {!classesLoading && classes.filter((c) => c !== currentClass).length === 0 ? (
            <Text style={styles.emptyText}>
              No class teacher designations found in profiles.
            </Text>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handlePromote}
            disabled={loading || classesLoading || !toClass}
            style={[
              styles.primaryButton,
              (!toClass || classesLoading) && styles.primaryButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.textOnDark} />
            ) : null}
            <Text
              style={[
                styles.primaryButtonText,
                (!toClass || classesLoading) && styles.primaryButtonTextDisabled,
              ]}
            >
              Confirm Promotion
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  titlePillText: {
    color: theme.colors.primary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
    marginBottom: 16,
  },
  descriptionStrong: {
    color: theme.colors.text,
    fontFamily: "MullerBold",
  },
  pickerWrap: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  loadingRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textAlign: "center",
    marginBottom: 14,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
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
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  primaryButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
