import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função auxiliar para esperar um pouco
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password, name, phone, cpf, role } = await req.json()

    if (!email || !name || !role) {
        throw new Error("Email, nome e função são obrigatórios.");
    }

    // 1. Criar usuário Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password || 'senhaPadrao123',
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone: phone,
      },
    })

    if (authError) {
      throw authError
    }

    const userId = authData.user.id

    // 2. Esperar um breve momento para o gatilho handle_new_user criar o perfil
    await delay(500); 

    // 3. Atualizar/Upsert o perfil com os dados completos (incluindo CPF e Role)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: name,
        phone: phone,
        cpf: cpf,
        role: role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : 'user',
      }, { onConflict: 'id' }) // Usa upsert para garantir que o perfil exista
      .select('*, procedure_credits')
      .single()

    if (profileError) {
      throw profileError
    }
    
    // Adiciona o e-mail ao objeto de resposta
    const responseUser = { ...profileData, email: authData.user.email };

    return new Response(JSON.stringify({ user: responseUser }), {
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