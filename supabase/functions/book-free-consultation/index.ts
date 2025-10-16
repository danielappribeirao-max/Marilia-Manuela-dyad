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

    const { name, phone, description, date, time, professionalId, serviceId, serviceName, duration } = await req.json()

    if (!name || !phone || !description || !date || !time || !professionalId || !serviceId || !serviceName || !duration) {
        return new Response(JSON.stringify({ error: "Todos os campos de agendamento são obrigatórios." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    
    const parsedDuration = parseInt(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
        return new Response(JSON.stringify({ error: "Duração do serviço inválida." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    
    // --- 1. VERIFICAÇÃO DE DISPONIBILIDADE NO BACKEND ---
    const { data: isAvailable, error: availabilityError } = await supabaseAdmin.rpc('check_full_availability', {
        p_professional_id: professionalId,
        p_booking_date: date,
        p_booking_time: time,
        p_duration: parsedDuration,
    });

    if (availabilityError) {
        console.error("RPC Availability Error:", availabilityError);
        return new Response(JSON.stringify({ error: `Erro ao verificar disponibilidade: ${availabilityError.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    if (isAvailable === false) {
        return new Response(JSON.stringify({ error: "O horário selecionado não está mais disponível. Por favor, escolha outro horário." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    // ----------------------------------------------------
    
    // 2. Criar ou buscar usuário
    const email = `${phone}@mariliamanuela.com`;
    let userId: string;
    let tempPassword = '';
    let userWasCreated = false;

    // Tenta criar o usuário
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'senhaPadrao123', // Usando senha padrão para facilitar o login temporário
      email_confirm: false,
      user_metadata: {
        full_name: name,
        phone: phone,
      },
    });
    
    if (authError) {
      if (authError.message.includes('User already exists')) {
          // Se o usuário já existe, busca o ID existente
          const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
          
          if (fetchError || !existingUser?.user) {
              console.error("Existing User Fetch Error:", fetchError);
              return new Response(JSON.stringify({ error: "Já existe um usuário cadastrado com este telefone, mas não foi possível recuperá-lo. Por favor, faça login primeiro." }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 400,
              });
          }
          userId = existingUser.user.id;
          // Não precisamos de senha temporária se o usuário já existia
      } else {
          console.error("Auth Error:", authError);
          return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
          });
      }
    } else {
        userId = authData.user.id;
        tempPassword = 'senhaPadrao123'; // Usamos a senha padrão
        userWasCreated = true;
    }
    
    // VERIFICAÇÃO CRÍTICA: Garantir que o userId foi obtido
    if (!userId) {
        console.error("Critical Error: User ID not obtained after creation or lookup.");
        return new Response(JSON.stringify({ error: "Erro interno: Não foi possível obter o ID do cliente." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
    
    // 3. Inserir o agendamento
    const bookingPayload = {
        user_id: userId,
        service_id: serviceId,
        professional_id: professionalId,
        booking_date: date, // YYYY-MM-DD
        booking_time: time, // HH:MM
        status: 'confirmed', 
        duration: parsedDuration,
        service_name: serviceName, // Garantindo que service_name está sendo usado
        notes: `Consulta Gratuita. Interesse: ${description}`,
    };
    
    console.log("Attempting to insert booking with payload:", bookingPayload);

    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    if (bookingError) {
      console.error("Booking Insert Error:", bookingError);
      return new Response(JSON.stringify({ error: `Erro ao inserir agendamento: ${bookingError.message}.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
      });
    }
    
    // VERIFICAÇÃO CRÍTICA: Se a inserção não retornou dados, algo falhou silenciosamente (ex: RLS, mas Service Role deveria ignorar)
    if (!bookingData) {
        console.error("Booking Insert Error: Insert operation returned no data.");
        return new Response(JSON.stringify({ error: "Falha ao registrar o agendamento no banco de dados. Tente novamente." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
    
    // 4. Retornar sucesso
    const responsePayload = { 
        success: true, 
        booking: bookingData, 
        newUserId: userId,
        tempEmail: email,
        // Retorna a senha temporária apenas se o usuário foi criado agora
        tempPassword: userWasCreated ? tempPassword : undefined, 
    };
    
    console.log("Booking successful. Payload:", responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Unexpected Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno inesperado no servidor." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})