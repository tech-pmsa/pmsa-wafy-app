import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert as NativeAlert,
  Switch,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabaseClient";
import {
  Camera,
  Save,
  X,
  User,
  PlusCircle,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { MarkEditorModal } from "@/components/settings/profile/MarkEditorModal";
import { theme } from "@/theme/theme";

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
}) {
  return (
    <View style={styles.inputFieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function SiblingCard({
  title,
  siblings,
  onChange,
  showResponsibilities,
}: {
  title: "brothers" | "sisters";
  siblings: any[];
  onChange: (next: any[]) => void;
  showResponsibilities: boolean;
}) {
  const addSibling = () => {
    onChange([
      ...siblings,
      {
        name: "",
        education: [],
        occupation: "",
        responsibilities: [],
      },
    ]);
  };

  const updateSibling = (index: number, field: string, value: any) => {
    const next = [...siblings];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const removeSibling = (index: number) => {
    onChange(siblings.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleCaps}>{title}</Text>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={addSibling}
          style={styles.addMiniButton}
        >
          <PlusCircle size={15} color={theme.colors.primary} />
          <Text style={styles.addMiniButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {siblings.length > 0 ? (
        siblings.map((sib, index) => (
          <View key={index} style={styles.siblingEditorCard}>
            <View style={styles.siblingEditorHeader}>
              <Text style={styles.siblingEditorTitle}>
                {title === "brothers" ? "Brother" : "Sister"} {index + 1}
              </Text>

              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => removeSibling(index)}
                style={styles.removeMiniButton}
              >
                <Trash2 size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            <InputField
              label="Name"
              value={sib.name || ""}
              onChangeText={(t) => updateSibling(index, "name", t)}
            />

            <InputField
              label="Education (comma separated)"
              value={Array.isArray(sib.education) ? sib.education.join(", ") : sib.education || ""}
              onChangeText={(t) =>
                updateSibling(
                  index,
                  "education",
                  t
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />

            <InputField
              label="Occupation"
              value={sib.occupation || ""}
              onChangeText={(t) => updateSibling(index, "occupation", t)}
            />

            {showResponsibilities && (
              <InputField
                label="Responsibilities (comma separated)"
                value={
                  Array.isArray(sib.responsibilities)
                    ? sib.responsibilities.join(", ")
                    : sib.responsibilities || ""
                }
                onChangeText={(t) =>
                  updateSibling(
                    index,
                    "responsibilities",
                    t
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  )
                }
              />
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyInlineText}>No {title} added.</Text>
      )}
    </View>
  );
}

export function EditStudentModal({ isOpen, setIsOpen, student, onSave }: any) {
  const [activeTab, setActiveTab] = useState<"personal" | "academics" | "family">(
    "personal"
  );
  const [personalForm, setPersonalForm] = useState<any>({});
  const [fatherResponsibilitiesText, setFatherResponsibilitiesText] = useState("");
  const [familyForm, setFamilyForm] = useState<any>({});
  const [academicEntries, setAcademicEntries] = useState<any[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedAcademicId, setExpandedAcademicId] = useState<number | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!student) return;

    const [familyRes, academicsRes] = await Promise.all([
      supabase.from("family_data").select("*").eq("student_uid", student.uid).single(),
      supabase
        .from("academic_entries")
        .select("*, subject_marks(*)")
        .eq("student_uid", student.uid)
        .order("created_at", { ascending: true }),
    ]);

    if (familyRes.data) {
      setFamilyForm(familyRes.data);
      setFatherResponsibilitiesText(
        Array.isArray(familyRes.data.father_responsibilities)
          ? familyRes.data.father_responsibilities.join(", ")
          : ""
      );
    } else {
      setFamilyForm({});
      setFatherResponsibilitiesText("");
    }

    setAcademicEntries(academicsRes.data || []);
  }, [student]);

  useEffect(() => {
    if (!student || !isOpen) return;

    setActiveTab("personal");
    setExpandedAcademicId(null);
    setSelectedEntry(null);
    setPersonalForm(student);
    setPreview(student.img_url || null);
    setUploadedImageUrl(student.img_url || null);
    fetchAllData();
  }, [student, isOpen, fetchAllData]);

  const handlePersonalChange = (field: string, value: any) => {
    setPersonalForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFamilyChange = (field: string, value: any) => {
    setFamilyForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSiblingsUpdate = (type: "brothers" | "sisters", updated: any[]) => {
    setFamilyForm((prev: any) => ({ ...prev, [type]: updated }));
  };

  const handleAvatarUpdate = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsSaving(true);

        const imageUri = result.assets[0].uri;
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const filePath = `avatars/${student.uid}/${Date.now()}-avatar.png`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        setPreview(newUrl);
        setUploadedImageUrl(newUrl);
        setPersonalForm((prev: any) => ({ ...prev, img_url: newUrl }));
      }
    } catch (error: any) {
      NativeAlert.alert("Error", error?.message || "Could not upload image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEntryDelete = async (entryId: number) => {
    const { error } = await supabase.from("academic_entries").delete().eq("id", entryId);

    if (error) {
      NativeAlert.alert("Error", error.message || "Failed to delete record.");
      return;
    }

    await fetchAllData();
    NativeAlert.alert("Success", "Academic record deleted.");
  };

  const handleSave = async () => {
    if (!student) return;

    setIsSaving(true);

    try {
      const { uid, ...restPersonal } = personalForm;

      const finalUpdateData = {
        ...restPersonal,
        img_url: uploadedImageUrl || personalForm.img_url || null,
      };

      const { error: studentError } = await supabase
        .from("students")
        .update(finalUpdateData)
        .eq("uid", student.uid);

      if (studentError) throw studentError;

      const familyPayload = {
        ...familyForm,
        father_responsibilities: fatherResponsibilitiesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        student_uid: student.uid,
      };

      const { error: familyError } = await supabase.from("family_data").upsert(familyPayload);

      if (familyError) throw familyError;

      NativeAlert.alert("Success", "Student profile updated successfully.");
      await fetchAllData();
      onSave?.();
      setIsOpen(false);
    } catch (error: any) {
      NativeAlert.alert("Error", error?.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const chronicallyIllChecked = !!familyForm.chronically_ill_members;

  const personalFields = useMemo(
    () => [
      ["Full Name", "name"],
      ["Class ID", "class_id"],
      ["Batch", "batch"],
      ["Council", "council"],
      ["CIC", "cic"],
      ["Phone", "phone"],
      ["Guardian Name", "guardian"],
      ["Guardian Phone", "g_phone"],
      ["SSLC Board", "sslc"],
      ["Plus Two Board", "plustwo"],
      ["Plus Two Stream", "plustwo_streams"],
    ],
    []
  );

  if (!student) return null;

  return (
    <>
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Editing {student.name}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabWrap}>
            <TabButton
              label="Personal"
              active={activeTab === "personal"}
              onPress={() => setActiveTab("personal")}
            />
            <TabButton
              label="Academics"
              active={activeTab === "academics"}
              onPress={() => setActiveTab("academics")}
            />
            <TabButton
              label="Family"
              active={activeTab === "family"}
              onPress={() => setActiveTab("family")}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {activeTab === "personal" && (
              <View style={styles.sectionCard}>
                <View style={styles.avatarSection}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={handleAvatarUpdate}
                    disabled={isSaving}
                    style={styles.avatarTouchable}
                  >
                    <View style={styles.avatarWrap}>
                      {preview ? (
                        <Image source={{ uri: preview }} style={styles.avatarImage} />
                      ) : (
                        <User size={44} color={theme.colors.textMuted} />
                      )}
                    </View>

                    <View style={styles.cameraBadge}>
                      {isSaving ? (
                        <ActivityIndicator size="small" color={theme.colors.textOnDark} />
                      ) : (
                        <Camera size={16} color={theme.colors.textOnDark} />
                      )}
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.avatarHint}>Tap to change photo</Text>
                </View>

                {personalFields.map(([label, key]) => (
                  <InputField
                    key={key}
                    label={label}
                    value={personalForm[key] || ""}
                    onChangeText={(t) => handlePersonalChange(key, t)}
                    keyboardType={
                      key === "phone" || key === "g_phone" ? "phone-pad" : "default"
                    }
                  />
                ))}

                <InputField
                  label="Address"
                  value={personalForm.address || ""}
                  onChangeText={(t) => handlePersonalChange("address", t)}
                  multiline
                />
              </View>
            )}

            {activeTab === "academics" && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Academic Records</Text>

                  <TouchableOpacity
                    activeOpacity={0.84}
                    onPress={() => {
                      setSelectedEntry(null);
                      setIsMarkModalOpen(true);
                    }}
                    style={styles.addMiniButton}
                  >
                    <PlusCircle size={15} color={theme.colors.primary} />
                    <Text style={styles.addMiniButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {academicEntries.length > 0 ? (
                  academicEntries.map((entry: any) => {
                    const isExpanded = expandedAcademicId === entry.id;

                    return (
                      <View key={entry.id} style={styles.academicCard}>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() =>
                            setExpandedAcademicId(isExpanded ? null : entry.id)
                          }
                          style={styles.academicHeader}
                        >
                          <Text style={styles.academicTitle}>{entry.title}</Text>

                          <View style={styles.academicHeaderActions}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedEntry(entry);
                                setIsMarkModalOpen(true);
                              }}
                              style={styles.iconActionButton}
                            >
                              <Pencil size={16} color={theme.colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleEntryDelete(entry.id)}
                              style={styles.iconActionButton}
                            >
                              <Trash2 size={16} color={theme.colors.error} />
                            </TouchableOpacity>

                            {isExpanded ? (
                              <ChevronUp size={20} color={theme.colors.textMuted} />
                            ) : (
                              <ChevronDown size={20} color={theme.colors.textMuted} />
                            )}
                          </View>
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={styles.academicBody}>
                            <View style={styles.subjectHeader}>
                              <Text style={[styles.subjectHeadText, { flex: 1 }]}>
                                Subject
                              </Text>
                              <Text style={[styles.subjectHeadText, { width: 70 }]}>
                                Mark
                              </Text>
                              <Text
                                style={[
                                  styles.subjectHeadText,
                                  { width: 82, textAlign: "right" },
                                ]}
                              >
                                Status
                              </Text>
                            </View>

                            {entry.subject_marks && entry.subject_marks.length > 0 ? (
                              entry.subject_marks.map((subject: any) => (
                                <View key={subject.id} style={styles.subjectRow}>
                                  <Text style={[styles.subjectName, { flex: 1 }]}>
                                    {subject.subject_name}
                                  </Text>
                                  <Text style={[styles.subjectMark, { width: 70 }]}>
                                    {subject.marks_obtained}
                                  </Text>

                                  <View style={{ width: 82, alignItems: "flex-end" }}>
                                    <View
                                      style={[
                                        styles.statusPill,
                                        subject.status
                                          ? styles.passPill
                                          : styles.failPill,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.statusPillText,
                                          subject.status
                                            ? styles.passText
                                            : styles.failText,
                                        ]}
                                      >
                                        {subject.status ? "Passed" : "Failed"}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              ))
                            ) : (
                              <Text style={styles.emptyInlineText}>
                                No subjects added.
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyInlineText}>
                    No academic records found.
                  </Text>
                )}
              </View>
            )}

            {activeTab === "family" && (
              <View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Household</Text>

                  <InputField
                    label="Total Family Members"
                    value={familyForm.total_family_members?.toString() || ""}
                    onChangeText={(t) =>
                      handleFamilyChange(
                        "total_family_members",
                        t ? parseInt(t, 10) || null : null
                      )
                    }
                    keyboardType="numeric"
                  />

                  <InputField
                    label="House Type"
                    value={familyForm.house_type || ""}
                    onChangeText={(t) => handleFamilyChange("house_type", t)}
                  />

                  <View style={styles.toggleFieldWrap}>
                    <Text style={styles.fieldLabel}>Are there chronically ill members?</Text>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchText}>
                        {chronicallyIllChecked ? "Yes" : "No"}
                      </Text>
                      <Switch
                        value={chronicallyIllChecked}
                        onValueChange={(value) =>
                          handleFamilyChange("chronically_ill_members", value)
                        }
                        trackColor={{
                          false: theme.colors.border,
                          true: theme.colors.primary,
                        }}
                      />
                    </View>
                  </View>

                  <InputField
                    label="Father's Name"
                    value={familyForm.father_name || ""}
                    onChangeText={(t) => handleFamilyChange("father_name", t)}
                  />

                  <InputField
                    label="Father's Occupation"
                    value={familyForm.father_occupation || ""}
                    onChangeText={(t) => handleFamilyChange("father_occupation", t)}
                  />

                  <InputField
                    label="Father's Staying Place"
                    value={familyForm.father_staying_place || ""}
                    onChangeText={(t) =>
                      handleFamilyChange("father_staying_place", t)
                    }
                  />

                  <InputField
                    label="Father's Responsibilities (comma separated)"
                    value={fatherResponsibilitiesText}
                    multiline
                    onChangeText={(t) => setFatherResponsibilitiesText(t)}
                  />

                  <InputField
                    label="Mother's Name"
                    value={familyForm.mother_name || ""}
                    onChangeText={(t) => handleFamilyChange("mother_name", t)}
                  />

                  <InputField
                    label="Mother's Occupation"
                    value={familyForm.mother_occupation || ""}
                    onChangeText={(t) => handleFamilyChange("mother_occupation", t)}
                  />
                </View>

                <SiblingCard
                  title="brothers"
                  siblings={familyForm.brothers || []}
                  onChange={(next) => handleSiblingsUpdate("brothers", next)}
                  showResponsibilities={true}
                />

                <SiblingCard
                  title="sisters"
                  siblings={familyForm.sisters || []}
                  onChange={(next) => handleSiblingsUpdate("sisters", next)}
                  showResponsibilities={false}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.textOnDark} />
              ) : (
                <Save size={18} color={theme.colors.textOnDark} />
              )}
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {student && (
        <MarkEditorModal
          isOpen={isMarkModalOpen}
          setIsOpen={setIsMarkModalOpen}
          entry={selectedEntry}
          student_uid={student.uid}
          onSave={fetchAllData}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
    paddingTop: 14,
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
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabWrap: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 6,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    ...theme.shadows.soft,
  },
  tabButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  sectionTitleCaps: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    textTransform: "capitalize",
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.medium,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  inputFieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  textarea: {
    minHeight: 110,
    paddingTop: 14,
    paddingBottom: 14,
  },
  addMiniButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  addMiniButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  siblingEditorCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  siblingEditorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  siblingEditorTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  removeMiniButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.errorSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  academicCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  academicHeader: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  academicTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  academicHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconActionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  academicBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  subjectHeader: {
    flexDirection: "row",
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subjectHeadText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(216,225,236,0.6)",
  },
  subjectName: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerBold",
    paddingRight: 10,
  },
  subjectMark: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  passPill: {
    backgroundColor: theme.colors.successSoft,
    borderColor: "rgba(22,163,74,0.14)",
  },
  failPill: {
    backgroundColor: theme.colors.errorSoft,
    borderColor: "rgba(220,38,38,0.14)",
  },
  statusPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  passText: {
    color: theme.colors.success,
  },
  failText: {
    color: theme.colors.error,
  },
  toggleFieldWrap: {
    marginBottom: 14,
  },
  switchRow: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchText: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  emptyInlineText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textAlign: "center",
    paddingVertical: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingTop: 14,
    paddingBottom: 18,
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
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});