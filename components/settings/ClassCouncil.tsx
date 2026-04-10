import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
  StyleSheet,
} from "react-native";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import {
  Pencil,
  Crown,
  Banknote,
  ShieldCheck,
  Users,
  Speaker,
  Save,
  X,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

const councilPositions = [
  { key: "batch", label: "Batch", icon: Users },
  { key: "president", label: "President", icon: Crown },
  { key: "vicepresident", label: "Vice President", icon: Users },
  { key: "secretary", label: "Secretary", icon: Pencil },
  { key: "treasurer", label: "Treasurer", icon: Banknote },
  { key: "auditor", label: "Auditor", icon: ShieldCheck },
  { key: "pro", label: "PRO", icon: Speaker },
];

export default function ClassCouncil() {
  const { user, loading: userLoading } = useUserData();
  const [council, setCouncil] = useState<any>(null);
  const [originalCouncil, setOriginalCouncil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchCouncil = async () => {
      if (!user?.id) {
        if (!userLoading) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("class_council")
        .select("*")
        .eq("uid", user.id)
        .single();

      if (data) {
        setCouncil(data);
        setOriginalCouncil(data);
      } else {
        const blank = councilPositions.reduce(
          (acc, pos) => ({ ...acc, [pos.key]: "" }),
          { uid: user.id }
        );
        setCouncil(blank);
        setOriginalCouncil(blank);
      }

      setLoading(false);
    };

    fetchCouncil();
  }, [user, userLoading]);

  const handleSubmit = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from("class_council")
      .upsert({ ...council, uid: user?.id });

    if (error) {
      NativeAlert.alert("Error", error.message);
    } else {
      NativeAlert.alert("Success", "Class council updated successfully!");
      setOriginalCouncil(council);
      setEditMode(false);
    }

    setIsSaving(false);
  };

  if (loading || userLoading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading Council Details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootCard}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.title}>Class Council</Text>
          <Text style={styles.subtitle}>
            {editMode ? "Update assigned names" : `Batch: ${council?.batch || "N/A"}`}
          </Text>
        </View>

        {!editMode && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setEditMode(true)}
            style={styles.iconButton}
          >
            <Pencil size={18} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.stack}>
        {councilPositions.map(({ key, label, icon: Icon }) => (
          <View key={key} style={styles.positionCard}>
            <View style={styles.positionIconWrap}>
              <Icon size={20} color={theme.colors.textSecondary} />
            </View>

            <View style={styles.positionContent}>
              <Text style={styles.positionLabel}>{label}</Text>

              {editMode ? (
                <TextInput
                  style={styles.positionInput}
                  value={council?.[key] || ""}
                  onChangeText={(t) => setCouncil({ ...council, [key]: t })}
                  placeholder="Enter name"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder ?? theme.colors.textMuted
                  }
                />
              ) : (
                <Text style={styles.positionValue}>
                  {council?.[key] || "Not Assigned"}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {editMode && (
        <View style={styles.footerRow}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => {
              setCouncil(originalCouncil);
              setEditMode(false);
            }}
            style={styles.cancelButton}
          >
            <X size={16} color={theme.colors.text} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={handleSubmit}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.colors.textOnDark} />
            ) : (
              <Save size={16} color={theme.colors.textOnDark} />
            )}
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  loadingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.medium,
  },
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stack: {
    gap: 12,
  },
  positionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 14,
  },
  positionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  positionContent: {
    flex: 1,
    marginLeft: 12,
  },
  positionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  positionValue: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  positionInput: {
    marginTop: 6,
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
    paddingVertical: 6,
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});