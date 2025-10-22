import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { google } from 'https://esm.sh/googleapis@162.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Obter dados do agendamento
    const { summary, description, start, end } = await req.json()

    if (!summary || !start || !end) {
        return new Response(JSON.stringify({ error: "Dados de agendamento incompletos." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    // 2. Configurar o cliente OAuth2
    // Os segredos devem ser configurados no painel do Supabase (Edge Functions -> Secrets)
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const GOOGLE_ACCESS_TOKEN = Deno.env.get('GOOGLE_ACCESS_TOKEN')
    const GOOGLE_REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN')
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_ACCESS_TOKEN || !GOOGLE_REFRESH_TOKEN) {
        throw new Error("Credenciais do Google incompletas. Verifique os segredos.");
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // Redirect URI usado para obter tokens
    );

    oauth2Client.setCredentials({
      access_token: GOOGLE_ACCESS_TOKEN,
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });
    
    // 3. Criar o evento no Google Calendar
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.insert({
      // Use 'primary' ou o ID do calendário específico da clínica
      calendarId: Deno.env.get('GOOGLE_CALENDAR_ID') || "primary", 
      requestBody: {
        summary,
        description,
        start: { dateTime: start, timeZone: "America/Sao_Paulo" },
        end: { dateTime: end, timeZone: "America/Sao_Paulo" },
      },
    });

    return new Response(JSON.stringify({ message: "Agendamento enviado ao Google Calendar!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Google Calendar Sync Error:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Falha ao enviar pro Google Calendar." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})