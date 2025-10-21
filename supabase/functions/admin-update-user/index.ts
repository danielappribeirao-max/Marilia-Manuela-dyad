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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, name, phone, cpf, role, avatarUrl } = await req.json()

    if (!userId || !name || !role) {
        throw new Error("ID do usuário, nome e função são obrigatórios.");
    }
    
    // 1. Atualizar o registro de autenticação (apenas nome/metadados)
    // Nota: O CPF não deve ir para user_metadata.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
            full_name: name,
            phone: phone || null, // Garante que seja null se vazio
            avatar_url: avatarUrl || null, // Garante que seja null se vazio
        },
    });

    if (authError) {
        // Logamos o erro, mas não o tornamos fatal, pois a atualização do perfil é crítica.
        console.error("Auth Update Error (Non-fatal):", authError);
    }

    // 2. Atualizar o perfil na tabela public.profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: name,
        phone: phone || null, // Garante que seja null se vazio
        cpf: cpf || null, // Garante que seja null se vazio
        role: role,
        avatar_url: avatarUrl || null, // Garante que seja null se vazio
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*, procedure_credits')
      .single()

    if (profileError) {
      console.error("Profile Update Error (Fatal):", profileError);
      throw profileError
    }
    
    // 3. Retornar o perfil atualizado
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    const responseUser = { 
        ...profileData, 
        email: authUser?.email || 'email-nao-encontrado',
    };

    return new Response(JSON.stringify({ user: responseUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido ao atualizar usuário.";
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})