import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Service Role Key to bypass RLS and access Auth Admin functions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { action } = payload

    // ---------------------------------------------------------
    // ACTION: DELETE SINGLE USER
    // ---------------------------------------------------------
    if (action === 'delete_user') {
      const { uid } = payload
      if (!uid) throw new Error('User ID (uid) is required.')

      // 1. Delete from Supabase Auth (This will also trigger ON DELETE CASCADE in the DB if you set it up)
      const { error: authError } = await supabase.auth.admin.deleteUser(uid)
      if (authError) throw authError

      // 2. Explicitly delete from 'students' table just to be safe
      const { error: dbError } = await supabase.from('students').delete().eq('uid', uid)
      if (dbError) throw dbError

      return new Response(JSON.stringify({ success: true, message: 'Student deleted successfully.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ACTION: DELETE ENTIRE CLASS
    // ---------------------------------------------------------
    if (action === 'delete_class') {
      const { class_id } = payload
      if (!class_id) throw new Error('Class ID is required.')

      // 1. Fetch all students that belong to this class
      const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('uid')
        .eq('class_id', class_id)

      if (fetchError) throw fetchError

      // 2. Loop through and delete each student from Supabase Auth
      if (students && students.length > 0) {
        for (const student of students) {
          const { error: authError } = await supabase.auth.admin.deleteUser(student.uid)
          if (authError) {
            console.error(`Failed to delete auth user ${student.uid}:`, authError.message)
            // We log the error but continue the loop so one broken user doesn't stop the whole deletion
          }
        }
      }

      // 3. Delete the class records from the database
      const { error: dbError } = await supabase.from('students').delete().eq('class_id', class_id)
      if (dbError) throw dbError

      return new Response(JSON.stringify({ success: true, message: `All students in ${class_id} deleted.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ACTION: CLEAR ATTENDANCE
    // ---------------------------------------------------------
    if (action === 'clear_attendance') {
      const { error } = await supabase.from('attendance').delete().gte('date', '2000-01-01')
      if (error) throw error

      return new Response(JSON.stringify({ success: true, message: 'Attendance cleared.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ACTION: UNLOCK ATTENDANCE
    // ---------------------------------------------------------
    if (action === 'unlock_attendance') {
      const { class_id, date, reason } = payload

      const { error } = await supabase.from('attendance')
        .update({ status_locked: false })
        .eq('class_id', class_id)
        .eq('date', date)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, message: `Attendance for ${class_id} on ${date} unlocked.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Fallback if action doesn't match
    throw new Error('Invalid action specified.')

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})