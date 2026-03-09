import "../global.css";
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabaseClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Helper function to fetch user role safely
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
  // NEW: Added fontError to prevent the app from hanging if a font fails to load!
  const [fontsLoaded, fontError] = useFonts({
    'AnekMalayalam': require('../assets/fonts/AnekMalayalam-Variable.ttf'),
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

  // 1. Handle Splash Screen
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 2. Handle Authentication (Single Source of Truth)
  useEffect(() => {
    let isMounted = true; // Prevents state updates if component unmounts

    // Supabase automatically fires this the moment the app opens, so we don't need getSession()!
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);

      if (newSession) {
        setIsFetchingRole(true);
        const userRole = await getUserRole(newSession.user.id);

        if (isMounted) {
          setRole(userRole);
          setIsFetchingRole(false);
          setIsInitialized(true); // Unlock the app!
        }
      } else {
        if (isMounted) {
          setRole(null);
          setIsFetchingRole(false);
          setIsInitialized(true); // Unlock the app!
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 3. Handle Route Redirection
  useEffect(() => {
    // Wait until everything is perfectly ready before moving the user
    const isReadyToRoute = isInitialized && rootNavigationState?.key && !isFetchingRole;
    if (!isReadyToRoute) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isRootIndex = pathname === '/';

    setTimeout(() => {
      // Not logged in?
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
      // Logged in with a role?
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

        // Move them if they are stuck on Login OR the Root Index cap screen
        if ((inAuthGroup || isRootIndex) && targetRoute) {
          router.replace(targetRoute as any);
        }
      }
    }, 0);

  }, [session, isInitialized, segments, pathname, role, rootNavigationState?.key, isFetchingRole]);

  // 4. Loading State Check
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