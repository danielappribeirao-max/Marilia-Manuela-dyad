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
    
    // --- 1. Verificação de Último Administrador ---
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
    if (profileError) {
        throw new Error(`Perfil não encontrado para o usuário: ${profileError.message}`);
    }
    
    if (profile.role === 'admin') {
        const { count, error: countError } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'admin');
            
        if (countError) {
            throw new Error(`Erro ao contar administradores: ${countError.message}`);
        }
        
        if (count === 1) {
            return new Response(JSON.stringify({ error: "Não é possível excluir o último usuário com função 'admin'. Garanta que haja pelo menos um administrador ativo." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200, 
            });
        }
    }
    // ---------------------------------------------

    // 2. Excluir o usuário do sistema de autenticação
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error("Supabase Auth Delete Error:", deleteError.message);
      // Se o erro for genérico, retornamos uma mensagem mais útil
      const errorMessage = deleteError.message.includes('Database error deleting user') 
        ? "Falha na exclusão. O usuário pode ter dados associados que impedem a exclusão, ou é o último administrador."
        : deleteError.message;
        
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