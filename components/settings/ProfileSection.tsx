import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert as NativeAlert,
  Switch,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import {
  User,
  Briefcase,
  Building,
  Shield,
  UserCheck,
  Phone,
  PhoneCall,
  Home,
  Pencil,
  Camera,
  Save,
  X,
  PlusCircle,
  Trash2,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

import { ProfileInfoLine } from "./profile/ProfileInfoLine";
import { FamilyDataTab } from "./profile/FamilyDataTab";
import { AcademicsTab } from "./profile/AcademicsTab";
import { MarkEditorModal } from "./profile/MarkEditorModal";

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
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
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
    onChange(siblings.filter((_: any, i: number) => i !== index));
  };

  return (
    <View style={styles.sectionCard}>
      <View style={styles.siblingTopRow}>
        <Text style={styles.siblingSectionTitle}>{title}</Text>

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
        siblings.map((sib: any, index: number) => (
          <View key={index} style={styles.siblingEditCard}>
            <View style={styles.siblingEditHeader}>
              <Text style={styles.siblingEditTitle}>
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
                  t.split(",").map((s) => s.trim()).filter(Boolean)
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
                    t.split(",").map((s) => s.trim()).filter(Boolean)
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

export default function ProfileSection() {
  const { user, details, role, loading } = useUserData();
  const isStudent = role === "student";

  const [activeTab, setActiveTab] = useState<"personal" | "academics" | "family">(
    "personal"
  );
  const [editModalTab, setEditModalTab] = useState<"personal" | "family">("personal");

  const [editOpen, setEditOpen] = useState(false);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [selectedAcademicEntry, setSelectedAcademicEntry] = useState<any | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const [personalForm, setPersonalForm] = useState<any>({});
  const [familyData, setFamilyData] = useState<any>({});
  const [fatherResponsibilitiesText, setFatherResponsibilitiesText] = useState("");
  const [academicEntries, setAcademicEntries] = useState<any[]>([]);

  const fetchExtraData = useCallback(async () => {
    if (!user || !isStudent) return;

    const [academicRes, familyRes] = await Promise.all([
      supabase
        .from("academic_entries")
        .select("*, subject_marks(*)")
        .eq("student_uid", user.id)
        .order("created_at"),
      supabase.from("family_data").select("*").eq("student_uid", user.id).single(),
    ]);

    if (academicRes.data) setAcademicEntries(academicRes.data);

    if (familyRes.data) {
      setFamilyData(familyRes.data);
      setFatherResponsibilitiesText(
        Array.isArray(familyRes.data.father_responsibilities)
          ? familyRes.data.father_responsibilities.join(", ")
          : ""
      );
    }

    if (!familyRes.data) {
      setFamilyData({});
      setFatherResponsibilitiesText("");
    }
  }, [user, isStudent]);

  useEffect(() => {
    if (details) {
      setPersonalForm(details);
    }
    fetchExtraData();
  }, [details, fetchExtraData]);

  const openEditModal = (tab: "personal" | "family") => {
    setEditModalTab(tab);
    setEditOpen(true);
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

        const filePath = `avatars/${user?.id}/${Date.now()}-avatar.png`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        const table = isStudent ? "students" : "profiles";
        const { error: updateError } = await supabase
          .from(table)
          .update({ img_url: newUrl })
          .eq("uid", user?.id);

        if (updateError) throw updateError;

        setPersonalForm((prev: any) => ({ ...prev, img_url: newUrl }));
        NativeAlert.alert("Success", "Profile picture updated.");
      }
    } catch (error: any) {
      NativeAlert.alert("Error", error.message || "Failed to update image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);

    try {
      const table = isStudent ? "students" : "profiles";
      const {
        name,
        phone,
        guardian,
        g_phone,
        address,
        designation,
        batch,
      } = personalForm;

      const updatedData = isStudent
        ? { name, phone, guardian, g_phone, address }
        : { name, designation, batch };

      const { error: updateError } = await supabase
        .from(table)
        .update(updatedData)
        .eq("uid", user.id);

      if (updateError) throw updateError;

      if (isStudent) {
        const familyPayload = {
          ...familyData,
          father_responsibilities: fatherResponsibilitiesText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          student_uid: user.id,
        };

        const { error: familyError } = await supabase.from("family_data").upsert(familyPayload);

        if (familyError) throw familyError;
      }

      NativeAlert.alert("Success", "Profile updated successfully.");
      setEditOpen(false);
      fetchExtraData();
    } catch (error: any) {
      NativeAlert.alert("Error", error.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAcademicEntry = async (id: number) => {
    const { error } = await supabase.from("academic_entries").delete().eq("id", id);

    if (!error) {
      fetchExtraData();
      NativeAlert.alert("Deleted", "Academic record deleted.");
    } else {
      NativeAlert.alert("Error", "Failed to delete record.");
    }
  };

  const handleFamilyChange = (field: string, value: any) => {
    setFamilyData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSiblingsUpdate = (type: "brothers" | "sisters", updated: any[]) => {
    setFamilyData((prev: any) => ({ ...prev, [type]: updated }));
  };

  if (loading || !details) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.profileCard}>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleAvatarUpdate}
          disabled={isSaving}
          style={styles.avatarTouchable}
        >
          <View style={styles.avatarWrap}>
            {personalForm.img_url ? (
              <Image source={{ uri: personalForm.img_url }} style={styles.avatarImage} />
            ) : (
              <User size={48} color={theme.colors.textMuted} />
            )}
          </View>

          <View style={styles.cameraBadge}>
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.textOnDark} />
            ) : (
              <Camera size={18} color={theme.colors.textOnDark} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{details.name}</Text>

        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{details.role}</Text>
        </View>

        <Text style={styles.profileEmail}>{details.email}</Text>
      </View>

      <View style={styles.tabWrap}>
        <TabButton
          label="Personal"
          active={activeTab === "personal"}
          onPress={() => setActiveTab("personal")}
        />

        {isStudent && (
          <>
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
          </>
        )}
      </View>

      <View style={styles.contentCard}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>
            {activeTab === "personal"
              ? "Personal Details"
              : activeTab === "academics"
              ? "Academic Records"
              : "Family Data"}
          </Text>

          {(activeTab === "personal" || (isStudent && activeTab === "family")) && (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => openEditModal(activeTab === "family" ? "family" : "personal")}
              style={styles.editCircle}
            >
              <Pencil size={18} color={theme.colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === "personal" && (
          <View>
            {isStudent ? (
              <>
                <ProfileInfoLine icon={UserCheck} label="CIC Number" value={details.cic} />
                <ProfileInfoLine icon={Building} label="Class" value={details.class_id} />
                <ProfileInfoLine icon={Shield} label="Council" value={details.council} />
                <ProfileInfoLine icon={Phone} label="Phone" value={details.phone} />
                <ProfileInfoLine icon={User} label="Guardian" value={details.guardian} />
                <ProfileInfoLine icon={PhoneCall} label="Guardian Phone" value={details.g_phone} />
                <ProfileInfoLine icon={Home} label="Address" value={details.address} />
              </>
            ) : (
              <>
                <ProfileInfoLine icon={Briefcase} label="Designation" value={details.designation} />
                <ProfileInfoLine icon={Building} label="Related to" value={details.batch} />
              </>
            )}
          </View>
        )}

        {activeTab === "academics" && (
          <AcademicsTab
            entries={academicEntries}
            onAdd={() => {
              setSelectedAcademicEntry(null);
              setIsMarkModalOpen(true);
            }}
            onEdit={(entry: any) => {
              setSelectedAcademicEntry(entry);
              setIsMarkModalOpen(true);
            }}
            onDelete={handleDeleteAcademicEntry}
          />
        )}

        {activeTab === "family" && <FamilyDataTab data={familyData} />}
      </View>

      <Modal
        visible={editOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Text style={styles.modalSubtitle}>Update your details</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setEditOpen(false)}
              style={styles.closeCircle}
            >
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {isStudent && (
            <View style={styles.modalTabWrap}>
              <TabButton
                label="Personal"
                active={editModalTab === "personal"}
                onPress={() => setEditModalTab("personal")}
              />
              <TabButton
                label="Family"
                active={editModalTab === "family"}
                onPress={() => setEditModalTab("family")}
              />
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {(!isStudent || editModalTab === "personal") && (
              <View style={styles.sectionCard}>
                <InputField
                  label="Full Name"
                  value={personalForm.name || ""}
                  onChangeText={(t) => setPersonalForm({ ...personalForm, name: t })}
                />

                {isStudent ? (
                  <>
                    <InputField
                      label="Phone Number"
                      value={personalForm.phone || ""}
                      keyboardType="phone-pad"
                      onChangeText={(t) => setPersonalForm({ ...personalForm, phone: t })}
                    />

                    <InputField
                      label="Guardian Name"
                      value={personalForm.guardian || ""}
                      onChangeText={(t) => setPersonalForm({ ...personalForm, guardian: t })}
                    />

                    <InputField
                      label="Guardian Phone"
                      value={personalForm.g_phone || ""}
                      keyboardType="phone-pad"
                      onChangeText={(t) => setPersonalForm({ ...personalForm, g_phone: t })}
                    />

                    <InputField
                      label="Address"
                      value={personalForm.address || ""}
                      multiline
                      onChangeText={(t) => setPersonalForm({ ...personalForm, address: t })}
                    />
                  </>
                ) : (
                  <InputField
                    label="Designation"
                    value={personalForm.designation || ""}
                    onChangeText={(t) => setPersonalForm({ ...personalForm, designation: t })}
                  />
                )}
              </View>
            )}

            {isStudent && editModalTab === "family" && (
              <View>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Household</Text>

                  <InputField
                    label="Total Family Members"
                    value={familyData.total_family_members?.toString() || ""}
                    keyboardType="numeric"
                    onChangeText={(t) =>
                      handleFamilyChange(
                        "total_family_members",
                        t ? parseInt(t, 10) || null : null
                      )
                    }
                  />

                  <InputField
                    label="House Type"
                    value={familyData.house_type || ""}
                    onChangeText={(t) => handleFamilyChange("house_type", t)}
                  />

                  <View style={styles.switchFieldWrap}>
                    <Text style={styles.fieldLabel}>
                      Are there chronically ill members in the house?
                    </Text>
                    <View style={styles.switchRow}>
                      <Text style={styles.switchText}>
                        {familyData.chronically_ill_members ? "Yes" : "No"}
                      </Text>
                      <Switch
                        value={!!familyData.chronically_ill_members}
                        onValueChange={(v) => handleFamilyChange("chronically_ill_members", v)}
                        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>Parent Details</Text>

                  <InputField
                    label="Father's Name"
                    value={familyData.father_name || ""}
                    onChangeText={(t) => handleFamilyChange("father_name", t)}
                  />

                  <InputField
                    label="Father's Occupation"
                    value={familyData.father_occupation || ""}
                    onChangeText={(t) => handleFamilyChange("father_occupation", t)}
                  />

                  <InputField
                    label="Father's Staying Place"
                    value={familyData.father_staying_place || ""}
                    onChangeText={(t) => handleFamilyChange("father_staying_place", t)}
                  />

                  <InputField
                    label="Father's Responsibilities (comma separated)"
                    value={fatherResponsibilitiesText}
                    multiline
                    onChangeText={(t) => setFatherResponsibilitiesText(t)}
                  />

                  <InputField
                    label="Mother's Name"
                    value={familyData.mother_name || ""}
                    onChangeText={(t) => handleFamilyChange("mother_name", t)}
                  />

                  <InputField
                    label="Mother's Occupation"
                    value={familyData.mother_occupation || ""}
                    onChangeText={(t) => handleFamilyChange("mother_occupation", t)}
                  />
                </View>

                <SiblingCard
                  title="brothers"
                  siblings={familyData.brothers || []}
                  onChange={(next) => handleSiblingsUpdate("brothers", next)}
                  showResponsibilities={true}
                />

                <SiblingCard
                  title="sisters"
                  siblings={familyData.sisters || []}
                  onChange={(next) => handleSiblingsUpdate("sisters", next)}
                  showResponsibilities={false}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.86}
              style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.textOnDark} style={{ marginRight: 8 }} />
              ) : (
                <Save size={18} color={theme.colors.textOnDark} />
              )}
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isStudent && (
        <MarkEditorModal
          isOpen={isMarkModalOpen}
          setIsOpen={setIsMarkModalOpen}
          entry={selectedAcademicEntry}
          onSave={fetchExtraData}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: 20,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  avatarTouchable: {
    position: "relative",
    marginBottom: 16,
  },
  avatarWrap: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceSoft,
    justifyContent: "center",
    alignItems: "center",
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "MullerBold",
    textAlign: "center",
  },
  rolePill: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginTop: 10,
  },
  rolePillText: {
    color: theme.colors.primary,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  profileEmail: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerMedium",
    marginTop: 10,
    textAlign: "center",
  },
  tabWrap: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
  },
  contentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  contentTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  editCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 56,
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  modalSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  closeCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTabWrap: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 6,
    marginBottom: 16,
    gap: 8,
  },
  modalScrollContent: {
    paddingBottom: 30,
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
  sectionCardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
    marginBottom: 14,
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
  switchFieldWrap: {
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
  siblingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  siblingSectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    textTransform: "capitalize",
    fontFamily: "MullerBold",
  },
  addMiniButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  addMiniButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  siblingEditCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  siblingEditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  siblingEditTitle: {
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
  emptyInlineText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textAlign: "center",
    paddingVertical: 8,
  },
  modalFooter: {
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