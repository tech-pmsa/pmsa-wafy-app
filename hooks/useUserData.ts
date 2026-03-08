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
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setData({ loading: false, user: null, role: null, details: null });
          return;
        }

        const user = session.user;

        // Try profiles table first
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (profile && !profileError) {
          setData({
            loading: false,
            user,
            role: profile.role,
            details: profile,
          });
          return;
        }

        // Then try students table, fetching ALL columns
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('uid', user.id)
          .single();

        if (student && !studentError) {
          setData({
            loading: false,
            user,
            role: student.role,
            details: student,
          });
          return;
        }

        // If no role found in any table
        setData({ loading: false, user, role: null, details: null });

      } catch (err) {
        console.error('Error fetching user data:', err);
        setData({ loading: false, user: null, role: null, details: null });
      }
    };

    fetchData();
  }, []);

  return data;
}