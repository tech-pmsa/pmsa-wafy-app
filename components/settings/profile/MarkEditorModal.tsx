import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert as NativeAlert,
  Switch,
  StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { PlusCircle, Trash2, Save, X } from "lucide-react-native";
import { theme } from "@/theme/theme";

type SubjectItem = {
  id?: number;
  subject_name: string;
  marks_obtained: string;
  status: boolean;
};

export function MarkEditorModal({ isOpen, setIsOpen, entry, onSave }: any) {
  const { user } = useUserData();
  const [title, setTitle] = useState("");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (entry) {
      setTitle(entry.title || "");
      setSubjects(JSON.parse(JSON.stringify(entry.subject_marks || [])));
    } else {
      setTitle("");
      setSubjects([{ subject_name: "", marks_obtained: "", status: true }]);
    }
  }, [entry, isOpen]);

  const updateSubject = (index: number, field: keyof SubjectItem, value: any) => {
    setSubjects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeSubject = (index: number) => {
    setSubjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      { subject_name: "", marks_obtained: "", status: true },
    ]);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { data: entryData, error: entryError } = await supabase
        .from("academic_entries")
        .upsert({
          id: entry?.id,
          student_uid: user.id,
          title: title.toUpperCase(),
        })
        .select()
        .single();

      if (entryError) throw entryError;

      const toSave = subjects.map((subject) => ({
        ...subject,
        entry_id: entryData.id,
        subject_name: (subject.subject_name || "").toUpperCase(),
        marks_obtained: String(subject.marks_obtained || "").toUpperCase(),
      }));

      const { error: subjectsError } = await supabase
        .from("subject_marks")
        .upsert(toSave, { onConflict: "id" });

      if (subjectsError) throw subjectsError;

      if (entry && entry.subject_marks) {
        const toDelete = entry.subject_marks.filter(
          (oldItem: any) => oldItem.id && !subjects.some((newItem) => newItem.id === oldItem.id)
        );

        if (toDelete.length > 0) {
          await supabase
            .from("subject_marks")
            .delete()
            .in(
              "id",
              toDelete.map((item: any) => item.id)
            );
        }
      }

      NativeAlert.alert("Success", "Record saved.");
      onSave();
      setIsOpen(false);
    } catch (e: any) {
      NativeAlert.alert("Error", e.message || "Failed to save record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsOpen(false)}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{entry?.id ? "Edit" : "Add"} Record</Text>
            <Text style={styles.subtitle}>
              {entry?.id ? "Update academic record" : "Create new academic record"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsOpen(false)}
            style={styles.closeButton}
          >
            <X size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.fieldLabel}>Exam / Semester Title</Text>

            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. SSLC"
              placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subjects & Marks</Text>
              <Text style={styles.sectionSubtitle}>Add subject-wise results</Text>
            </View>

            <View style={styles.subjectStack}>
              {subjects.map((sub, i) => (
                <View key={i} style={styles.subjectCard}>
                  <TextInput
                    style={styles.subjectInput}
                    value={sub.subject_name}
                    onChangeText={(t) => updateSubject(i, "subject_name", t)}
                    placeholder="Subject Name"
                    placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
                    autoCapitalize="characters"
                  />

                  <View style={styles.subjectBottomRow}>
                    <TextInput
                      style={styles.markInput}
                      value={sub.marks_obtained}
                      onChangeText={(t) => updateSubject(i, "marks_obtained", t)}
                      placeholder="Mark"
                      placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
                      autoCapitalize="characters"
                    />

                    <View style={styles.passSwitchWrap}>
                      <Text
                        style={[
                          styles.passSwitchText,
                          sub.status ? styles.passText : styles.failText,
                        ]}
                      >
                        {sub.status ? "PASS" : "FAIL"}
                      </Text>

                      <Switch
                        value={!!sub.status}
                        onValueChange={(v) => updateSubject(i, "status", v)}
                        trackColor={{
                          false: theme.colors.border,
                          true: theme.colors.success,
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() => removeSubject(i)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={addSubject}
              style={styles.addSubjectButton}
            >
              <PlusCircle size={20} color={theme.colors.textSecondary} />
              <Text style={styles.addSubjectButtonText}>Add Subject</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color={theme.colors.textOnDark} />
            ) : (
              <Save size={20} color={theme.colors.textOnDark} />
            )}

            <Text style={styles.saveButtonText}>Save Record</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
    marginLeft: 2,
  },
  titleInput: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  subjectStack: {
    gap: 12,
  },
  subjectCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
  },
  subjectInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
    marginBottom: 12,
  },
  subjectBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  passSwitchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingLeft: 10,
    paddingRight: 6,
    minHeight: 48,
  },
  passSwitchText: {
    marginRight: 8,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  passText: {
    color: theme.colors.success,
  },
  failText: {
    color: theme.colors.error,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  addSubjectButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addSubjectButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingTop: 14,
    paddingBottom: 18,
  },
  saveButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});