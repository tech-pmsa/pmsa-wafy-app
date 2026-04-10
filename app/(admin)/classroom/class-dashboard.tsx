import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserData } from "@/hooks/useUserData";
import { theme } from "@/theme/theme";
import { School, Layers3 } from "lucide-react-native";

import ClassAttendanceDashboard from "@/components/admin/ClassAttendanceDashboard";
import FeeManagementDashboard from "@/components/admin/FeeManagementDashboard";
import AchievementViewer from "@/components/admin/AchievementViewer";
import FloatingScrollToggle from "@/components/ui/FloatingScrollToggle";

export default function ClassroomDashboardPage() {
  const { details, loading } = useUserData();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    const currentY = contentOffset.y;
    const visibleHeight = layoutMeasurement.height;
    const totalHeight = contentSize.height;

    const nearBottom = currentY + visibleHeight >= totalHeight - 80;
    const nearTop = currentY <= 80;

    if (nearBottom) {
      setScrollDirection("up");
    } else if (nearTop) {
      setScrollDirection("down");
    }
  };

  const handleFloatingPress = () => {
    if (scrollDirection === "down") {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <View style={styles.bgOrbPrimary} />
        <View style={styles.bgOrbAccent} />

        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <School size={28} color={theme.colors.secondary} />
              </View>

              <View style={styles.heroBadge}>
                <Layers3 size={14} color={theme.colors.primary} />
                <Text style={styles.heroBadgeText}>
                  {details?.designation || "Class"}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {details?.designation || "Class"} Dashboard
            </Text>
            <Text style={styles.heroSubtitle}>
              Welcome, {details?.name}. Here is a clear overview of attendance,
              fees, and achievements for your class.
            </Text>
          </View>

          <View style={styles.sectionStack}>
            <ClassAttendanceDashboard />
            <FeeManagementDashboard />
            <AchievementViewer />
          </View>
        </ScrollView>

        <FloatingScrollToggle
          direction={scrollDirection}
          onPress={handleFloatingPress}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: 90,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
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
  loadingText: {
    marginTop: 14,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "MullerMedium",
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    marginBottom: 20,
    ...theme.shadows.medium,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondarySoft,
    borderWidth: 1,
    borderColor: theme.colors.secondaryTint,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  heroBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "MullerBold",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "MullerBold",
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "MullerMedium",
  },
  sectionStack: {
    gap: 16,
  },
});