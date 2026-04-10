import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  Linking,
  StyleSheet,
} from "react-native";
import { supabase } from "@/lib/supabaseClient";
import { useUserData } from "@/hooks/useUserData";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Inbox,
  Link as LinkIcon,
  ExternalLink,
  X,
  User,
  Sparkles,
  Bell,
} from "lucide-react-native";
import { theme } from "@/theme/theme";

type Achievement = {
  id: number;
  title: string;
  description: string;
  name: string;
  cic: string;
  proof_url: string | null;
  submitted_at: string;
  students: { img_url: string | null } | null;
};

function ProofPreviewModal({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  if (!url) return null;

  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(url);

  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.previewModalCard}>
          <View style={styles.previewTopRow}>
            <Text style={styles.previewTitle}>Proof Preview</Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.84}
              style={styles.closeButton}
            >
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContentWrap}>
            {isImage ? (
              <Image source={{ uri: url }} style={styles.previewImage} resizeMode="contain" />
            ) : (
              <Text style={styles.previewFallbackText}>
                Preview not available for this file type. Please open in your browser to view.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.86}
            style={styles.primaryButton}
          >
            <ExternalLink size={17} color={theme.colors.textOnDark} />
            <Text style={styles.primaryButtonText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function AchievementCard({
  achievement,
  onApprove,
  onDecline,
  onViewProof,
}: {
  achievement: Achievement;
  onApprove: () => void;
  onDecline: () => void;
  onViewProof: () => void;
}) {
  return (
    <View style={styles.achievementCard}>
      <View style={styles.achievementHeader}>
        <View style={styles.achievementAvatarWrap}>
          {achievement.students?.img_url ? (
            <Image source={{ uri: achievement.students.img_url }} style={styles.avatarImage} />
          ) : (
            <User size={22} color={theme.colors.textMuted} />
          )}
        </View>

        <View style={styles.achievementHeaderText}>
          <Text style={styles.achievementTitle}>{achievement.title}</Text>
          <Text style={styles.achievementMeta}>
            By <Text style={styles.achievementMetaStrong}>{achievement.name}</Text>{" "}
            ({achievement.cic})
          </Text>
          <Text style={styles.achievementTime}>
            {formatDistanceToNow(new Date(achievement.submitted_at), {
              addSuffix: true,
            })}
          </Text>
        </View>
      </View>

      <Text style={styles.achievementDescription}>{achievement.description}</Text>

      <View style={styles.achievementFooter}>
        {achievement.proof_url ? (
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onViewProof}
            style={styles.proofButton}
          >
            <LinkIcon size={15} color={theme.colors.primary} />
            <Text style={styles.proofButtonText}>View Proof</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onDecline}
            style={styles.declineButton}
          >
            <XCircle size={16} color={theme.colors.error} />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={onApprove}
            style={styles.approveButton}
          >
            <CheckCircle2 size={16} color={theme.colors.textOnDark} />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function AchievementNotificationsPage() {
  const { details, loading: userLoading } = useUserData();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofToView, setProofToView] = useState<string | null>(null);

  useEffect(() => {
    const batch = details?.batch;
    if (userLoading || !batch) {
      if (!userLoading) setLoading(false);
      return;
    }

    const fetchAchievements = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("achievements")
        .select("*, students(img_url)")
        .eq("batch", batch)
        .eq("approved", false)
        .order("submitted_at", { ascending: false });

      if (error) {
        NativeAlert.alert("Error", "Failed to fetch notifications.");
      } else {
        setAchievements((data as Achievement[]) || []);
      }

      setLoading(false);
    };

    fetchAchievements();
  }, [details, userLoading]);

  const confirmAction = (
    action: "approve" | "decline",
    achievement: Achievement
  ) => {
    NativeAlert.alert(
      `${action === "approve" ? "Approve" : "Decline"} Achievement`,
      `Are you sure you want to ${action} "${achievement.title}" from ${achievement.name}? ${
        action === "decline" ? "This action is permanent." : ""
      }`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "approve" ? "Approve" : "Decline",
          style: action === "approve" ? "default" : "destructive",
          onPress: () => executeAction(action, achievement),
        },
      ]
    );
  };

  const executeAction = async (
    action: "approve" | "decline",
    achievement: Achievement
  ) => {
    setIsSubmitting(true);
    let error = null;

    if (action === "approve") {
      ({ error } = await supabase
        .from("achievements")
        .update({ approved: true })
        .eq("id", achievement.id));
    } else {
      ({ error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", achievement.id));
    }

    if (!error) {
      NativeAlert.alert("Success", `Achievement has been ${action}d.`);
      setAchievements((prev) => prev.filter((a) => a.id !== achievement.id));
    } else {
      NativeAlert.alert(`Failed to ${action} achievement.`, (error as any).message);
    }

    setIsSubmitting(false);
  };

  if (loading || userLoading) {
    return (
      <SafeAreaView style={styles.stateScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.stateText}>Loading Notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderTopRow}>
          <View style={styles.pageHeaderIconWrap}>
            <Bell size={22} color={theme.colors.primary} />
          </View>

          <View style={styles.pageHeaderPill}>
            <Sparkles size={13} color={theme.colors.accent} />
            <Text style={styles.pageHeaderPillText}>Review Queue</Text>
          </View>
        </View>

        <Text style={styles.pageTitle}>Notifications</Text>
        <Text style={styles.pageSubtitle}>
          Review pending achievements for your class.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {achievements.length === 0 ? (
          <View style={styles.emptyState}>
            <Inbox size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              There are no pending achievements to review.
            </Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {achievements.map((ach) => (
              <AchievementCard
                key={ach.id}
                achievement={ach}
                onApprove={() => confirmAction("approve", ach)}
                onDecline={() => confirmAction("decline", ach)}
                onViewProof={() => setProofToView(ach.proof_url)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ProofPreviewModal url={proofToView} onClose={() => setProofToView(null)} />

      {isSubmitting && (
        <View style={styles.submittingOverlay}>
          <View style={styles.submittingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.submittingText}>Updating achievement...</Text>
          </View>
        </View>
      )}
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
  stack: {
    gap: 12,
    paddingTop: 6,
  },
  achievementCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.medium,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  achievementAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  achievementHeaderText: {
    flex: 1,
    paddingRight: 4,
  },
  achievementTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "MullerBold",
  },
  achievementMeta: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  achievementMetaStrong: {
    color: theme.colors.text,
    fontFamily: "MullerBold",
  },
  achievementTime: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
  },
  achievementDescription: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
  },
  achievementFooter: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  proofButton: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  proofButtonText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  declineButton: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  declineButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  approveButton: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approveButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  emptyState: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    ...theme.shadows.soft,
  },
  emptyTitle: {
    marginTop: 14,
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
  },
  emptyText: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  previewModalCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: theme.colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    ...theme.shadows.floating,
  },
  previewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  previewTitle: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 25,
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
  previewContentWrap: {
    minHeight: 220,
    maxHeight: 340,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  previewImage: {
    width: "100%",
    height: 280,
  },
  previewFallbackText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "MullerMedium",
    textAlign: "center",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: "MullerBold",
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlayStrong ?? "rgba(15,23,42,0.28)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  submittingCard: {
    width: "100%",
    maxWidth: 240,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: "center",
    ...theme.shadows.floating,
  },
  submittingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
});