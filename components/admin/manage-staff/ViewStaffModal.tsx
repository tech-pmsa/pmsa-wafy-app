import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabaseClient";
import { User, Shield, X } from "lucide-react-native";
import { theme } from "@/theme/theme";

export function ViewStaffModal({ isOpen, setIsOpen, staff }: any) {
  const [councilDetails, setCouncilDetails] = useState<any | null>(null);
  const [isLoadingCouncil, setIsLoadingCouncil] = useState(false);

  useEffect(() => {
    const handleViewClick = async () => {
      if (!staff) return;

      setCouncilDetails(null);

      if (staff.designation?.endsWith(" Class")) {
        setIsLoadingCouncil(true);
        try {
          const { data } = await supabase
            .from("class_council")
            .select("*")
            .eq("uid", staff.uid)
            .single();

          if (data) setCouncilDetails(data);
        } catch (err: any) {
          console.error(err);
        } finally {
          setIsLoadingCouncil(false);
        }
      }
    };

    if (isOpen) handleViewClick();
  }, [staff, isOpen]);

  if (!staff) return null;

  const councilMembers = [
    { role: "President", name: councilDetails?.president },
    { role: "Secretary", name: councilDetails?.secretary },
    { role: "Treasurer", name: councilDetails?.treasurer },
    { role: "Auditor", name: councilDetails?.auditor },
    { role: "Vice President", name: councilDetails?.vicepresident },
    { role: "Joint Secretary", name: councilDetails?.jointsecretary },
    { role: "PRO", name: councilDetails?.pro },
  ];

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
              {staff.img_url ? (
                <Image source={{ uri: staff.img_url }} style={styles.avatarImage} />
              ) : (
                <User size={44} color={theme.colors.textMuted} />
              )}
            </View>

            <Text style={styles.name}>{staff.name}</Text>
            <Text style={styles.designation}>{staff.designation || staff.role}</Text>
          </View>

          {staff.designation?.endsWith(" Class") && (
            <View style={styles.councilCard}>
              <View style={styles.councilHeader}>
                <Shield size={20} color={theme.colors.primary} />
                <Text style={styles.councilTitle}>
                  Class Council ({councilDetails?.batch || "N/A"})
                </Text>
              </View>

              {isLoadingCouncil ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : councilDetails ? (
                <View style={styles.councilGrid}>
                  {councilMembers.map((member) => (
                    <View key={member.role} style={styles.councilItem}>
                      <Text style={styles.councilRole}>{member.role}</Text>
                      <Text style={styles.councilName}>{member.name || "N/A"}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyCouncilText}>No council data found.</Text>
              )}
            </View>
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
    marginBottom: 26,
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
  designation: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  councilCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  councilHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  councilTitle: {
    marginLeft: 10,
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "MullerBold",
  },
  loadingWrap: {
    paddingVertical: 18,
    alignItems: "center",
  },
  councilGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 18,
  },
  councilItem: {
    width: "50%",
    paddingRight: 10,
  },
  councilRole: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  councilName: {
    marginTop: 5,
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  emptyCouncilText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    textAlign: "center",
    paddingVertical: 10,
  },
});