import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as NativeAlert,
} from "react-native";
import {
  GraduationCap,
  School,
  Calendar,
  MapPin,
  BookOpen,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Award,
  Info,
} from "lucide-react-native";
import { theme } from "@/theme/theme";
import { AcademicRecord, ACADEMIC_SCHEMES } from "@/lib/academicUtils";

interface AcademicCardProps {
  record: AcademicRecord;
  showStudent?: boolean;
  canEdit?: boolean;
  onEdit?: (record: AcademicRecord) => void;
  onDelete?: (record: AcademicRecord) => void;
}

export function AcademicCard({
  record,
  showStudent = false,
  canEdit = false,
  onEdit,
  onDelete,
}: AcademicCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isDegree = record.academic_type === "degree";
  const title = isDegree
    ? `${record.course_name || "Degree"}${record.course_specialisation ? ` - ${record.course_specialisation}` : ""}`
    : record.stream
    ? `${record.stream} Stream`
    : record.course_name || record.academic_type.toUpperCase();

  const institutionName = record.school_name || record.university || "Not Specified";
  const location = record.school_location;

  const resultStatus = (record.result || record.degree_status || "").toLowerCase();
  const isPassed = resultStatus === "passed" || resultStatus === "completed";
  const isFailed = resultStatus === "failed" || resultStatus === "arrear/backlog" || resultStatus === "discontinued";
  const isAppearing = resultStatus === "appearing" || resultStatus === "studying" || resultStatus === "result awaited";

  const schemeInfo = ACADEMIC_SCHEMES.find((s) => s.value === record.academic_scheme);

  const confirmDelete = () => {
    NativeAlert.alert(
      "Delete Record",
      `Are you sure you want to delete this ${record.academic_type} record?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(record),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {showStudent && (
        <View style={styles.studentBanner}>
          <Text style={styles.studentName}>{record.student_name}</Text>
          {record.student_cic ? (
            <Text style={styles.studentCic}>CIC: {record.student_cic}</Text>
          ) : null}
        </View>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconWrap}>
            {isDegree ? (
              <GraduationCap size={18} color={theme.colors.primary} />
            ) : (
              <School size={18} color={theme.colors.secondary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>
              {record.academic_type === "+1"
                ? "Higher Secondary (+1)"
                : record.academic_type === "+2"
                ? "Higher Secondary (+2)"
                : record.academic_type === "degree"
                ? `${record.degree_level || "Degree"} Programme`
                : "Diploma / Certificate"}
            </Text>
          </View>
        </View>

        {/* Result Badge */}
        <View
          style={[
            styles.badge,
            isPassed
              ? styles.badgeSuccess
              : isFailed
              ? styles.badgeError
              : isAppearing
              ? styles.badgeInfo
              : styles.badgeNeutral,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isPassed
                ? styles.badgeTextSuccess
                : isFailed
                ? styles.badgeTextError
                : isAppearing
                ? styles.badgeTextInfo
                : styles.badgeTextNeutral,
            ]}
          >
            {(record.result || record.degree_status || "Recorded").toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Key Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailRow}>
          <School size={14} color={theme.colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {institutionName}
          </Text>
        </View>

        {location ? (
          <View style={styles.detailRow}>
            <MapPin size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}

        {record.academic_year || record.admission_year ? (
          <View style={styles.detailRow}>
            <Calendar size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              {isDegree
                ? `Adm Year: ${record.admission_year || "-"}`
                : `Year: ${record.academic_year || "-"}`}
            </Text>
          </View>
        ) : null}

        {record.board || record.university ? (
          <View style={styles.detailRow}>
            <BookOpen size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>
              {record.board || record.university}
            </Text>
          </View>
        ) : null}

        {record.study_mode ? (
          <View style={styles.detailRow}>
            <Award size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>Mode: {record.study_mode}</Text>
          </View>
        ) : null}

        {record.school_type ? (
          <View style={styles.detailRow}>
            <School size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>Type: {record.school_type}</Text>
          </View>
        ) : null}

        {isDegree && record.academic_scheme ? (
          <View style={styles.detailRow}>
            <Info size={14} color={theme.colors.primary} />
            <Text style={[styles.detailText, { color: theme.colors.primary, fontWeight: "600" }]}>
              Scheme: {record.academic_scheme}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Scheme Description (Degree) */}
      {isDegree && schemeInfo?.desc ? (
        <View style={styles.schemeBox}>
          <Text style={styles.schemeDesc}>{schemeInfo.desc}</Text>
        </View>
      ) : null}

      {/* Expand/Collapse Subjects/Semesters */}
      {((!isDegree && (record.subjects?.length ?? 0) > 0) ||
        (isDegree && (record.semester_data?.length ?? 0) > 0)) && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
          style={styles.expandButton}
        >
          <Text style={styles.expandButtonText}>
            {expanded
              ? "Hide Details"
              : isDegree
              ? `View Semesters (${record.semester_data?.length || 0})`
              : `View Subjects (${record.subjects?.length || 0})`}
          </Text>
          {expanded ? (
            <ChevronUp size={16} color={theme.colors.primary} />
          ) : (
            <ChevronDown size={16} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      )}

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* Non-Degree Subjects */}
          {!isDegree && record.subjects && record.subjects.length > 0 && (
            <View style={styles.subjectsContainer}>
              <Text style={styles.sectionHeader}>Subjects & Marks</Text>
              {record.subjects.map((sub, idx) => (
                <View key={idx} style={styles.subjectRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{sub.subject_name}</Text>
                    <Text style={styles.subjectMark}>
                      Mark/Grade: {sub.grade_or_mark || "N/A"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.subStatusBadge,
                      sub.status === "passed"
                        ? styles.subStatusPassed
                        : styles.subStatusFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subStatusText,
                        sub.status === "passed"
                          ? styles.subStatusTextPassed
                          : styles.subStatusTextFailed,
                      ]}
                    >
                      {sub.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Degree Semesters */}
          {isDegree && record.semester_data && record.semester_data.length > 0 && (
            <View style={styles.semestersContainer}>
              <Text style={styles.sectionHeader}>Semester Breakdown</Text>
              {record.semester_data.map((sem, sIdx) => (
                <View key={sIdx} style={styles.semCard}>
                  <View style={styles.semHeader}>
                    <Text style={styles.semTitle}>Semester {sem.semester_no}</Text>
                    {sem.cgpa ? (
                      <View style={styles.cgpaPill}>
                        <Text style={styles.cgpaPillText}>CGPA: {sem.cgpa}</Text>
                      </View>
                    ) : null}
                  </View>

                  {sem.subjects && sem.subjects.length > 0 ? (
                    <View style={{ marginTop: 8 }}>
                      {sem.subjects.map((sub, subIdx) => (
                        <View key={subIdx} style={styles.semSubjectRow}>
                          <Text style={styles.semSubName}>{sub.subject_name}</Text>
                          <Text style={styles.semSubMark}>{sub.grade_or_mark || "-"}</Text>
                          <View
                            style={[
                              styles.miniStatusBadge,
                              sub.status === "passed"
                                ? styles.subStatusPassed
                                : styles.subStatusFailed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniStatusText,
                                sub.status === "passed"
                                  ? styles.subStatusTextPassed
                                  : styles.subStatusTextFailed,
                              ]}
                            >
                              {sub.status === "passed" ? "P" : "F"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptySemText}>No subjects recorded for this semester.</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions (Edit / Delete) */}
      {canEdit && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtnEdit}
            onPress={() => onEdit?.(record)}
            activeOpacity={0.8}
          >
            <Edit2 size={14} color={theme.colors.primary} />
            <Text style={styles.actionBtnEditText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnDelete}
            onPress={confirmDelete}
            activeOpacity={0.8}
          >
            <Trash2 size={14} color={theme.colors.error} />
            <Text style={styles.actionBtnDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  studentBanner: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentName: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  studentCic: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSuccess: { backgroundColor: theme.colors.successSoft },
  badgeError: { backgroundColor: theme.colors.errorSoft },
  badgeInfo: { backgroundColor: theme.colors.infoSoft },
  badgeNeutral: { backgroundColor: theme.colors.surfaceMuted },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextSuccess: { color: theme.colors.successText },
  badgeTextError: { color: theme.colors.errorText },
  badgeTextInfo: { color: theme.colors.infoText },
  badgeTextNeutral: { color: theme.colors.textSecondary },

  detailsGrid: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  schemeBox: {
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  schemeDesc: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 8,
  },
  expandButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  subjectsContainer: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 10,
    padding: 10,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  subjectName: {
    fontSize: 12.5,
    fontWeight: "600",
    color: theme.colors.text,
  },
  subjectMark: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  subStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subStatusPassed: { backgroundColor: theme.colors.successSoft },
  subStatusFailed: { backgroundColor: theme.colors.errorSoft },
  subStatusText: { fontSize: 10.5, fontWeight: "700" },
  subStatusTextPassed: { color: theme.colors.successText },
  subStatusTextFailed: { color: theme.colors.errorText },

  semestersContainer: {
    gap: 10,
  },
  semCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  semHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  semTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.text,
  },
  cgpaPill: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cgpaPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  semSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  semSubName: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.text,
  },
  semSubMark: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  miniStatusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  emptySemText: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    fontStyle: "italic",
    marginTop: 4,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  actionBtnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
  },
  actionBtnEditText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  actionBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.errorSoft,
  },
  actionBtnDeleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.errorText,
  },
});
