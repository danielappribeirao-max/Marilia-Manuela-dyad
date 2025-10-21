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
    const { to, subject, message } = await req.json()

    if (!to || !subject || !message) {
        throw new Error("Destinatário (to), assunto (subject) e mensagem (message) são obrigatórios.");
    }

    // --- SIMULAÇÃO DE ENVIO DE E-MAIL ---
    console.log(`[EMAIL REMINDER] Enviando para: ${to}`);
    console.log(`[EMAIL REMINDER] Assunto: ${subject}`);
    console.log(`[EMAIL REMINDER] Conteúdo: ${message}`);
    // Em um ambiente real, aqui você chamaria a API do seu provedor de e-mail (ex: Resend, SendGrid).
    // --------------------------------------

    return new Response(JSON.stringify({ success: true, message: `Simulação de envio de e-mail para ${to} concluída.` }), {
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