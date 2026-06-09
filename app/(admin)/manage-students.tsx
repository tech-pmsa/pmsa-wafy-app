import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert as NativeAlert,
  StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import {
  Search,
  ChevronsRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Sparkles,
  Download,
  Archive,
  X,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { utils, write } from "xlsx";
import { theme } from "@/theme/theme";

import { StudentCard } from "@/components/admin/manage-students/StudentCard";
import { ViewStudentModal } from "@/components/admin/manage-students/ViewStudentModal";
import { EditStudentModal } from "@/components/admin/manage-students/EditStudentModal";
import { PromoteClassModal } from "@/components/admin/manage-students/PromoteClassModal";

const STUDENT_EXPORT_COLUMNS = [
  "Name",
  "CIC",
  "Class",
  "Council",
  "Batch",
  "Phone",
  "Guardian",
  "Guardian Phone",
  "Address",
  "SSLC",
  "Plus Two",
  "Plus Two Stream",
  "Achievements",
  "Total Family Members",
  "Father Name",
  "Father Occupation",
  "Father Staying Place",
  "Father Responsibilities",
  "Mother Name",
  "Mother Occupation",
  "Brother Count",
  "Brother Details",
  "Sister Count",
  "Sister Details",
  "Chronically Ill Members",
  "House Type",
];

function valueOrBlank(value: any) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value);
}

function listText(value: any) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(valueOrBlank).filter(Boolean).join(", ");
  if (typeof value === "string") return value;
  return String(value);
}

