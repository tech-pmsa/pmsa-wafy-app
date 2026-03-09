import "../global.css";
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabaseClient';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

async function getUserRole(uid: string): Promise<string | null> {
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('uid', uid).single();
    if (profile?.role) return profile.role;

    const { data: student } = await supabase.from('students').select('role').eq('uid', uid).single();
    if (student?.role) return student.role;
  } catch (error) {
    console.error("Error fetching user role in layout:", error);
  }
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'AnekMalayalam': require('../assets/fonts/AnekMalayalam-Variable.ttf'),
    'MullerBold': require('../assets/fonts/MullerBold.ttf'),
    'MullerMedium': require('../assets/fonts/MullerMedium.ttf'),
  });
  const rootNavigationState = useRootNavigationState();

  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(session);
        if (session) {
          const userRole = await getUserRole(session.user.id);
          setRole(userRole);
        }
      } catch (error) {
        console.error("Auth Initialization Error:", error);
      } finally {
        // THIS IS THE FIX! It guarantees the app will stop spinning even if offline.
        setIsInitialized(true);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const userRole = await getUserRole(newSession.user.id);
        setRole(userRole);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInitialized || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    setTimeout(() => {
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login' as any);
      } else if (session && role) {
        const roleRedirects: Record<string, string> = {
          officer: '/(admin)/officer/officer-dashboard',
          class: '/(admin)/classroom/class-dashboard',
          'class-leader': '/(admin)/classleader/class-leader-dashboard',
          staff: '/(admin)/staff/staff-dashboard',
          student: '/(student)/student-dashboard',
        };

        const targetRoute = roleRedirects[role];
        if (inAuthGroup && targetRoute) {
          router.replace(targetRoute as any);
        }
      } else if (session && !role && inAuthGroup) {
        // Fallback: If they have a session but no role exists in DB yet,
        // we log them out so they aren't permanently stuck on the login screen.
        console.warn("User has session but no assigned role.");
        supabase.auth.signOut();
      }
    }, 0);

  }, [session, isInitialized, segments, role, rootNavigationState?.key]);

  if (!fontsLoaded || !isInitialized) {
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