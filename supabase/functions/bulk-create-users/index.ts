import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { students } = await req.json()

    let createdCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Loop through each student in the parsed array
    for (const student of students) {
      try {
        const cic = String(student.cic).trim().toLowerCase()
        const email = `${cic}@pmsa.com`
        const password = `${cic}@11`

        // Create Auth User
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { role: 'student', name: student.name }
        })

        if (authError) throw authError

        // Insert into Database
        const { error: dbError } = await supabase.from('students').insert([{
          uid: authData.user.id,
          role: 'student',
          name: student.name,
          cic: student.cic,
          class_id: student.class_id,
          council: student.council,
          batch: student.batch,
          phone: student.phone,
          guardian: student.guardian,
          g_phone: student.g_phone,
          address: student.address,
          sslc: student.sslc,
          plustwo: student.plustwo,
          plustwo_streams: student.plustwo_streams
        }])

        if (dbError) {
          await supabase.auth.admin.deleteUser(authData.user.id)
          throw dbError
        }

        createdCount++
      } catch (err: any) {
        failedCount++
        errors.push({ cic: student.cic, reason: err.message })
      }
    }

    return new Response(JSON.stringify({ success: true, createdCount, failedCount, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})