function arrayFromJsonValue(value: any) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatSibling(sibling: any) {
  if (!sibling || typeof sibling !== "object") return valueOrBlank(sibling);

  return [
    sibling.name ? `Name: ${sibling.name}` : "",
    sibling.education ? `Education: ${listText(sibling.education)}` : "",
    sibling.occupation ? `Occupation: ${sibling.occupation}` : "",
    sibling.responsibilities
      ? `Responsibilities: ${listText(sibling.responsibilities)}`
      : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function formatSiblingList(siblings: any[]) {
  return siblings
    .map((sibling, index) => {
      const details = formatSibling(sibling);
      return details ? `${index + 1}. ${details}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function safeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function compareByCic(a: any, b: any) {
  const aCic = valueOrBlank(a?.cic).trim();
  const bCic = valueOrBlank(b?.cic).trim();
  const aNumber = Number(aCic);
  const bNumber = Number(bCic);

  if (aCic && bCic && Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }

  if (aCic && !bCic) return -1;
  if (!aCic && bCic) return 1;

  return aCic.localeCompare(bCic, undefined, { numeric: true, sensitivity: "base" })
    || valueOrBlank(a?.name).localeCompare(valueOrBlank(b?.name));
}

function formatArchiveDate(value?: string | null) {
  if (!value) return "";
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function DetailLine({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{valueOrBlank(value) || "-"}</Text>
    </View>
  );
}

function ArchivedStudentModal({
  visible,
  student,
  onClose,
}: {
  visible: boolean;
  student: any | null;
  onClose: () => void;
}) {
  if (!student) return null;

  const snapshot = student.student_data || {};
  const family = student.family_data || {};
  const brothers = arrayFromJsonValue(family.brothers);
  const sisters = arrayFromJsonValue(family.sisters);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.archiveModalScreen}>
        <ScrollView
          style={styles.archiveModalScroll}
          contentContainerStyle={styles.archiveModalContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.archiveModalTopRow}>
            <View>
              <Text style={styles.archiveModalTitle}>{student.name}</Text>
              <Text style={styles.archiveModalSubtitle}>
                {student.archive_class_id} • CIC: {student.cic || "-"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.archiveDetailCard}>
            <Text style={styles.archiveDetailTitle}>Personal Details</Text>
            <DetailLine label="Name" value={student.name} />
            <DetailLine label="CIC" value={student.cic} />
            <DetailLine label="Archive Class" value={student.archive_class_id} />
            <DetailLine label="Original Class" value={student.original_class_id} />
            <DetailLine label="Batch" value={student.batch || snapshot.batch} />
            <DetailLine label="Council" value={student.council || snapshot.council} />
            <DetailLine label="Phone" value={student.phone || snapshot.phone} />
            <DetailLine label="Guardian" value={student.guardian || snapshot.guardian} />
            <DetailLine label="Guardian Phone" value={student.g_phone || snapshot.g_phone} />
            <DetailLine label="DOB" value={formatArchiveDate(student.dob || snapshot.dob)} />
            <DetailLine label="SSLC" value={student.sslc || snapshot.sslc} />
            <DetailLine label="Plus Two" value={student.plustwo || snapshot.plustwo} />
            <DetailLine
              label="Plus Two Stream"
              value={student.plustwo_streams || snapshot.plustwo_streams}
            />
            <DetailLine label="Address" value={student.address || snapshot.address} />
            <DetailLine label="Archived At" value={formatArchiveDate(student.archived_at)} />
          </View>

          <View style={styles.archiveDetailCard}>
            <Text style={styles.archiveDetailTitle}>Family Details</Text>
            <DetailLine label="Total Family Members" value={family.total_family_members} />
            <DetailLine label="Father Name" value={family.father_name} />
            <DetailLine label="Father Occupation" value={family.father_occupation} />
            <DetailLine label="Father Staying Place" value={family.father_staying_place} />
            <DetailLine
              label="Father Responsibilities"
              value={listText(family.father_responsibilities)}
            />
            <DetailLine label="Mother Name" value={family.mother_name} />
            <DetailLine label="Mother Occupation" value={family.mother_occupation} />
            <DetailLine
              label="Chronically Ill Members"
              value={
                typeof family.chronically_ill_members === "boolean"
                  ? family.chronically_ill_members
                    ? "Yes"
                    : "No"
                  : family.chronically_ill_members
              }
            />
            <DetailLine label="House Type" value={family.house_type} />
          </View>

          <View style={styles.archiveDetailCard}>
            <Text style={styles.archiveDetailTitle}>Brothers</Text>
            {brothers.length ? (
              brothers.map((brother, index) => (
                <View key={index} style={styles.archiveSiblingCard}>
                  <Text style={styles.archiveSiblingTitle}>Brother {index + 1}</Text>
                  <Text style={styles.archiveSiblingText}>
                    {formatSibling(brother) || "-"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.oldEmptyText}>No brothers added.</Text>
            )}
          </View>

          <View style={styles.archiveDetailCard}>
            <Text style={styles.archiveDetailTitle}>Sisters</Text>
            {sisters.length ? (
              sisters.map((sister, index) => (
                <View key={index} style={styles.archiveSiblingCard}>
                  <Text style={styles.archiveSiblingTitle}>Sister {index + 1}</Text>
                  <Text style={styles.archiveSiblingText}>
                    {formatSibling(sister) || "-"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.oldEmptyText}>No sisters added.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ManageStudentsPage() {
  const {
    role: authRole,
    details: authDetails,
    loading: authLoading,
  } = useUserData();

  const [students, setStudents] = useState<any[]>([]);
  const [oldStudents, setOldStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [oldSearchQuery, setOldSearchQuery] = useState("");
  const [backupMenuOpen, setBackupMenuOpen] = useState(false);
  const [exportingClass, setExportingClass] = useState<string | null>(null);

  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [expandedOldClass, setExpandedOldClass] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [classToPromote, setClassToPromote] = useState("");
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [classToConvert, setClassToConvert] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [selectedOldStudent, setSelectedOldStudent] = useState<any | null>(null);
  const [isOldViewModalOpen, setIsOldViewModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase.from("students").select("*");

      if (authRole === "class" && authDetails?.batch) {
        query = query.eq("batch", authDetails.batch);
      }

      const { data, error } = await query.order("cic", { ascending: true });
      if (error) throw error;

      setStudents([...(data || [])].sort(compareByCic));
      setExpandedClass(null);

      if (authRole === "officer") {
        const { data: archivedData, error: archivedError } = await supabase
          .from("old_students")
          .select("*")
          .order("archive_class_id", { ascending: false })
          .order("name", { ascending: true });

        if (archivedError) throw archivedError;

        setOldStudents(archivedData || []);
        setExpandedOldClass(null);
      }
    } catch (err: any) {
      NativeAlert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, [authRole, authDetails]);

  useEffect(() => {
    if (!authLoading && authRole) fetchData();
  }, [authLoading, authRole, fetchData]);

  const handleViewClick = (student: any) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (student: any) => {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  };

  const handleOldViewClick = (student: any) => {
    setSelectedOldStudent(student);
    setIsOldViewModalOpen(true);
  };

  const handleOldDeleteClick = (student: any) => {
    NativeAlert.alert(
      "Delete Old Student",
      `Delete archived record for ${student.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("old_students")
              .delete()
              .eq("id", student.id);

            if (error) NativeAlert.alert("Error", error.message);
            else {
              NativeAlert.alert("Deleted", "Old student record deleted.");
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleDeleteClick = (student: any) => {
    NativeAlert.alert(
      "Delete Student",
      `Are you sure you want to permanently delete ${student.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.functions.invoke("admin-actions", {
              body: { action: "delete_user", uid: student.uid },
            });

            if (error) NativeAlert.alert("Error", error.message);
            else fetchData();
          },
        },
      ]
    );
  };

  const handleDeleteClassClick = (classId: string) => {
    NativeAlert.alert(
      "Delete Class",
      `Delete ALL students in ${classId}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.functions.invoke("admin-actions", {
              body: { action: "delete_class", class_id: classId },
            });

            if (error) NativeAlert.alert("Error", error.message);
            else fetchData();
          },
        },
      ]
    );
  };

  const handlePromoteClassClick = (classId: string) => {
    setClassToPromote(classId);
    setIsPromoteModalOpen(true);
  };

  const handleConvertClassClick = (classId: string) => {
    setClassToConvert(classId);
    setStartYear("");
    setEndYear("");
    setIsConvertModalOpen(true);
  };

  const getFunctionErrorMessage = async (error: any) => {
    let message = error?.message || "Request failed.";

    try {
      const response = error?.context as Response | undefined;
      const body = response ? await response.clone().json() : null;
      if (body?.error) message = body.error;
    } catch {
      // Keep SDK error message when the Edge Function body is not available.
    }

    return message;
  };

  const handleConfirmConvert = async () => {
    if (!classToConvert || isConverting) return;

    if (!/^\d{4}$/.test(startYear.trim()) || !/^\d{4}$/.test(endYear.trim())) {
      NativeAlert.alert("Required", "Enter both years in four digit format.");
      return;
    }

    const previewClass = `${startYear.trim()}-${endYear.trim().slice(2)}`;

    NativeAlert.alert(
      "Convert to Old Students",
      `Archive ${classToConvert} as ${previewClass}? Live student accounts and connected records will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Convert",
          style: "destructive",
          onPress: async () => {
            setIsConverting(true);

            try {
              const { data, error } = await supabase.functions.invoke("admin-actions", {
                body: {
                  action: "convert_old_students",
                  class_id: classToConvert,
                  start_year: startYear.trim(),
                  end_year: endYear.trim(),
                  archived_by: authDetails?.uid || null,
                },
              });

              if (error) throw new Error(await getFunctionErrorMessage(error));

              NativeAlert.alert(
                "Converted",
                data?.message || `${classToConvert} converted to old students.`
              );
              setIsConvertModalOpen(false);
              fetchData();
            } catch (err: any) {
              NativeAlert.alert("Conversion Failed", err.message);
            } finally {
              setIsConverting(false);
            }
          },
        },
      ]
    );
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;

    return students.filter(
      (s: any) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cic?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const groupedStudents = useMemo(
    () =>
      filteredStudents.reduce((acc: Record<string, any[]>, student: any) => {
        const key = student.class_id || "Unassigned";
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
      }, {} as Record<string, any[]>),
    [filteredStudents]
  );

  const groupedOldStudents = useMemo(
    () =>
      oldStudents
        .filter((student: any) => {
          const q = oldSearchQuery.trim().toLowerCase();
          if (!q) return true;

          return (
            student.name?.toLowerCase().includes(q) ||
            student.cic?.toLowerCase().includes(q) ||
            student.archive_class_id?.toLowerCase().includes(q) ||
            student.phone?.toLowerCase().includes(q) ||
            student.guardian?.toLowerCase().includes(q)
          );
        })
        .reduce((acc: Record<string, any[]>, student: any) => {
        const key = student.archive_class_id || "Old Students";
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
      }, {} as Record<string, any[]>),
    [oldStudents, oldSearchQuery]
  );

  const classIds = useMemo(
    () =>
      Array.from(
        new Set(students.map((student: any) => student.class_id || "Unassigned"))
      ).sort(),
    [students]
  );

  const handleBackupClass = async (classId: string) => {
    if (exportingClass) return;

    const classStudents = students.filter(
      (student: any) => (student.class_id || "Unassigned") === classId
    );

    if (classStudents.length === 0) {
      NativeAlert.alert("Backup Failed", "No students found in this class.");
      return;
    }

    setExportingClass(classId);

    try {
      const studentUids = classStudents.map((student: any) => student.uid);

      const [{ data: achievementsData, error: achievementsError }, { data: familyData, error: familyError }] =
        await Promise.all([
          supabase
            .from("achievements")
            .select("student_uid,title")
            .in("student_uid", studentUids),
          supabase.from("family_data").select("*").in("student_uid", studentUids),
        ]);

      if (achievementsError) throw achievementsError;
      if (familyError) throw familyError;

      const achievementsByStudent = ((achievementsData || []) as any[]).reduce(
        (acc: Record<string, string[]>, achievement: any) => {
          if (!acc[achievement.student_uid]) acc[achievement.student_uid] = [];
          if (achievement.title) acc[achievement.student_uid].push(achievement.title);
          return acc;
        },
        {}
      );

      const familyByStudent = ((familyData || []) as any[]).reduce(
        (acc: Record<string, any>, family: any) => {
          acc[family.student_uid] = family;
          return acc;
        },
        {}
      );

      const exportRows = classStudents.map((student: any) => {
        const family = familyByStudent[student.uid] || {};
        const brothers = arrayFromJsonValue(family.brothers);
        const sisters = arrayFromJsonValue(family.sisters);

        return {
          Name: valueOrBlank(student.name),
          CIC: valueOrBlank(student.cic),
          Class: valueOrBlank(student.class_id),
          Council: valueOrBlank(student.council),
          Batch: valueOrBlank(student.batch),
          Phone: valueOrBlank(student.phone),
          Guardian: valueOrBlank(student.guardian),
          "Guardian Phone": valueOrBlank(student.g_phone),
          Address: valueOrBlank(student.address),
          SSLC: valueOrBlank(student.sslc),
          "Plus Two": valueOrBlank(student.plustwo),
          "Plus Two Stream": valueOrBlank(student.plustwo_streams),
          Achievements: listText(achievementsByStudent[student.uid]),
          "Total Family Members": valueOrBlank(family.total_family_members),
          "Father Name": valueOrBlank(family.father_name),
          "Father Occupation": valueOrBlank(family.father_occupation),
          "Father Staying Place": valueOrBlank(family.father_staying_place),
          "Father Responsibilities": listText(family.father_responsibilities),
          "Mother Name": valueOrBlank(family.mother_name),
          "Mother Occupation": valueOrBlank(family.mother_occupation),
          "Brother Count": brothers.length,
          "Brother Details": formatSiblingList(brothers),
          "Sister Count": sisters.length,
          "Sister Details": formatSiblingList(sisters),
          "Chronically Ill Members": valueOrBlank(family.chronically_ill_members),
          "House Type": valueOrBlank(family.house_type),
        };
      });

      const worksheet = utils.json_to_sheet(exportRows, {
        header: STUDENT_EXPORT_COLUMNS,
      });

      worksheet["!cols"] = STUDENT_EXPORT_COLUMNS.map((header) => ({
        wch:
          header.includes("Details") || header.includes("Responsibilities")
            ? 44
            : header.includes("Address") || header.includes("Achievements")
              ? 34
              : 20,
      }));
      worksheet["!autofilter"] = {
        ref: utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: exportRows.length, c: STUDENT_EXPORT_COLUMNS.length - 1 },
        }),
      };

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, safeFilePart(classId).slice(0, 31));

      const workbookBase64 = write(workbook, { type: "base64", bookType: "xlsx" });
      const fileUri = `${FileSystem.cacheDirectory}Student_Backup_${safeFilePart(
        classId
      )}.xlsx`;

      await FileSystem.writeAsStringAsync(fileUri, workbookBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setBackupMenuOpen(false);

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Backup ${classId} Student Data`,
      });
    } catch (err: any) {
      NativeAlert.alert(
        "Backup Failed",
        err?.message || "Failed to generate the student backup file."
      );
    } finally {
      setExportingClass(null);
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading Students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTopRow}>
          <View style={styles.pageHeaderIconWrap}>
            <GraduationCap size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.pageHeaderPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.pageHeaderPillText}>Management</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Manage Students</Text>
        <Text style={styles.pageSubtitle}>View, edit, and manage profiles.</Text>
      </View>

      <View style={styles.searchContainer}>
        {authRole === "officer" && (
          <View style={styles.backupWrap}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => setBackupMenuOpen((current) => !current)}
              style={styles.backupButton}
              disabled={!!exportingClass}
            >
              {exportingClass ? (
                <ActivityIndicator size="small" color={theme.colors.textOnDark} />
              ) : (
                <Download size={17} color={theme.colors.textOnDark} />
              )}
              <Text style={styles.backupButtonText}>
                {exportingClass ? `Backing Up ${exportingClass}` : "Backup Data"}
              </Text>
              <ChevronDown size={17} color={theme.colors.textOnDark} />
            </TouchableOpacity>

            {backupMenuOpen && (
              <View style={styles.backupMenu}>
                {classIds.map((classId) => (
                  <TouchableOpacity
                    key={classId}
                    activeOpacity={0.82}
                    onPress={() => handleBackupClass(classId)}
                    style={styles.backupMenuItem}
                    disabled={!!exportingClass}
                  >
                    <Text style={styles.backupMenuText}>{classId}</Text>
                    <Text style={styles.backupMenuCount}>
                      {
                        students.filter(
                          (student: any) =>
                            (student.class_id || "Unassigned") === classId
                        ).length
                      }
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.searchWrap}>
          <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or CIC..."
            placeholderTextColor={
              theme.colors.inputPlaceholder ?? theme.colors.textMuted
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {authRole === "officer" ? (
          Object.entries(groupedStudents)
            .sort()
            .map(([classId, studentList]: [string, any[]]) => {
              const isExpanded = expandedClass === classId;

              return (
                <View key={classId} style={styles.classCard}>
                  <TouchableOpacity
                    activeOpacity={0.84}
                    onPress={() => setExpandedClass(isExpanded ? null : classId)}
                    style={styles.classHeader}
                  >
                    <View style={styles.classHeaderLeft}>
                      <Text style={styles.classTitle} numberOfLines={1}>
                        {classId}
                      </Text>

                      <View style={styles.classCountPill}>
                        <Text style={styles.classCountText}>
                          {studentList.length}
                        </Text>
                      </View>
                    </View>

                    {isExpanded ? (
                      <ChevronUp size={22} color={theme.colors.textMuted} />
                    ) : (
                      <ChevronDown size={22} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.classBody}>
                      <View style={styles.classActionRow}>
                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() => handlePromoteClassClick(classId)}
                          style={styles.promoteButton}
                        >
                          <ChevronsRight size={17} color={theme.colors.text} />
                          <Text style={styles.promoteButtonText}>Promote</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.84}
                          onPress={() => handleDeleteClassClick(classId)}
                          style={styles.deleteClassButton}
                        >
                          <Trash2 size={17} color={theme.colors.error} />
                          <Text style={styles.deleteClassButtonText}>
                            Delete Class
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.84}
                        onPress={() => handleConvertClassClick(classId)}
                        style={styles.convertButton}
                      >
                        <Archive size={17} color={theme.colors.warning} />
                        <Text style={styles.convertButtonText}>
                          Convert to Old Students
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.stack}>
                        {studentList.map((student: any) => (
                          <StudentCard
                            key={student.uid}
                            student={student}
                            onView={handleViewClick}
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
        ) : (
          <View style={styles.stack}>
            {filteredStudents.map((student: any) => (
              <StudentCard
                key={student.uid}
                student={student}
                onView={handleViewClick}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </View>
        )}

        {authRole === "officer" && oldStudents.length > 0 && (
          <View style={styles.oldSection}>
            <Text style={styles.oldSectionTitle}>Old Students</Text>
            <Text style={styles.oldSectionSubtitle}>
              Archived batches are separated from live student accounts.
            </Text>

            <View style={styles.oldSearchWrap}>
              <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search old students..."
                placeholderTextColor={
                  theme.colors.inputPlaceholder ?? theme.colors.textMuted
                }
                value={oldSearchQuery}
                onChangeText={setOldSearchQuery}
              />
            </View>

            {Object.keys(groupedOldStudents).length === 0 ? (
              <View style={styles.oldEmptyCard}>
                <Text style={styles.oldEmptyText}>
                  No old students match your search.
                </Text>
              </View>
            ) : (
              Object.entries(groupedOldStudents)
                .sort()
                .map(([classId, studentList]: [string, any[]]) => {
                const isExpanded = expandedOldClass === classId;

                return (
                  <View key={classId} style={styles.oldClassCard}>
                    <TouchableOpacity
                      activeOpacity={0.84}
                      onPress={() =>
                        setExpandedOldClass(isExpanded ? null : classId)
                      }
                      style={styles.classHeader}
                    >
                      <View style={styles.classHeaderLeft}>
                        <Text style={styles.classTitle} numberOfLines={1}>
                          {classId}
                        </Text>

                        <View style={styles.classCountPill}>
                          <Text style={styles.classCountText}>
                            {studentList.length}
                          </Text>
                        </View>
                      </View>

                      {isExpanded ? (
                        <ChevronUp size={22} color={theme.colors.textMuted} />
                      ) : (
                        <ChevronDown size={22} color={theme.colors.textMuted} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.classBody}>
                        <View style={styles.stack}>
                          {studentList.map((student: any) => (
                            <View
                              key={student.id}
                              style={styles.oldStudentCard}
                            >
                              <View style={styles.oldStudentTop}>
                                <View style={styles.oldStudentAvatar}>
                                  <Text style={styles.oldStudentAvatarText}>
                                    {student.name?.charAt(0)?.toUpperCase() || "S"}
                                  </Text>
                                </View>
                                <View style={styles.oldStudentInfo}>
                                  <Text style={styles.oldStudentName}>
                                    {student.name}
                                  </Text>
                                  <Text style={styles.oldStudentMeta}>
                                    CIC: {student.cic || "-"} • {student.archive_class_id}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.oldActionRow}>
                                <TouchableOpacity
                                  activeOpacity={0.84}
                                  onPress={() => handleOldViewClick(student)}
                                  style={styles.oldViewButton}
                                >
                                  <Text style={styles.oldViewButtonText}>View</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  activeOpacity={0.84}
                                  onPress={() => handleOldDeleteClick(student)}
                                  style={styles.oldDeleteButton}
                                >
                                  <Trash2 size={15} color={theme.colors.error} />
                                  <Text style={styles.oldDeleteButtonText}>
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
                })
            )}
          </View>
        )}
      </ScrollView>

      <ViewStudentModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        student={selectedStudent}
      />
      <EditStudentModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        student={selectedStudent}
        onSave={fetchData}
      />
      <PromoteClassModal
        isOpen={isPromoteModalOpen}
        setIsOpen={setIsPromoteModalOpen}
        currentClass={classToPromote}
        onSave={fetchData}
      />

      <ArchivedStudentModal
        visible={isOldViewModalOpen}
        student={selectedOldStudent}
        onClose={() => setIsOldViewModalOpen(false)}
      />

      <Modal
        visible={isConvertModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConvertModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.convertModalCard}>
            <View style={styles.modalTopRow}>
              <View>
                <Text style={styles.modalTitle}>Convert to Old Students</Text>
                <Text style={styles.modalSubtitle}>
                  {classToConvert} will become an archived batch.
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                onPress={() => setIsConvertModalOpen(false)}
                style={styles.modalCloseButton}
                disabled={isConverting}
              >
                <X size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.yearRow}>
              <View style={styles.yearField}>
                <Text style={styles.yearLabel}>Start Year</Text>
                <TextInput
                  value={startYear}
                  onChangeText={(value) =>
                    setStartYear(value.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="numeric"
                  placeholder="2022"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder ?? theme.colors.textMuted
                  }
                  style={styles.yearInput}
                />
              </View>

              <View style={styles.yearField}>
                <Text style={styles.yearLabel}>End Year</Text>
                <TextInput
                  value={endYear}
                  onChangeText={(value) =>
                    setEndYear(value.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="numeric"
                  placeholder="2026"
                  placeholderTextColor={
                    theme.colors.inputPlaceholder ?? theme.colors.textMuted
                  }
                  style={styles.yearInput}
                />
              </View>
            </View>

            <View style={styles.archivePreview}>
              <Text style={styles.archivePreviewLabel}>Archive Class ID</Text>
              <Text style={styles.archivePreviewValue}>
                {/^\d{4}$/.test(startYear) && /^\d{4}$/.test(endYear)
                  ? `${startYear}-${endYear.slice(2)}`
                  : "----"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleConfirmConvert}
              disabled={isConverting}
              style={[styles.confirmConvertButton, isConverting && styles.dimmedButton]}
            >
              {isConverting ? (
                <ActivityIndicator color={theme.colors.textOnDark} />
              ) : (
                <Archive size={17} color={theme.colors.textOnDark} />
              )}
              <Text style={styles.confirmConvertText}>
                {isConverting ? "Converting..." : "Confirm Conversion"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  bgOrbPrimary: {
    position: "absolute",
    top: 120,
    left: -30,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryTint,
  },
  bgOrbAccent: {
    position: "absolute",
    bottom: 110,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: theme.colors.accentTint,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  stateText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  pageHeaderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pageHeaderIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  pageHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageHeaderPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  pageTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
  },
  pageSubtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  backupWrap: {
    marginBottom: 12,
  },
  backupButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    ...theme.shadows.soft,
  },
  backupButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  backupMenu: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  backupMenuItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backupMenuText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "MullerBold",
    flex: 1,
    paddingRight: 12,
  },
  backupMenuCount: {
    minWidth: 32,
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    ...theme.shadows.soft,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  classCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  classHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  classTitle: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
    flexShrink: 1,
  },
  classCountPill: {
    marginLeft: 10,
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  classCountText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  classBody: {
    padding: 14,
  },
  classActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  promoteButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  promoteButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  deleteClassButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    backgroundColor: theme.colors.errorSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteClassButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  convertButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.2)",
    backgroundColor: theme.colors.warningSoft ?? "rgba(245,158,11,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  convertButtonText: {
    color: theme.colors.warning,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  oldSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  oldSectionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  oldSectionSubtitle: {
    marginTop: 5,
    marginBottom: 12,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  oldSearchWrap: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  oldEmptyCard: {
    minHeight: 70,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  oldEmptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  oldClassCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 14,
    opacity: 0.96,
    ...theme.shadows.soft,
  },
  oldStudentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  oldStudentTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  oldStudentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  oldStudentAvatarText: {
    color: theme.colors.primary,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "MullerBold",
  },
  oldStudentInfo: {
    flex: 1,
  },
  oldStudentName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  oldStudentMeta: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
  oldActionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  oldViewButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  oldViewButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  oldDeleteButton: {
    flex: 1,
    minHeight: 46,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  oldDeleteButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  archiveModalScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  archiveModalScroll: {
    flex: 1,
  },
  archiveModalContent: {
    padding: 18,
    paddingBottom: 36,
  },
  archiveModalTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  archiveModalTitle: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "MullerBold",
  },
  archiveModalSubtitle: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  archiveDetailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  archiveDetailTitle: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
    marginBottom: 10,
  },
  detailLine: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  archiveSiblingCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  archiveSiblingTitle: {
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    marginBottom: 5,
  },
  archiveSiblingText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.32)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  convertModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  modalTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  modalSubtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  yearRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  yearField: {
    flex: 1,
  },
  yearLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
    marginBottom: 7,
    marginLeft: 2,
  },
  yearInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  archivePreview: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  archivePreviewLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  archivePreviewValue: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "MullerBold",
  },
  confirmConvertButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.warning,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmConvertText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  dimmedButton: {
    opacity: 0.7,
  },
  stack: {
    gap: 12,
  },
});
