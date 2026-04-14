import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import {
  Trophy,
  User as UserIcon,
  Search,
  Inbox,
  ExternalLink,
  Sparkles,
} from "lucide-react-native";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/theme/theme";
import { useUserData } from "@/hooks/useUserData";

function AchievementDisplayCard({ achievement }: { achievement: any }) {
  return (
    <View style={styles.achievementCard}>
      <View style={styles.achievementTop}>
        <View style={styles.achievementIconWrap}>
          <Trophy size={20} color={theme.colors.primary} />
        </View>

        <View style={styles.achievementTextWrap}>
          <Text style={styles.achievementTitle}>{achievement.title}</Text>
          <Text style={styles.achievementDate}>
            {new Date(achievement.submitted_at).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      <Text style={styles.achievementDescription} numberOfLines={3}>
        {achievement.description}
      </Text>

      <View style={styles.achievementFooter}>
        <View style={styles.achievementStudentWrap}>
          <UserIcon size={15} color={theme.colors.textMuted} />
          <Text style={styles.achievementStudentText} numberOfLines={1}>
            {achievement.name}{" "}
            <Text style={styles.achievementStudentCic}>({achievement.cic})</Text>
          </Text>
        </View>

        {achievement.proof_url && (
          <TouchableOpacity
            activeOpacity={0.84}
            style={styles.proofButton}
            onPress={() => Linking.openURL(achievement.proof_url)}
          >
            <Text style={styles.proofButtonText}>Proof</Text>
            <ExternalLink size={13} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AchievementViewer() {
  // 1. Get the current user's role and details
  const { role, details, loading: userLoading } = useUserData();

  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait until the user's data has loaded before fetching achievements
    if (userLoading) return;

    const fetchInitialData = async () => {
      setIsLoading(true);

      let query = supabase
        .from("achievements")
        .select("*")
        .eq("approved", true)
        .order("submitted_at", { ascending: false });

      // 2. Add the Role/Batch Logic
      // If the user is NOT an officer, restrict the query to only their batch.
      // (Fallback to a non-existent batch string if they don't have one, to securely return 0 rows)
      if (role !== "officer") {
        query = query.eq("batch", details?.batch || "NO_BATCH_ASSIGNED");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching achievements:", error);
      } else if (data) {
        setAllAchievements(data);
        const uniqueBatches = [
          "All",
          ...[...new Set(data.map((a) => a.batch))].filter(Boolean).sort(),
        ];
        setBatches(uniqueBatches);
      }

      setIsLoading(false);
    };

    fetchInitialData();
  }, [role, details, userLoading]);

  const filteredAchievements = useMemo(() => {
    let filtered = allAchievements;

    if (selectedBatch !== "All") {
      filtered = filtered.filter((a) => a.batch === selectedBatch);
    }

    if (search) {
      const lowercasedSearch = search.toLowerCase();
      return filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(lowercasedSearch) ||
          a.cic?.toLowerCase().includes(lowercasedSearch) ||
          a.title.toLowerCase().includes(lowercasedSearch)
      );
    }

    return filtered;
  }, [search, selectedBatch, allAchievements]);

  return (
    <View style={styles.rootCard}>
      <View style={styles.headerTopRow}>
        <View style={styles.headerIconWrap}>
          <Trophy size={22} color={theme.colors.primary} />
        </View>

        <View style={styles.headerPill}>
          <Sparkles size={13} color={theme.colors.accent} />
          <Text style={styles.headerPillText}>Approved</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Approved Achievements</Text>
      <Text style={styles.sectionSubtitle}>Browse student achievements.</Text>

      <View style={styles.searchWrap}>
        <Search size={18} color={theme.colors.icon ?? theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, CIC, or title..."
          placeholderTextColor={
            theme.colors.inputPlaceholder ?? theme.colors.textMuted
          }
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {batches.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.batchRow}
        >
          {batches.map((b) => (
            <TouchableOpacity
              key={b}
              activeOpacity={0.84}
              onPress={() => setSelectedBatch(b)}
              style={[
                styles.batchChip,
                selectedBatch === b && styles.batchChipActive,
              ]}
            >
              <Text
                style={[
                  styles.batchChipText,
                  selectedBatch === b && styles.batchChipTextActive,
                ]}
              >
                {b}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {isLoading || userLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      ) : filteredAchievements.length === 0 ? (
        <View style={styles.emptyState}>
          <Inbox size={34} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>
            No achievements match your criteria.
          </Text>
        </View>
      ) : (
        <View style={styles.stack}>
          {filteredAchievements.map((ach) => (
            <AchievementDisplayCard key={ach.id} achievement={ach} />
          ))}
        </View>
      )}
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
  searchWrap: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder ?? theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 14,
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
  batchRow: {
    gap: 8,
    paddingBottom: 8,
    marginBottom: 10,
  },
  batchChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  batchChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  batchChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
  },
  batchChipTextActive: {
    color: theme.colors.textOnDark,
  },
  stack: { gap: 12 },
  achievementCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    ...theme.shadows.soft,
  },
  achievementTop: {
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  achievementIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    marginRight: 12,
  },
  achievementTextWrap: {
    flex: 1,
    paddingRight: 4,
  },
  achievementTitle: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  achievementDate: {
    marginTop: 6,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    fontFamily: "MullerBold",
  },
  achievementDescription: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "MullerMedium",
  },
  achievementFooter: {
    backgroundColor: theme.colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  achievementStudentWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  achievementStudentText: {
    marginLeft: 8,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "MullerBold",
    flex: 1,
  },
  achievementStudentCic: {
    color: theme.colors.textMuted,
    fontFamily: "MullerMedium",
  },
  proofButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primaryTint,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  proofButtonText: {
    color: theme.colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "MullerBold",
    textTransform: "uppercase",
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
    textAlign: "center",
  },
});