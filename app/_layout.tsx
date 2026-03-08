import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // ADDED
import { supabase } from '@/lib/supabaseClient';

// Helper function to fetch user role
async function getUserRole(uid: string): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('role').eq('uid', uid).single();
  if (profile?.role) return profile.role;

  const { data: student } = await supabase.from('students').select('role').eq('uid', uid).single();
  if (student?.role) return student.role;

  return null;
}

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  const segments = useSegments();
  const router = useRouter();

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
      } else setRole(null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
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
        router.replace(targetRoute);
      }
    }
  }, [session, isInitialized, segments, role]);

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-900">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  // ADDED: GestureHandlerRootView wrapper for the Drawer
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}