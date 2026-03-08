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

    const payload = await req.json()
    const { action } = payload

    if (action === 'clear_attendance') {
      // Supabase requires a filter to delete multiple rows. We use a date far in the past to capture everything.
      const { error } = await supabase.from('attendance').delete().gte('date', '2000-01-01')
      if (error) throw error

      return new Response(JSON.stringify({ success: true, message: 'Attendance cleared.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'unlock_attendance') {
      const { class_id, date, reason } = payload

      const { error } = await supabase.from('attendance')
        .update({ status_locked: false })
        .eq('class_id', class_id)
        .eq('date', date)

      if (error) throw error

      // Optional: You could log the 'reason' to a separate audit table here if you wanted.

      return new Response(JSON.stringify({ success: true, message: `Attendance for ${class_id} on ${date} unlocked.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Invalid action specified.')

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})