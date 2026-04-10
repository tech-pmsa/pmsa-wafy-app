import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  X,
  ChevronDown,
  ChevronUp,
  Building,
  Shield,
  Phone,
  PhoneCall,
  Home,
  Album,
  Briefcase,
  Users as FamilyIcon,
  UserCheck,
} from "lucide-react-native";
import { ProfileInfoLine } from "@/components/settings/profile/ProfileInfoLine";
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

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionCardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function ViewStudentModal({ isOpen, setIsOpen, student }: any) {
  const [activeTab, setActiveTab] = useState<"personal" | "academics" | "family">(
    "personal"
  );
  const [familyData, setFamilyData] = useState<any | null>(null);
  const [academicEntries, setAcademicEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAcademicId, setExpandedAcademicId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!student || !isOpen) return;

      setActiveTab("personal");
      setExpandedAcademicId(null);
      setLoading(true);

      const [familyRes, academicsRes] = await Promise.all([
        supabase.from("family_data").select("*").eq("student_uid", student.uid).single(),
        supabase
          .from("academic_entries")
          .select("*, subject_marks(*)")
          .eq("student_uid", student.uid)
          .order("created_at", { ascending: true }),
      ]);

      setFamilyData(familyRes.data || null);
      setAcademicEntries(academicsRes.data || []);
      setLoading(false);
    };

    fetchDetails();
  }, [student, isOpen]);

  const personalRows = useMemo(
    () => [
      { icon: Building, label: "Class ID", value: student?.class_id },
      { icon: Building, label: "Batch", value: student?.batch },
      { icon: Shield, label: "Council", value: student?.council },
      { icon: Album, label: "CIC", value: student?.cic },
      { icon: Phone, label: "Phone", value: student?.phone },
      { icon: UserCheck, label: "Guardian", value: student?.guardian },
      { icon: PhoneCall, label: "Guardian Phone", value: student?.g_phone },
      { icon: Album, label: "SSLC Board", value: student?.sslc },
      { icon: Album, label: "Plus Two Board", value: student?.plustwo },
      { icon: Album, label: "Plus Two Stream", value: student?.plustwo_streams },
      { icon: Home, label: "Address", value: student?.address },
    ],
    [student]
  );

  if (!student) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setIsOpen(false)}
    >
      <SafeAreaView style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              activeOpacity={0.84}
              style={styles.closeButton}
            >
              <X size={18} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              {student.img_url ? (
                <Image source={{ uri: student.img_url }} style={styles.avatarImage} />
              ) : (
                <User size={44} color={theme.colors.textMuted} />
              )}
            </View>

            <Text style={styles.name}>{student.name}</Text>
            <Text style={styles.subtitle}>
              {student.class_id || "N/A"} • {student.cic || "N/A"}
            </Text>
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

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <>
              {activeTab === "personal" && (
                <SectionCard title="Personal Information">
                  {personalRows.map((row) => (
                    <ProfileInfoLine
                      key={row.label}
                      icon={row.icon}
                      label={row.label}
                      value={row.value}
                    />
                  ))}
                </SectionCard>
              )}

              {activeTab === "academics" && (
                <SectionCard title="Academic Records">
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
                            {isExpanded ? (
                              <ChevronUp size={20} color={theme.colors.textMuted} />
                            ) : (
                              <ChevronDown size={20} color={theme.colors.textMuted} />
                            )}
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
                </SectionCard>
              )}

              {activeTab === "family" && (
                <>
                  <SectionCard title="Parent & Household">
                    <ProfileInfoLine icon={User} label="Father's Name" value={familyData?.father_name} />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Father's Occupation"
                      value={familyData?.father_occupation}
                    />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Father's Staying Place"
                      value={familyData?.father_staying_place}
                    />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Father's Responsibilities"
                      value={familyData?.father_responsibilities}
                      isList
                    />
                    <ProfileInfoLine icon={User} label="Mother's Name" value={familyData?.mother_name} />
                    <ProfileInfoLine
                      icon={Briefcase}
                      label="Mother's Occupation"
                      value={familyData?.mother_occupation}
                    />
                    <ProfileInfoLine
                      icon={FamilyIcon}
                      label="Total Family Members"
                      value={familyData?.total_family_members?.toString()}
                    />
                    <ProfileInfoLine
                      icon={Home}
                      label="House Type"
                      value={familyData?.house_type}
                    />
                    <ProfileInfoLine
                      icon={Home}
                      label="Chronically Ill Members"
                      value={
                        typeof familyData?.chronically_ill_members === "boolean"
                          ? familyData.chronically_ill_members
                            ? "Yes"
                            : "No"
                          : familyData?.chronically_ill_members
                      }
                    />
                  </SectionCard>

                  <SectionCard title="Sibling Information">
                    <Text style={styles.subsectionTitle}>Brothers</Text>

                    {familyData?.brothers && familyData.brothers.length > 0 ? (
                      familyData.brothers.map((bro: any, i: number) => (
                        <View key={i} style={styles.siblingCard}>
                          <Text style={styles.siblingName}>{bro.name || "Unnamed"}</Text>
                          <Text style={styles.siblingLine}>
                            <Text style={styles.siblingLabel}>Education: </Text>
                            {Array.isArray(bro.education)
                              ? bro.education.join(", ") || "N/A"
                              : bro.education || "N/A"}
                          </Text>
                          <Text style={styles.siblingLine}>
                            <Text style={styles.siblingLabel}>Occupation: </Text>
                            {bro.occupation || "N/A"}
                          </Text>
                          <Text style={styles.siblingLine}>
                            <Text style={styles.siblingLabel}>Responsibilities: </Text>
                            {Array.isArray(bro.responsibilities)
                              ? bro.responsibilities.join(", ") || "N/A"
                              : bro.responsibilities || "N/A"}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyInlineText}>No brothers added.</Text>
                    )}

                    <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>Sisters</Text>

                    {familyData?.sisters && familyData.sisters.length > 0 ? (
                      familyData.sisters.map((sis: any, i: number) => (
                        <View key={i} style={styles.siblingCard}>
                          <Text style={styles.siblingName}>{sis.name || "Unnamed"}</Text>
                          <Text style={styles.siblingLine}>
                            <Text style={styles.siblingLabel}>Education: </Text>
                            {Array.isArray(sis.education)
                              ? sis.education.join(", ") || "N/A"
                              : sis.education || "N/A"}
                          </Text>
                          <Text style={styles.siblingLine}>
                            <Text style={styles.siblingLabel}>Occupation: </Text>
                            {sis.occupation || "N/A"}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyInlineText}>No sisters added.</Text>
                    )}
                  </SectionCard>
                </>
              )}
            </>
          )}
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
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
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrap: {
    width: 116,
    height: 116,
    borderRadius: 58,
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
  name: {
    marginTop: 16,
    color: theme.colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "MullerBold",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  tabWrap: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    padding: 6,
    marginBottom: 18,
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
  loadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
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
  subsectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
    marginBottom: 10,
  },
  siblingCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  siblingName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
    marginBottom: 8,
  },
  siblingLine: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
    marginBottom: 4,
  },
  siblingLabel: {
    color: theme.colors.text,
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
});