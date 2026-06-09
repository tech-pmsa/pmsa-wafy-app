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
    // ACTION: PROMOTE ENTIRE CLASS
    // ---------------------------------------------------------
    if (action === 'promote_class') {
      const { from_class, to_class } = payload

      if (!from_class || !to_class) {
        throw new Error('Source class and destination class are required.')
      }

      if (from_class === to_class) {
        throw new Error('Source class and destination class must be different.')
      }

      const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('uid')
        .eq('class_id', from_class)

      if (fetchError) throw fetchError

      if (!students || students.length === 0) {
        throw new Error(`No students were found in ${from_class}.`)
      }

      const studentUids = students.map((student: { uid: string }) => student.uid)

      // Keep the kitchen roster in sync before changing the primary student records.
      const { error: kitchenError } = await supabase
        .from('kitchen_students')
        .update({ class_id: to_class })
        .in('student_uid', studentUids)

      if (kitchenError) throw kitchenError

      const { data: promotedStudents, error: studentsError } = await supabase
        .from('students')
        .update({ class_id: to_class })
        .eq('class_id', from_class)
        .select('uid')

      if (studentsError) {
        // Best-effort rollback so kitchen data does not remain on the new class.
        await supabase
          .from('kitchen_students')
          .update({ class_id: from_class })
          .in('student_uid', studentUids)

        throw studentsError
      }

      return new Response(JSON.stringify({
        success: true,
        promoted_count: promotedStudents?.length ?? students.length,
        message: `${promotedStudents?.length ?? students.length} students promoted from ${from_class} to ${to_class}.`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // ---------------------------------------------------------
    // ACTION: CONVERT LIVE CLASS TO OLD STUDENTS
    // ---------------------------------------------------------
    if (action === 'convert_old_students') {
      const { class_id, start_year, end_year, archived_by } = payload

      const startYear = String(start_year || '').trim()
      const endYear = String(end_year || '').trim()

      if (!class_id) throw new Error('Class ID is required.')
      if (!/^\d{4}$/.test(startYear) || !/^\d{4}$/.test(endYear)) {
        throw new Error('Start year and end year must be four digit years.')
      }
      if (Number(endYear) <= Number(startYear)) {
        throw new Error('End year must be greater than start year.')
      }

      const archiveClassId = `${startYear}-${endYear.slice(2)}`

      const { data: students, error: studentsFetchError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', class_id)

      if (studentsFetchError) throw studentsFetchError

      if (!students || students.length === 0) {
        throw new Error(`No students were found in ${class_id}.`)
      }

      const studentUids = students.map((student: { uid: string }) => student.uid)

      const { data: familyRows, error: familyFetchError } = await supabase
        .from('family_data')
        .select('*')
        .in('student_uid', studentUids)

      if (familyFetchError) throw familyFetchError

      const familyByStudent = new Map(
        (familyRows || []).map((family: { student_uid: string }) => [family.student_uid, family])
      )

      const archiveRows = students.map((student: any) => {
        const family = familyByStudent.get(student.uid) || {}

        return {
          original_student_uid: student.uid,
          archive_class_id: archiveClassId,
          original_class_id: student.class_id,
          name: student.name,
          cic: student.cic,
          council: student.council,
          batch: student.batch,
          phone: student.phone,
          guardian: student.guardian,
          g_phone: student.g_phone,
          address: student.address,
          sslc: student.sslc,
          plustwo: student.plustwo,
          plustwo_streams: student.plustwo_streams,
          dob: student.dob,
          img_url: student.img_url,
          student_data: student,
          family_data: family,
          archived_by: archived_by || null,
        }
      })

      const { error: archiveError } = await supabase
        .from('old_students')
        .upsert(archiveRows, { onConflict: 'original_student_uid' })

      if (archiveError) throw archiveError

      const { data: academicEntries, error: academicFetchError } = await supabase
        .from('academic_entries')
        .select('id')
        .in('student_uid', studentUids)

      if (academicFetchError) throw academicFetchError

      const academicEntryIds = (academicEntries || []).map((entry: { id: string | number }) => entry.id)

      if (academicEntryIds.length > 0) {
        const { error: subjectMarksError } = await supabase
          .from('subject_marks')
          .delete()
          .in('entry_id', academicEntryIds)

        if (subjectMarksError) throw subjectMarksError
      }

      const cleanupSteps = [
        () => supabase.from('attendance').delete().in('student_uid', studentUids),
        () => supabase.from('achievements').delete().in('student_uid', studentUids),
        () => supabase.from('academic_entries').delete().in('student_uid', studentUids),
        () => supabase.from('kitchen_attendance_overrides').delete().in('student_uid', studentUids),
        () => supabase.from('kitchen_seat_assignments').delete().in('student_uid', studentUids),
        () => supabase.from('student_food_preferences').delete().in('student_uid', studentUids),
        () => supabase.from('internal_reading_marks').delete().in('student_uid', studentUids),
        () => supabase.from('internal_writing_marks').delete().in('student_uid', studentUids),
        () => supabase.from('internal_newspaper_marks').delete().in('student_uid', studentUids),
        () => supabase.from('internal_general_marks').delete().in('student_uid', studentUids),
        () => supabase.from('internal_student_skills').delete().in('student_uid', studentUids),
        () => supabase.from('internal_morning_talk_attendance').delete().in('student_uid', studentUids),
        () => supabase.from('internal_f_talk_marks').delete().in('student_uid', studentUids),
        () => supabase.from('homework_marks').delete().in('student_uid', studentUids),
        () => supabase.from('kitchen_students').delete().in('student_uid', studentUids),
        () => supabase.from('family_data').delete().in('student_uid', studentUids),
      ]

      for (const step of cleanupSteps) {
        const { error } = await step()
        if (error) throw error
      }

      const { error: studentsDeleteError } = await supabase
        .from('students')
        .delete()
        .in('uid', studentUids)

      if (studentsDeleteError) throw studentsDeleteError

      for (const uid of studentUids) {
        const { error: authError } = await supabase.auth.admin.deleteUser(uid)
        if (authError) {
          console.error(`Failed to delete auth user ${uid}:`, authError.message)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        archive_class_id: archiveClassId,
        converted_count: students.length,
        message: `${students.length} students converted to old students as ${archiveClassId}.`,
      }), {
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
      const { class_id, date, } = payload

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
