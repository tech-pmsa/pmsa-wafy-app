import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Pencil,
  Trash2,
  PlusCircle,
  BookMarked,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

export function AcademicsTab({ entries, onAdd, onEdit, onDelete }: any) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <View style={styles.rootCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Academic Records</Text>
          <Text style={styles.subtitle}>A record of your performance.</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={onAdd}
          style={styles.addButton}
        >
          <PlusCircle size={16} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {entries && entries.length > 0 ? (
        <View style={styles.stack}>
          {entries.map((entry: any) => {
            const isExpanded = expandedId === entry.id;

            return (
              <View key={entry.id} style={styles.entryCard}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={styles.entryHeader}
                >
                  <Text style={styles.entryTitle}>{entry.title}</Text>

                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => onEdit(entry)}
                      style={styles.iconButton}
                    >
                      <Pencil size={16} color={theme.colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => onDelete(entry.id)}
                      style={styles.iconButton}
                    >
                      <Trash2 size={16} color={theme.colors.error} />
                    </TouchableOpacity>

                    {isExpanded ? (
                      <ChevronUp size={22} color={theme.colors.textMuted} />
                    ) : (
                      <ChevronDown size={22} color={theme.colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.entryBody}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableHeadText, { flex: 1 }]}>Subject</Text>
                      <Text style={[styles.tableHeadText, { width: 64 }]}>Mark</Text>
                      <Text style={[styles.tableHeadText, { width: 72, textAlign: "right" }]}>
                        Status
                      </Text>
                    </View>

                    {entry.subject_marks && entry.subject_marks.length > 0 ? (
                      entry.subject_marks.map((sub: any) => {
                        const passed = !!sub.status;

                        return (
                          <View key={sub.id} style={styles.subjectRow}>
                            <Text style={[styles.subjectName, { flex: 1 }]}>
                              {sub.subject_name}
                            </Text>

                            <Text style={[styles.subjectMark, { width: 64 }]}>
                              {sub.marks_obtained}
                            </Text>

                            <View style={{ width: 72, alignItems: "flex-end" }}>
                              <View
                                style={[
                                  styles.statusPill,
                                  passed ? styles.passPill : styles.failPill,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusPillText,
                                    passed ? styles.passText : styles.failText,
                                  ]}
                                >
                                  {passed ? "PASS" : "FAIL"}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyInlineText}>No subjects added.</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <BookMarked size={48} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptyText}>Add your first academic record.</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  subtitle: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  addButton: {
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
  addButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  stack: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    overflow: "hidden",
  },
  entryHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  entryTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  entryBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tableHeadText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
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
    paddingRight: 8,
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
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  passText: {
    color: theme.colors.success,
  },
  failText: {
    color: theme.colors.error,
  },
  emptyInlineText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    paddingVertical: 12,
    fontFamily: "MullerMedium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
  },
  emptyTitle: {
    marginTop: 14,
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "MullerMedium",
  },
});