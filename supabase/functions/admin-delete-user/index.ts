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
        return new Response(JSON.stringify({ error: "ID do usuário é obrigatório." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200, 
        })
    }
    
    // --- 1. Tentar anular referências em tabelas dependentes (ex: bookings) ---
    // Isso é necessário se a chave estrangeira não tiver ON DELETE CASCADE ou SET NULL
    const { error: updateBookingsError } = await supabaseAdmin
        .from('bookings')
        .update({ user_id: null })
        .eq('user_id', userId);
        
    if (updateBookingsError) {
        console.error("Error setting user_id to null in bookings:", updateBookingsError);
        // Não é um erro fatal, mas é bom logar
    }
    
    // --- 2. Excluir o usuário do sistema de autenticação ---
    // Isso deve acionar a exclusão em cascata do perfil.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Supabase Auth Delete Error:", deleteError.message);
      
      let errorMessage = deleteError.message;
      if (deleteError.message.includes('Database error deleting user')) {
          // Se ainda falhar após anular os bookings, é provável que seja o último admin
          errorMessage = "Falha na exclusão. O usuário pode ser o último administrador, ou ter outros dados associados que impedem a exclusão.";
      }
        
      return new Response(JSON.stringify({ error: errorMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      })
    }

    return new Response(JSON.stringify({ success: true, message: `Usuário ${userId} excluído com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao excluir usuário.";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    })
  }
})