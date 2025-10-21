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
    // Isso deve acionar a exclusão em cascata na tabela 'profiles' e em outras tabelas relacionadas.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      // Se houver um erro de exclusão (ex: último admin), lança o erro para ser capturado abaixo
      throw new Error(deleteError.message);
    }

    return new Response(JSON.stringify({ success: true, message: `Usuário ${userId} excluído com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Captura qualquer erro (incluindo o erro de deleteError lançado acima)
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao excluir usuário.";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Retorna 400 para indicar falha na requisição de exclusão
    })
  }
})