import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserData {
  loading: boolean;
  user: User | null;
  role: string | null;
  details: { [key: string]: any } | null;
}

export function useUserData(): UserData {
  const [data, setData] = useState<UserData>({
    loading: true,
    user: null,
    role: null,
    details: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      let finalUser: User | null = null;
      let finalRole: string | null = null;
      let finalDetails: any = null;

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) return; // Will skip to the 'finally' block

        finalUser = session.user;

        // Try profiles table first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('uid', finalUser.id)
          .single();

        if (profile && !profileError) {
          finalRole = profile.role;
          finalDetails = profile;
          return; // Skip to 'finally' block
        }

        // Then try students table
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('uid', finalUser.id)
          .single();

        if (student && !studentError) {
          finalRole = student.role;
          finalDetails = student;
        }

      } catch (err) {
        console.error('Error fetching user data in hook:', err);
      } finally {
        // This is guaranteed to run, hiding your loading spinners!
        setData({
          loading: false,
          user: finalUser,
          role: finalRole,
          details: finalDetails,
        });
      }
    };

    fetchData();
  }, []);

  return data;
}