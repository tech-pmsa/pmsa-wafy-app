import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert as NativeAlert,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { Award, FileText, X, Upload, Sparkles } from "lucide-react-native";
import { theme } from "@/theme/theme";

const STORAGE_BUCKET = "achievements";

export default function AchievementsForm() {
  const { user, details } = useUserData();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setProofFile(null);
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];

        if (file.size && file.size > 5 * 1024 * 1024) {
          return NativeAlert.alert(
            "File Too Large",
            "Please select a file smaller than 5MB."
          );
        }

        setProofFile(file);
      }
    } catch (err: any) {
      NativeAlert.alert("File Error", err?.message || "Could not select file.");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      return NativeAlert.alert("Required", "Title and description are required.");
    }

    if (!user || !details?.name) {
      return NativeAlert.alert("Error", "User data incomplete.");
    }

    setLoading(true);
    let proofUrl: string | null = null;

    try {
      if (proofFile) {
        const base64 = await FileSystem.readAsStringAsync(proofFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileExt = proofFile.name?.split(".").pop() || "bin";
        const fileName = `${details.cic || user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, decode(base64), {
            contentType: proofFile.mimeType || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath);

        proofUrl = publicUrlData.publicUrl;
      }

      const insertPayload = {
        title: title.trim(),
        description: description.trim(),
        proof_url: proofUrl,
        student_uid: user.id,
        name: details.name,
        cic: details.cic || null,
        batch: details.batch || null,
        approved: false,
      };

      const { error } = await supabase.from("achievements").insert([insertPayload]);

      if (error) throw error;

      NativeAlert.alert(
        "Submitted",
        "Your achievement has been submitted for approval."
      );

      resetForm();
      setIsOpen(false);
    } catch (err: any) {
      NativeAlert.alert("Error", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isImage =
    proofFile?.mimeType?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp)$/i.test(proofFile?.name || "");

  return (
    <>
      <View style={styles.triggerCard}>
        <View style={styles.triggerTopRow}>
          <View style={styles.triggerIconWrap}>
            <Award size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.triggerPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.triggerPillText}>Submit</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Add Achievement</Text>
        <Text style={styles.sectionSubtitle}>
          Submit your new achievement with title, description, and optional proof.
        </Text>

        <TouchableOpacity
          onPress={() => setIsOpen(true)}
          activeOpacity={0.86}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Open Submission Form</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalTitle}>Submit Achievement</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                activeOpacity={0.84}
                style={styles.closeButton}
              >
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. District Level Speech Winner"
                placeholderTextColor={
                  theme.colors.inputPlaceholder ?? theme.colors.textMuted
                }
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Describe the achievement clearly..."
                placeholderTextColor={
                  theme.colors.inputPlaceholder ?? theme.colors.textMuted
                }
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>Proof File (Optional)</Text>
              <TouchableOpacity
                onPress={handleFileSelect}
                activeOpacity={0.84}
                style={styles.uploadButton}
              >
                <Upload size={17} color={theme.colors.text} />
                <Text style={styles.uploadButtonText}>
                  {proofFile ? "Change File" : "Choose File"}
                </Text>
              </TouchableOpacity>

              {proofFile && (
                <View style={styles.filePreviewCard}>
                  {isImage ? (
                    <Image source={{ uri: proofFile.uri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.fileIconWrap}>
                      <FileText size={22} color={theme.colors.primary} />
                    </View>
                  )}

                  <View style={styles.fileInfoWrap}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {proofFile.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {proofFile.size
                        ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB`
                        : "File selected"}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSubmit}
                activeOpacity={0.86}
                style={[styles.primaryButtonFull, loading && styles.buttonDisabled]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.textOnDark} />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit for Approval</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  triggerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  triggerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  triggerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  triggerPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
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
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonFull: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "88%",
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    marginBottom: 14,
  },
  textarea: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    padding: 14,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    marginBottom: 14,
  },
  uploadButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  filePreviewCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 12,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  fileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fileInfoWrap: {
    flex: 1,
  },
  fileName: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  fileMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});