import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import {
  User,
  School,
  Users,
  Phone,
  Eye,
  Edit,
  Trash2,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

type StudentCardProps = {
  student: any;
  onView?: (student: any) => void;
  onEdit?: (student: any) => void;
  onDelete?: (student: any) => void;
  readOnly?: boolean;
};

export function StudentCard({
  student,
  onView,
  onEdit,
  onDelete,
  readOnly = false,
}: StudentCardProps) {
  const showView = !!onView;
  const showEdit = !readOnly && !!onEdit;
  const showDelete = !readOnly && !!onDelete;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          {student.img_url ? (
            <Image source={{ uri: student.img_url }} style={styles.avatarImage} />
          ) : (
            <User size={24} color={theme.colors.textMuted} />
          )}
        </View>

        <View style={styles.topTextWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {student.name}
          </Text>
          <Text style={styles.cic}>CIC: {student.cic || "N/A"}</Text>
        </View>
      </View>

      <View style={styles.metaSection}>
        <View style={styles.metaItem}>
          <School size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {student.class_id}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Users size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {student.council || "N/A"}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Phone size={14} color={theme.colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {student.phone || "N/A"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.actionRow,
          readOnly && styles.actionRowReadOnly,
        ]}
      >
        {showView && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => onView?.(student)}
            style={[
              styles.actionButton,
              !readOnly && (showEdit || showDelete) && styles.actionButtonGrow,
              readOnly && styles.singleActionButton,
            ]}
          >
            <Eye size={16} color={theme.colors.primary} />
            <Text style={styles.viewText}>View</Text>
          </TouchableOpacity>
        )}

        {showEdit && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => onEdit?.(student)}
            style={[styles.actionButton, styles.actionButtonBorder]}
          >
            <Edit size={16} color={theme.colors.warning} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}

        {showDelete && (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => onDelete?.(student)}
            style={styles.actionButton}
          >
            <Trash2 size={16} color={theme.colors.error} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  topRow: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  topTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "MullerBold",
  },
  cic: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  metaSection: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceSoft,
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionRowReadOnly: {
    justifyContent: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonGrow: {
    flex: 1,
  },
  singleActionButton: {
    flex: 0,
    minWidth: 120,
    paddingHorizontal: 18,
  },
  actionButtonBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
  },
  viewText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  editText: {
    color: theme.colors.warning,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  deleteText: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
});