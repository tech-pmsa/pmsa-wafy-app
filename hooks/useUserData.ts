import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserData {
  loading: boolean;
  user: User | null;
  role: string | null;
  details: { [key: string]: any } | null;
}

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

export function useUserData(): UserData {
  const [data, setData] = useState<UserData>({
    loading: true,
    user: null,
    role: null,
    details: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      let finalUser: User | null = null;
      let finalRole: string | null = null;
      let finalDetails: any = null;

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error in useUserData:', sessionError);
        }

        if (!session) {
          if (isMounted) {
            setData({
              loading: false,
              user: null,
              role: null,
              details: null,
            });
          }
          return;
        }

        finalUser = session.user;

        const profileResult = await withTimeout(
          supabase
            .from('profiles')
            .select('*')
            .eq('uid', finalUser.id)
            .maybeSingle(),
          5000,
          { data: null, error: new Error('profiles timeout') } as any
        );

        if (profileResult?.error) {
          console.error('Profile fetch error:', profileResult.error);
        }

        if (profileResult?.data) {
          finalRole = normalizeRole(profileResult.data.role) || 'student';
          finalDetails = profileResult.data;
        } else {
          const studentResult = await withTimeout(
            supabase
              .from('students')
              .select('*')
              .eq('uid', finalUser.id)
              .maybeSingle(),
            5000,
            { data: null, error: new Error('students timeout') } as any
          );

          if (studentResult?.error) {
            console.error('Student fetch error:', studentResult.error);
          }

          if (studentResult?.data) {
            finalRole = normalizeRole(studentResult.data.role) || 'student';
            finalDetails = studentResult.data;
          } else {
            finalRole = 'student';
            finalDetails = null;
          }
        }
      } catch (err) {
        console.error('Error fetching user data in hook:', err);
      } finally {
        if (isMounted) {
          setData({
            loading: false,
            user: finalUser,
            role: finalRole,
            details: finalDetails,
          });
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return data;
}