import "../global.css";
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
// NEW: Imported AppState from react-native
import { View, ActivityIndicator, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabaseClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

async function getUserRole(uid: string): Promise<string | null> {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('uid', uid).maybeSingle();
    if (profile) return profile.role?.toLowerCase().trim() || null;

    const { data: student } = await supabase.from('students').select('role').eq('uid', uid).maybeSingle();
    if (student) return student.role?.toLowerCase().trim() || 'student';
  } catch (error) {
    console.error("Error fetching user role in layout:", error);
  }
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'MullerBold': require('../assets/fonts/MullerBold.ttf'),
    'MullerMedium': require('../assets/fonts/MullerMedium.ttf'),
  });
  const rootNavigationState = useRootNavigationState();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetchingRole, setIsFetchingRole] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  // 1. WAKE UP SUPABASE (The 1-Hour Expiry Fix)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // App is opened! Tell Supabase to check and refresh the token.
        supabase.auth.startAutoRefresh();
      } else {
        // App is closed/backgrounded. Pause the timers to save battery.
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 2. Handle Splash Screen
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 3. Handle Authentication
  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(session);
        if (session) {
          const userRole = await getUserRole(session.user.id);
          if (isMounted) setRole(userRole);
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        if (isMounted) {
          setIsFetchingRole(false);
          setIsInitialized(true);
        }
      }
    };

    initializeApp();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'INITIAL_SESSION') return;

      if (!isMounted) return;
      setSession(newSession);

      if (newSession) {
        setIsFetchingRole(true);
        const userRole = await getUserRole(newSession.user.id);
        if (isMounted) {
          setRole(userRole);
          setIsFetchingRole(false);
        }
      } else {
        if (isMounted) {
          setRole(null);
          setIsFetchingRole(false);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 4. Handle Route Redirection
  useEffect(() => {
    const isReadyToRoute = isInitialized && rootNavigationState?.key && !isFetchingRole;
    if (!isReadyToRoute) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRootIndex = pathname === '/';

    setTimeout(() => {
      // User is not logged in
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
      // User IS logged in and we successfully got their role
      else if (session && role) {
        const roleRedirects: Record<string, string> = {
          officer: '/(admin)/officer/officer-dashboard',
          class: '/(admin)/classroom/class-dashboard',
          'class-leader': '/(admin)/classleader/class-leader-dashboard',
          staff: '/(admin)/staff/staff-dashboard',
          student: '/(student)/student-dashboard',
        };

        const safeRole = role.replace(/_/g, '-').replace(/ /g, '-');
        const targetRoute = roleRedirects[safeRole] || roleRedirects[role];

        if ((inAuthGroup || isRootIndex) && targetRoute) {
          router.replace(targetRoute as any);
        }
      }
      // THE RESCUE MISSION: Session exists, but token is dead/corrupted and role failed to load.
      else if (session && !role && (isRootIndex || inAuthGroup)) {
        console.warn("Dead session detected. Forcing logout to rescue user.");
        supabase.auth.signOut(); // This clears the corrupted token and safely drops them at the login screen!
      }
    }, 0);

  }, [session, isInitialized, segments, pathname, role, rootNavigationState?.key, isFetchingRole]);

  // 5. Loading State Check
  const fontsAreReady = fontsLoaded || fontError;

  if (!fontsAreReady || !isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <Slot />
    </GestureHandlerRootView>
  );
}