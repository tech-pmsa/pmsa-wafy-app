import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service key bypasses RLS
    )

    const payload = await req.json()
    const { email, password, name, cic, class_id, council, batch, phone, guardian, g_phone, address, sslc, plustwo, plustwo_streams } = payload

    // 1. Create the user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm so they can log in immediately
      user_metadata: { role: 'student', name: name }
    })

    if (authError) throw authError

    const userId = authData.user.id

    // 2. Insert the user details into your students table
    const { error: dbError } = await supabase.from('students').insert([{
      uid: userId,
      role: 'student',
      name, cic, class_id, council, batch, phone, guardian, g_phone, address, sslc, plustwo, plustwo_streams
    }])

    if (dbError) {
      // Rollback auth user if DB insert fails
      await supabase.auth.admin.deleteUser(userId)
      throw dbError
    }

    return new Response(JSON.stringify({ success: true, user: authData.user }), {
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