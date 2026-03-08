import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "npm:googleapis"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SHEET_ID = Deno.env.get('SHEET_FEES_ID')!

    // Parse the ENTIRE JSON object directly from the new secret!
    const credentialsRaw = Deno.env.get('GOOGLE_CREDENTIALS')!
    const credentials = JSON.parse(credentialsRaw)

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key, // JSON parsing natively handles all the \n line breaks!
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

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('[FEES_FETCH_ERROR]', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})