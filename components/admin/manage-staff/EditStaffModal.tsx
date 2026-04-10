import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Image,
  Alert as NativeAlert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabaseClient";
import { Camera, Save, X, User } from "lucide-react-native";
import { theme } from "@/theme/theme";

export function EditStaffModal({ isOpen, setIsOpen, staff, onSave }: any) {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (staff && isOpen) {
      setName(staff.name);
      setPreview(staff.img_url);
    }
  }, [staff, isOpen]);

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

        const filePath = `avatars/${staff.uid}/${Date.now()}-avatar.png`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        await supabase.from("profiles").update({ img_url: newUrl }).eq("uid", staff.uid);

        setPreview(newUrl);
      }
    } catch (error: any) {
      NativeAlert.alert("Error", "Could not upload image.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!staff) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ name }).eq("uid", staff.uid);
      if (error) throw error;

      NativeAlert.alert("Success", "Staff profile updated.");
      onSave();
      setIsOpen(false);
    } catch (err: any) {
      NativeAlert.alert("Save failed", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsOpen(false)}
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Edit Staff</Text>
            <Text style={styles.subtitle}>Editing {staff?.name}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsOpen(false)}
            activeOpacity={0.84}
            style={styles.closeButton}
          >
            <X size={18} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={handleAvatarUpdate}
            disabled={isSaving}
            activeOpacity={0.86}
            style={styles.avatarTouchable}
          >
            <View style={styles.avatarWrap}>
              {preview ? (
                <Image source={{ uri: preview }} style={styles.avatarImage} />
              ) : (
                <User size={52} color={theme.colors.textMuted} />
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

          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <View style={styles.formWrap}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.colors.inputPlaceholder ?? theme.colors.textMuted}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.86}
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
    marginBottom: 26,
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
  avatarSection: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 28,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...theme.shadows.medium,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.soft,
  },
  avatarHint: {
    marginTop: 14,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  formWrap: {
    gap: 8,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginLeft: 2,
  },
  input: {
    minHeight: 54,
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
  footer: {
    marginTop: "auto",
    paddingBottom: 20,
    paddingTop: 18,
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