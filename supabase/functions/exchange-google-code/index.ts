import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { google } from "https://esm.sh/googleapis@140.0.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()
    if (!code) {
      throw new Error("O código de autorização é obrigatório.");
    }

    // Inicializa o cliente de autenticação do Supabase para obter o usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    // Configura o cliente OAuth2 do Google
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('GOOGLE_CLIENT_ID'),
      Deno.env.get('GOOGLE_CLIENT_SECRET'),
      'postmessage' // Importante para o fluxo do lado do cliente
    );

    // Troca o código pelos tokens
    const { tokens } = await oauth2Client.getToken(code);
    const { access_token, refresh_token } = tokens;

    if (!refresh_token) {
      // O refresh_token só é fornecido na primeira vez que o usuário autoriza.
      // Se ele já autorizou antes e revogou, pode não vir.
      // O ideal é instruir o usuário a remover o app da conta Google e tentar de novo.
      console.warn(`Refresh token não recebido para o usuário ${user.id}. O usuário pode precisar re-autorizar o aplicativo.`);
    }

    // Usa o cliente admin para salvar os tokens de forma segura no perfil do usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        google_access_token: access_token,
        google_refresh_token: refresh_token,
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, message: "Conta Google conectada com sucesso." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Erro na troca de código do Google:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})