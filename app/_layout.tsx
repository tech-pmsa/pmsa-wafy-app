import "../global.css";
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabaseClient';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';


// Keep the splash screen visible while fetching fonts/auth
SplashScreen.preventAutoHideAsync();

// Helper function to fetch user role
async function getUserRole(uid: string): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('role').eq('uid', uid).single();
  if (profile?.role) return profile.role;

  const { data: student } = await supabase.from('students').select('role').eq('uid', uid).single();
  if (student?.role) return student.role;

  return null;
}

export default function RootLayout() {
  // ==========================================
  // 1. ALL HOOKS MUST BE DECLARED AT THE TOP
  // ==========================================
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

  // ==========================================
  // 2. ALL EFFECTS
  // ==========================================

  // Hide Splash Screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Handle Supabase Auth State
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const userRole = await getUserRole(session.user.id);
        setRole(userRole);
      }
      setIsInitialized(true);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const userRole = await getUserRole(newSession.user.id);
        setRole(userRole);
      } else {
        setRole(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);


  // Handle Route Redirection
  useEffect(() => {
    if (!isInitialized || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Wrap the routing logic in a setTimeout to push it to the next event tick!
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
      }
    }, 0); // 0ms delay safely waits for the UI to mount

  }, [session, isInitialized, segments, role, rootNavigationState?.key]);

  // ==========================================
  // 3. CONDITIONS & RETURNS (Must be after all hooks!)
  // ==========================================

  if (!fontsLoaded || !isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}