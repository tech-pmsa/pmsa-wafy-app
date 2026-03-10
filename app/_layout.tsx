import "../global.css";
import { useEffect, useState } from 'react';
import {
  Slot,
  useRouter,
  useSegments,
  useRootNavigationState,
  usePathname,
} from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabaseClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return role.toLowerCase().trim().replace(/_/g, '-').replace(/ /g, '-');
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
      supabase
        .from('profiles')
        .select('role')
        .eq('uid', uid)
        .maybeSingle(),
      5000,
      { data: null, error: new Error('profiles timeout') } as any
    );

    if (profileError) {
      console.error('Profile role fetch error:', profileError);
    }

    if (profile?.role) {
      return normalizeRole(profile.role) || 'student';
    }

    const { data: student, error: studentError } = await withTimeout(
      supabase
        .from('students')
        .select('role')
        .eq('uid', uid)
        .maybeSingle(),
      5000,
      { data: null, error: new Error('students timeout') } as any
    );

    if (studentError) {
      console.error('Student role fetch error:', studentError);
    }

    if (student?.role) {
      return normalizeRole(student.role) || 'student';
    }

    return 'student';
  } catch (error) {
    console.error('Error fetching user role in layout:', error);
    return 'student';
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    MullerBold: require('../assets/fonts/MullerBold.ttf'),
    MullerMedium: require('../assets/fonts/MullerMedium.ttf'),
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
        'student'
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
          console.error('getSession error:', error);
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
        console.error('Auth Init Error:', error);

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

    const inAuthGroup = segments[0] === '(auth)';
    const isRootIndex = pathname === '/';

    const roleRedirects: Record<string, string> = {
      officer: '/(admin)/officer/officer-dashboard',
      class: '/(admin)/classroom/class-dashboard',
      'class-leader': '/(admin)/classleader/class-leader-dashboard',
      staff: '/(admin)/staff/staff-dashboard',
      student: '/(student)/student-dashboard',
    };

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
      return;
    }

    const safeRole = normalizeRole(role) || 'student';
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