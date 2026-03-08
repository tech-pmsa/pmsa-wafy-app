import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "npm:googleapis"

// CORS headers are required so your mobile app can talk to the function
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
    // In Edge Functions, we get env variables using Deno.env
    const SHEET_ID = Deno.env.get('SHEET_FEES_ID')!
    const GOOGLE_CLIENT_EMAIL = Deno.env.get('GOOGLE_CLIENT_EMAIL')!
    const GOOGLE_PRIVATE_KEY = Deno.env.get('GOOGLE_PRIVATE_KEY')!.replace(/\\n/g, '\n')

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const metadata = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
    const sheetNames = metadata.data.sheets
      ?.map(sheet => sheet.properties?.title)
      .filter(Boolean) as string[]

    const data: Record<string, { headers: string[]; rows: any[] }> = {}

    for (const sheetName of sheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!A1:GE60`,
      })

      const values = response.data.values || []
      if (values.length === 0) continue

      const headerIndex = values.findIndex(row =>
        row.some(cell => cell?.toLowerCase?.().includes('cic'))
      )
      if (headerIndex === -1) continue

      data[sheetName] = {
        headers: values[headerIndex],
        rows: values.slice(headerIndex + 1),
      }
    }

    // Return the JSON response
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[FEES_FETCH_ERROR]', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})