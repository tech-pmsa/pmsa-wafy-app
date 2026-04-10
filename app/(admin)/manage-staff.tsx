import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Eye,
  Edit,
  Users,
  Sparkles,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

import { ViewStaffModal } from "@/components/admin/manage-staff/ViewStaffModal";
import { EditStaffModal } from "@/components/admin/manage-staff/EditStaffModal";

export default function ManageStaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("name");
      if (error) throw error;

      setStaffList(data || []);

      if (data && data.length > 0) {
        const firstGroup = data[0].designation || data[0].role || "Other";
        setExpandedGroup(firstGroup.replace(" Class", "").trim());
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleViewClick = (staff: any) => {
    setSelectedStaff(staff);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (staff: any) => {
    setSelectedStaff(staff);
    setIsEditModalOpen(true);
  };

  const groupedStaff = useMemo(() => {
    return staffList.reduce((acc: Record<string, any[]>, staff: any) => {
      let key = staff.designation || staff.role || "Other";
      if (key.endsWith(" Class")) key = key.replace(" Class", "").trim();
      if (!acc[key]) acc[key] = [];
      acc[key].push(staff);
      return acc;
    }, {} as Record<string, any[]>);
  }, [staffList]);

  if (loading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading Staff Directory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTopRow}>
          <View style={styles.pageHeaderIconWrap}>
            <Users size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.pageHeaderPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.pageHeaderPillText}>Directory</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Manage Staff</Text>
        <Text style={styles.pageSubtitle}>View and manage staff profiles.</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.entries(groupedStaff)
          .sort()
          .map(([groupName, staffInGroup]: [string, any[]]) => {
            const isExpanded = expandedGroup === groupName;

            return (
              <View key={groupName} style={styles.groupCard}>
                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => setExpandedGroup(isExpanded ? null : groupName)}
                  style={styles.groupHeader}
                >
                  <View style={styles.groupHeaderLeft}>
                    <Text style={styles.groupTitle} numberOfLines={1}>
                      {groupName}
                    </Text>

                    <View style={styles.groupCountPill}>
                      <Text style={styles.groupCountText}>{staffInGroup.length}</Text>
                    </View>
                  </View>

                  {isExpanded ? (
                    <ChevronUp size={22} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={22} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.groupBody}>
                    {staffInGroup.map((staff) => (
                      <View key={staff.uid} style={styles.staffCard}>
                        <View style={styles.staffTop}>
                          <View style={styles.staffAvatarWrap}>
                            {staff.img_url ? (
                              <Image source={{ uri: staff.img_url }} style={styles.avatarImage} />
                            ) : (
                              <User size={24} color={theme.colors.textMuted} />
                            )}
                          </View>

                          <View style={styles.staffTopText}>
                            <Text style={styles.staffName} numberOfLines={1}>
                              {staff.name}
                            </Text>
                            <Text style={styles.staffRole}>{staff.role}</Text>
                          </View>
                        </View>

                        <View style={styles.infoRow}>
                          <View style={styles.infoItem}>
                            <Briefcase size={14} color={theme.colors.textMuted} />
                            <Text style={styles.infoText} numberOfLines={1}>
                              {staff.designation || "N/A"}
                            </Text>
                          </View>

                          <View style={styles.infoItem}>
                            <Mail size={14} color={theme.colors.textMuted} />
                            <Text style={styles.infoText} numberOfLines={1}>
                              {staff.email || "N/A"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            onPress={() => handleViewClick(staff)}
                            activeOpacity={0.84}
                            style={styles.viewButton}
                          >
                            <Eye size={16} color={theme.colors.primary} />
                            <Text style={styles.viewButtonText}>View</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleEditClick(staff)}
                            activeOpacity={0.84}
                            style={styles.editButton}
                          >
                            <Edit size={16} color={theme.colors.warning} />
                            <Text style={styles.editButtonText}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>

      <ViewStaffModal
        isOpen={isViewModalOpen}
        setIsOpen={setIsViewModalOpen}
        staff={selectedStaff}
      />

      <EditStaffModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        staff={selectedStaff}
        onSave={fetchStaff}
      />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  groupCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 14,
    ...theme.shadows.medium,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  groupTitle: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "MullerBold",
    flexShrink: 1,
  },
  groupCountPill: {
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
  groupCountText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  groupBody: {
    padding: 14,
    gap: 12,
  },
  staffCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  staffTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  staffAvatarWrap: {
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
  staffTopText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  staffName: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "MullerBold",
  },
  staffRole: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
    textTransform: "capitalize",
  },
  infoRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceSoft,
    gap: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
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
  viewButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  viewButtonText: {
    color: theme.colors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  editButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editButtonText: {
    color: theme.colors.warning,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
});