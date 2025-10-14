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

    const { name, phone, description, date, professionalId, serviceId, serviceName, duration } = await req.json()

    if (!name || !phone || !description || !date || !professionalId || !serviceId || !serviceName || !duration) {
        throw new Error("Todos os campos de agendamento são obrigatórios.");
    }
    
    // 1. Tenta encontrar um usuário existente pelo telefone (opcional, mas útil para evitar duplicidade)
    // Nota: O Supabase Auth não permite buscar por metadados, então vamos focar em criar um novo usuário
    // e deixar o cliente fazer o login/recuperação de senha se ele já tiver uma conta.
    
    // 2. Criar um e-mail temporário e senha padrão para o novo usuário
    const email = `${phone}@mariliamanuela.com`;
    const password = Math.random().toString(36).slice(-8); // Senha aleatória

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // Não confirmamos automaticamente para e-mails temporários
      user_metadata: {
        full_name: name,
        phone: phone,
      },
    })

    if (authError) {
      // Se o erro for 'User already exists', tentamos prosseguir com o agendamento
      if (authError.message.includes('User already exists')) {
          // Não podemos prosseguir com o agendamento sem o ID do usuário logado.
          // Neste fluxo, forçamos a criação de um novo usuário temporário.
          // Se o e-mail já existe, o cliente deve ser redirecionado para o login.
          throw new Error("Já existe um usuário cadastrado com este telefone. Por favor, faça login primeiro.");
      }
      throw authError
    }

    const userId = authData.user.id
    
    // 3. Inserir o agendamento
    const bookingDate = date.split('T')[0];
    const bookingTime = date.split('T')[1].substring(0, 5); // HH:MM

    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        service_id: serviceId,
        professional_id: professionalId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'Agendado',
        duration: duration,
        service_name: serviceName,
        notes: `Consulta Gratuita. Interesse: ${description}`,
      })
      .select()
      .single()

    if (bookingError) {
      throw bookingError
    }
    
    // 4. Retornar sucesso
    return new Response(JSON.stringify({ 
        success: true, 
        booking: bookingData, 
        newUserId: userId,
        tempEmail: email,
        tempPassword: password,
    }), {
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