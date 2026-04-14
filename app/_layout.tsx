import { useEffect, useState } from "react";
import {
  Slot,
  useRouter,
  useSegments,
  useRootNavigationState,
  usePathname,
} from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabaseClient";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { theme } from "@/theme/theme";

SplashScreen.preventAutoHideAsync();

function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return role.toLowerCase().trim().replace(/_/g, "-").replace(/ /g, "-");
}

function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms = 5000,
  fallback: T
): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getUserRole(uid: string): Promise<string> {
  try {
    const { data: profile, error: profileError } = await withTimeout(
      supabase.from("profiles").select("role").eq("uid", uid).maybeSingle(),
      5000,
      { data: null, error: new Error("profiles timeout") } as any
    );

    if (profileError) {
      console.error("Profile role fetch error:", profileError);
    }

    if (profile?.role) {
      return normalizeRole(profile.role) || "student";
    }

    const { data: student, error: studentError } = await withTimeout(
      supabase.from("students").select("role").eq("uid", uid).maybeSingle(),
      5000,
      { data: null, error: new Error("students timeout") } as any
    );

    if (studentError) {
      console.error("Student role fetch error:", studentError);
    }

    if (student?.role) {
      return normalizeRole(student.role) || "student";
    }

    return "student";
  } catch (error) {
    console.error("Error fetching user role in layout:", error);
    return "student";
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    MullerBold: require("../assets/fonts/MullerBold.ttf"),
    MullerMedium: require("../assets/fonts/MullerMedium.ttf"),
  });

  const rootNavigationState = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetchingRole, setIsFetchingRole] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let isMounted = true;

    const loadRoleForSession = async (activeSession: any) => {
      if (!activeSession?.user?.id) {
        if (isMounted) {
          setRole(null);
          setIsFetchingRole(false);
        }
        return;
      }

      if (isMounted) setIsFetchingRole(true);

      const safeRole = await withTimeout(
        getUserRole(activeSession.user.id),
        5000,
        "student"
      );

      if (isMounted) {
        setRole(safeRole);
        setIsFetchingRole(false);
      }
    };

    const initializeApp = async () => {
      try {
        const {
          data: { session: restoredSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession error:", error);
        }

        if (!isMounted) return;

        setSession(restoredSession);
        setIsInitialized(true);

        if (restoredSession) {
          loadRoleForSession(restoredSession);
        } else {
          setRole(null);
          setIsFetchingRole(false);
        }
      } catch (error) {
        console.error("Auth Init Error:", error);

        if (isMounted) {
          setSession(null);
          setRole(null);
          setIsFetchingRole(false);
          setIsInitialized(true);
        }
      }
    };

    initializeApp();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);

        if (!newSession) {
          setRole(null);
          setIsFetchingRole(false);
          return;
        }

        loadRoleForSession(newSession);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const navReady = !!rootNavigationState?.key;
    const readyToRoute = isInitialized && navReady && !isFetchingRole;

    if (!readyToRoute) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isRootIndex = pathname === "/";

    const roleRedirects: Record<string, string> = {
      officer: "/(admin)/officer/officer-dashboard",
      class: "/(admin)/classroom/class-dashboard",
      "class-leader": "/(admin)/classleader/class-leader-dashboard",
      staff: "/(admin)/staff/staff-dashboard",
      student: "/(student)/student-dashboard",
      chef: "/(admin)/chef/chef-dashboard",
      main: "/(admin)/main/main-dashboard",
    };

    if (!session) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login" as any);
      }
      return;
    }

    const safeRole = normalizeRole(role) || "student";
    const targetRoute = roleRedirects[safeRole] || roleRedirects.student;

    if (inAuthGroup || isRootIndex) {
      router.replace(targetRoute as any);
    }
  }, [
    isInitialized,
    isFetchingRole,
    rootNavigationState?.key,
    segments,
    pathname,
    session,
    role,
    router,
  ]);

  const fontsAreReady = fontsLoaded || fontError;

  if (!fontsAreReady || !isInitialized) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <Slot />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  loadingCard: {
    minWidth: 120,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    shadowColor: "#101828",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});