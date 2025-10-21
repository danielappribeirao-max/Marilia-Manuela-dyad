import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Inicializa o cliente Supabase com o Service Role Key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()

    if (!userId) {
        throw new Error("ID do usuário é obrigatório.");
    }

    // 1. Excluir o usuário do sistema de autenticação
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      // Se houver um erro de exclusão (ex: último admin), capturamos a mensagem
      console.error("Supabase Auth Delete Error:", deleteError.message);
      // Retorna 400 com a mensagem de erro no corpo JSON
      return new Response(JSON.stringify({ error: deleteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, 
      })
    }

    return new Response(JSON.stringify({ success: true, message: `Usuário ${userId} excluído com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Captura erros de parsing ou validação inicial
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao excluir usuário.";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})