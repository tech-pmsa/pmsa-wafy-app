import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert as NativeAlert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Award,
  School,
  FileQuestion,
} from "lucide-react-native";
import { useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import {
  AcademicRecord,
  AcademicType,
  ACADEMIC_TABS,
  isFoundationUser,
} from "@/lib/academicUtils";
import { AcademicCard } from "@/components/academic/AcademicCard";
import { AcademicFormModal } from "@/components/academic/AcademicFormModal";

export default function StudentAcademicPage() {
  const { user, details, loading: userLoading } = useUserData();

  const [activeTab, setActiveTab] = useState<AcademicType>("+1");
  const [records, setRecords] = useState<AcademicRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);

  const isFoundation = isFoundationUser(details);

  const fetchRecords = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_academics")
        .select("*")
        .eq("student_uid", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords((data || []) as AcademicRecord[]);
    } catch (err: any) {
      console.error("Failed to load academic records:", err);
      NativeAlert.alert("Error", err.message || "Failed to load academic records.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!userLoading && user?.id) {
      fetchRecords();
    }
  }, [userLoading, user?.id, fetchRecords]);

  // Delete record handler
  const handleDelete = async (rec: AcademicRecord) => {
    if (!rec.id) return;
    try {
      const { error } = await supabase
        .from("student_academics")
        .delete()
        .eq("id", rec.id);

      if (error) throw error;
      NativeAlert.alert("Deleted", "Academic record deleted successfully.");
      fetchRecords();
    } catch (err: any) {
      NativeAlert.alert("Delete Failed", err.message || "Could not delete record.");
    }
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: AcademicRecord) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  // Filter records for active tab
  const currentTabRecords = records.filter(
    (r) => r.academic_type === activeTab
  );

  // Tab counts
  const getTabCount = (type: AcademicType) =>
    records.filter((r) => r.academic_type === type).length;

  if (userLoading || (loading && !records.length)) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (isFoundation) {
    return (
      <SafeAreaView style={styles.stateScreen}>
        <FileQuestion size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>Academic Not Applicable</Text>
        <Text style={styles.emptySubtitle}>
          Academic records (+1, +2, Degree, Diploma) are not required for Foundation students.
        </Text>
      </SafeAreaView>
    );
  }

  const currentTabObj = ACADEMIC_TABS.find((t) => t.key === activeTab);

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Academic Records</Text>
          <Text style={styles.subtitle}>
            Manage your +1, +2, Degree, and Diploma education history.
          </Text>
        </View>

        <TouchableOpacity
          onPress={openAddModal}
          activeOpacity={0.84}
          style={styles.addBtnHeader}
        >
          <Plus size={16} color={theme.colors.textOnDark} />
          <Text style={styles.addBtnHeaderText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {/* Main Container with Vertical Tabs on Left & Content on Right */}
      <View style={styles.mainLayout}>
        {/* Vertical Tabs Sidebar */}
        <View style={styles.verticalRail}>
          {ACADEMIC_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                style={[styles.railTab, isActive && styles.railTabActive]}
              >
                <View style={[styles.railIconWrap, isActive && styles.railIconWrapActive]}>
                  {tab.key === "degree" ? (
                    <GraduationCap
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    />
                  ) : tab.key === "diploma" ? (
                    <Award
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    />
                  ) : (
                    <School
                      size={18}
                      color={isActive ? theme.colors.primary : theme.colors.textMuted}
                    />
                  )}
                </View>

                <Text
                  style={[styles.railTabText, isActive && styles.railTabTextActive]}
                  numberOfLines={1}
                >
                  {tab.key}
                </Text>

                <View
                  style={[
                    styles.railCountBadge,
                    isActive && styles.railCountBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.railCountText,
                      isActive && styles.railCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Tab Sub-Header */}
          <View style={styles.tabHeaderRow}>
            <View>
              <Text style={styles.tabSectionTitle}>
                {currentTabObj?.badgeLabel || activeTab}
              </Text>
              <Text style={styles.tabSectionSubtitle}>
                {currentTabRecords.length}{" "}
                {currentTabRecords.length === 1 ? "record" : "records"} recorded
              </Text>
            </View>

            {currentTabRecords.length > 0 && (
              <TouchableOpacity
                onPress={openAddModal}
                style={styles.addSideBtn}
                activeOpacity={0.8}
              >
                <Plus size={14} color={theme.colors.primary} />
                <Text style={styles.addSideBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cards List or Empty State */}
          {currentTabRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <BookOpen size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No {activeTab} Records</Text>
              <Text style={styles.emptySubtitle}>
                You have not added any {activeTab} academic data yet. Tap below to create your record.
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                activeOpacity={0.84}
                style={styles.emptyAddBtn}
              >
                <Plus size={16} color={theme.colors.textOnDark} />
                <Text style={styles.emptyAddBtnText}>Add {activeTab} Record</Text>
              </TouchableOpacity>
            </View>
          ) : (
            currentTabRecords.map((record) => (
              <AcademicCard
                key={record.id}
                record={record}
                canEdit={true}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Form Modal */}
      {isModalOpen && (
        <AcademicFormModal
          visible={isModalOpen}
          academicType={activeTab}
          record={editingRecord}
          student={{
            uid: user?.id || "",
            name: details?.name || "Student",
            cic: details?.cic || null,
            class_id: details?.class_id || null,
            batch: details?.batch || null,
          }}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
          }}
          onSaved={() => {
            fetchRecords();
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  stateScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  addBtnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnHeaderText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textOnDark,
  },

  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
  verticalRail: {
    width: 82,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    paddingVertical: 12,
    alignItems: "center",
    gap: 10,
  },
  railTab: {
    width: 68,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
    backgroundColor: "transparent",
  },
  railTabActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  railIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  railIconWrapActive: {
    backgroundColor: theme.colors.surface,
  },
  railTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  railTabTextActive: {
    color: theme.colors.primary,
  },
  railCountBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  railCountBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  railCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
  },
  railCountTextActive: {
    color: theme.colors.textOnDark,
  },

  contentArea: {
    flex: 1,
  },
  contentScroll: {
    padding: 14,
    paddingBottom: 30,
  },
  tabHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tabSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
  },
  tabSectionSubtitle: {
    fontSize: 11.5,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  addSideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: theme.colors.primarySoft,
  },
  addSideBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },

  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textOnDark,
  },
});
