import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Linking,
  StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import {
  Trophy,
  User as UserIcon,
  Link as LinkIcon,
  X,
  Sparkles,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

function AchievementListItem({
  achievement,
  onClick,
}: {
  achievement: any;
  onClick: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.84}
      style={styles.listItem}
    >
      <View style={styles.listItemAvatar}>
        {achievement.students?.img_url ? (
          <Image source={{ uri: achievement.students.img_url }} style={styles.avatarImage} />
        ) : (
          <Trophy size={20} color={theme.colors.primary} />
        )}
      </View>

      <View style={styles.listItemTextWrap}>
        <Text style={styles.listItemTitle} numberOfLines={1}>
          {achievement.title}
        </Text>

        <View style={styles.listItemMetaRow}>
          <UserIcon size={12} color={theme.colors.textMuted} />
          <Text style={styles.listItemMeta} numberOfLines={1}>
            {achievement.name} ({achievement.cic})
          </Text>
        </View>
      </View>

      <Text style={styles.listItemDate}>
        {new Date(achievement.submitted_at).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
        })}
      </Text>
    </TouchableOpacity>
  );
}

function AchievementDetailsModal({
  achievement,
  isOpen,
  onClose,
}: {
  achievement: any | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!achievement) return null;

  const isImageProof =
    achievement.proof_url &&
    /\.(jpg|jpeg|png|webp)$/i.test(achievement.proof_url);

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderMain}>
              <View style={styles.modalTrophyWrap}>
                <Trophy size={24} color={theme.colors.primary} />
              </View>

              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.modalTitle}>{achievement.title}</Text>
                <Text style={styles.modalDate}>
                  Submitted on{" "}
                  {new Date(achievement.submitted_at).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} activeOpacity={0.84} style={styles.closeButton}>
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            <Text style={styles.modalDescription}>{achievement.description}</Text>

            {isImageProof && (
              <View style={styles.modalImageWrap}>
                <Image
                  source={{ uri: achievement.proof_url }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {achievement.proof_url && (
              <TouchableOpacity
                onPress={() => Linking.openURL(achievement.proof_url)}
                activeOpacity={0.84}
                style={styles.fullProofButton}
              >
                <LinkIcon size={17} color={theme.colors.text} />
                <Text style={styles.fullProofButtonText}>View Full Proof</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={styles.modalFooterAvatar}>
              {achievement.students?.img_url ? (
                <Image source={{ uri: achievement.students.img_url }} style={styles.avatarImage} />
              ) : (
                <UserIcon size={18} color={theme.colors.textMuted} />
              )}
            </View>

            <View>
              <Text style={styles.modalFooterName}>{achievement.name}</Text>
              <Text style={styles.modalFooterCic}>{achievement.cic}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ApprovedAchievements() {
  const { role, details, loading: userLoading } = useUserData();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<any | null>(null);

  useEffect(() => {
    if (userLoading) return;

    const fetchAchievements = async () => {
      setIsLoading(true);

      let query = supabase
        .from("achievements")
        .select("*, students(img_url)")
        .eq("approved", true);

      if (role === "student" && details?.cic) {
        query = query.eq("cic", details.cic);
      } else if (role === "class" && details?.batch) {
        query = query.eq("batch", details.batch);
      }

      const { data, error } = await query
        .order("submitted_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching achievements:", error);
      } else if (data) {
        setAchievements(data);
      }

      setIsLoading(false);
    };

    fetchAchievements();
  }, [role, details, userLoading]);

  const title = useMemo(() => {
    if (role === "student") return "My Recent Achievements";
    if (role === "class") return "Recent Class Achievements";
    return "Latest College Achievements";
  }, [role]);

  return (
    <View style={styles.rootCard}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerIconWrap}>
          <Trophy size={22} color={theme.colors.primary} />
        </View>

        <View style={styles.headerPill}>
          <Sparkles size={13} color={theme.colors.accent} />
          <Text style={styles.headerPillText}>Showcase</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>
        A showcase of recent accomplishments.
      </Text>

      {isLoading || userLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      ) : achievements.length === 0 ? (
        <View style={styles.emptyState}>
          <Trophy size={28} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No approved achievements yet.</Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {achievements.map((ach) => (
            <AchievementListItem
              key={ach.id}
              achievement={ach}
              onClick={() => setSelectedAchievement(ach)}
            />
          ))}
        </View>
      )}

      <AchievementDetailsModal
        isOpen={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        achievement={selectedAchievement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.medium,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
  },
  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerPillText: {
    color: theme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  sectionSubtitle: {
    marginTop: 6,
    marginBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
  },
  stack: { gap: 12 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    padding: 12,
  },
  listItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  listItemTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  listItemTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  listItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  listItemMeta: {
    marginLeft: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerMedium",
    flex: 1,
  },
  listItemDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  loadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 18,
  },
  emptyText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "84%",
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalHeaderMain: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 12,
  },
  modalTrophyWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginRight: 12,
  },
  modalHeaderTextWrap: {
    flex: 1,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: "MullerBold",
  },
  modalDate: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalScroll: {
    marginBottom: 14,
  },
  modalDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
    marginBottom: 16,
  },
  modalImageWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: theme.colors.surfaceSoft,
  },
  modalImage: {
    width: "100%",
    height: 260,
  },
  fullProofButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fullProofButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerBold",
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  modalFooterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  modalFooterName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  modalFooterCic: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerMedium",
  },
});