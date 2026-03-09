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

        if (sessionError || !session) return;

        finalUser = session.user;

        // Try profiles table first safely
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('uid', finalUser.id)
          .maybeSingle();

        if (profile) {
          finalRole = profile.role?.toLowerCase().trim() || null;
          finalDetails = profile;
        } else {
          // If not in profiles, try students table
          const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('uid', finalUser.id)
            .maybeSingle();

          if (student) {
            // Guarantee they get the student role if column is blank
            finalRole = student.role?.toLowerCase().trim() || 'student';
            finalDetails = student;
          }
        }

      } catch (err) {
        console.error('Error fetching user data in hook:', err);
      } finally {
        // Run this no matter what, hiding the spinner
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