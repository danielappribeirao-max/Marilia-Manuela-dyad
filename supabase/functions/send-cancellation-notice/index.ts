import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, message } = await req.json()

    if (!to || !message) {
        throw new Error("Destinatário (to) e mensagem (message) são obrigatórios.");
    }

    // --- SIMULAÇÃO DE ENVIO DE WHATSAPP ---
    console.log(`[WHATSAPP CANCELLATION] Enviando para: ${to}`);
    console.log(`[WHATSAPP CANCELLATION] Conteúdo: ${message}`);
    // --------------------------------------

    return new Response(JSON.stringify({ success: true, message: `Simulação de cancelamento para ${to} concluída.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})