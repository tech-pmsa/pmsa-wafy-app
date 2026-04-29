import { useEffect, useState } from "react";
import {
  Slot,
  useRouter,
  useSegments,
  useRootNavigationState,
  usePathname,
} from "expo-router";
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { supabase } from "@/lib/supabaseClient";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { theme } from "@/theme/theme";
import { AlertCircle, RefreshCcw, LogOut } from "lucide-react-native";

SplashScreen.preventAutoHideAsync();

type RoleResult =
  | { ok: true; role: string }
  | { ok: false; message: string };

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

async function getUserRole(uid: string): Promise<RoleResult> {
  try {
    const profileResult = await withTimeout(
      supabase.from("profiles").select("role").eq("uid", uid).maybeSingle(),
      8000,
      { data: null, error: new Error("Network timeout while checking role") } as any
    );

    if (profileResult?.error) {
      return {
        ok: false,
        message: profileResult.error.message || "Could not verify your account role.",
      };
    }

    if (profileResult?.data?.role) {
      return {
        ok: true,
        role: normalizeRole(profileResult.data.role) || "student",
      };
    }

    const studentResult = await withTimeout(
      supabase.from("students").select("role").eq("uid", uid).maybeSingle(),
      8000,
      { data: null, error: new Error("Network timeout while checking student role") } as any
    );

    if (studentResult?.error) {
      return {
        ok: false,
        message: studentResult.error.message || "Could not verify student role.",
      };
    }

    if (studentResult?.data?.role) {
      return {
        ok: true,
        role: normalizeRole(studentResult.data.role) || "student",
      };
    }

    return {
      ok: false,
      message: "No role was found for this account. Please contact admin.",
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || "Could not verify your login. Check internet and try again.",
    };
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
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const loadRoleForSession = async (activeSession: any) => {
    if (!activeSession?.user?.id) {
      setRole(null);
      setRoleError(null);
      setIsFetchingRole(false);
      return;
    }

    setIsFetchingRole(true);
    setRoleError(null);

    const result = await getUserRole(activeSession.user.id);

    if (result.ok) {
      setRole(result.role);
      setRoleError(null);
    } else {
      setRole(null);
      setRoleError(result.message);
    }

    setIsFetchingRole(false);
  };

  useEffect(() => {
    let isMounted = true;

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
          await loadRoleForSession(restoredSession);
        } else {
          setRole(null);
          setRoleError(null);
          setIsFetchingRole(false);
        }
      } catch (error: any) {
        console.error("Auth Init Error:", error);

        if (isMounted) {
          setSession(null);
          setRole(null);
          setRoleError(error?.message || "Could not restore login session.");
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
          setRoleError(null);
          setIsFetchingRole(false);
          return;
        }

        await loadRoleForSession(newSession);
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
      "clg-leader": "/(admin)/leader/clg-dashboard",
    };

    if (!session) {
      if (!inAuthGroup) router.replace("/(auth)/login" as any);
      return;
    }

    if (roleError || !role) {
      return;
    }

    const safeRole = normalizeRole(role);
    const targetRoute = safeRole ? roleRedirects[safeRole] : null;

    if (!targetRoute) {
      setRoleError("This account role is not supported. Please contact admin.");
      return;
    }

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
    roleError,
    router,
  ]);

  const handleRetry = async () => {
    if (session) {
      await loadRoleForSession(session);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    setRoleError(null);
    router.replace("/(auth)/login" as any);
  };

  const fontsAreReady = fontsLoaded || fontError;

  if (!fontsAreReady || !isInitialized || isFetchingRole) {
    return (
      <View style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking your account...</Text>
        </View>
      </View>
    );
  }

  if (session && roleError) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.errorScreen}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <AlertCircle size={30} color={theme.colors.error} />
            </View>

            <Text style={styles.errorTitle}>Login Verification Failed</Text>
            <Text style={styles.errorMessage}>
              {roleError}
            </Text>

            <Text style={styles.errorHint}>
              Check your internet connection and try again. If this continues,
              contact the admin to check your role in profiles.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.84}
              onPress={handleRetry}
            >
              <RefreshCcw size={18} color={theme.colors.textOnDark} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.84}
              onPress={handleLogout}
            >
              <LogOut size={18} color={theme.colors.error} />
              <Text style={styles.logoutButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
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
    minWidth: 180,
    minHeight: 130,
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: "MullerMedium",
  },
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
  },
  errorCard: {
    width: "100%",
    maxWidth: 430,
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    ...theme.shadows.medium,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.16)",
    marginBottom: 16,
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "MullerBold",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 8,
    color: theme.colors.error,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "MullerBold",
    textAlign: "center",
  },
  errorHint: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "MullerMedium",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retryButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
  logoutButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  logoutButtonText: {
    color: theme.colors.error,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MullerBold",
  },
});