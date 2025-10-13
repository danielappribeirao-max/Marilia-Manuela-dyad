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
    // Nota: Em um ambiente de produção, você usaria o Supabase Admin Client
    // e verificaria a autenticação do usuário administrador aqui.
    
    const { to, message } = await req.json()

    if (!to || !message) {
        throw new Error("Destinatário (to) e mensagem (message) são obrigatórios.");
    }

    // --- SIMULAÇÃO DE ENVIO DE WHATSAPP ---
    console.log(`[WHATSAPP SIMULATION] Enviando para: ${to}`);
    console.log(`[WHATSAPP SIMULATION] Conteúdo: ${message}`);
    // Aqui seria o código real para chamar a API do WhatsApp Business/Twilio/etc.
    // Ex: await fetch('https://api.whatsapp.com/...', { headers: { Authorization: 'Bearer SECRET_KEY' }, body: JSON.stringify({ to, message }) });
    // --------------------------------------

    return new Response(JSON.stringify({ success: true, message: `Simulação de envio para ${to} concluída.` }), {
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