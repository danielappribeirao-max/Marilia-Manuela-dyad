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

    const { name, phone, email, description, date, time, professionalId, serviceId, serviceName, duration } = await req.json()

    if (!name || !phone || !email || !description || !date || !time || !professionalId || !serviceId || !serviceName || !duration) {
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
    
    const phoneDigits = phone.replace(/\D/g, '');
    let userId: string | null = null;
    let userWasCreated = false;
    
    // 1. Tentar encontrar usuário existente pelo email
    const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (fetchError && fetchError.message !== 'User not found') {
        // Erro inesperado ao buscar
        return new Response(JSON.stringify({ error: `Erro ao verificar usuário existente: ${fetchError.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    
    if (existingUser?.user) {
        userId = existingUser.user.id;
        // Se o usuário existe, garantimos que o perfil esteja atualizado com o nome e telefone fornecidos
        await supabaseAdmin
            .from('profiles')
            .update({
                full_name: name,
                phone: phoneDigits,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
            
    } else {
        // 2. Se o usuário não foi encontrado, criar um novo usuário
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: 'senhaPadrao123', // Senha padrão para novos cadastros rápidos
            email_confirm: false,
            user_metadata: {
                full_name: name,
                phone: phone,
            },
        });
        
        if (authError) {
            return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }
        
        userId = authData.user.id;
        userWasCreated = true;
    }
    
    if (!userId) {
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
        status: 'Agendado',
        duration: parsedDuration,
        service_name: serviceName,
        notes: `Agendamento Rápido. Interesse: ${description}`,
    };
    
    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    if (bookingError) {
      return new Response(JSON.stringify({ error: `Erro ao inserir agendamento: ${bookingError.message}.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
      });
    }
    
    // 4. Retornar sucesso
    const responsePayload = { 
        success: true, 
        booking: bookingData, 
        newUserId: userId,
        tempEmail: email, // Retorna o email fornecido
        userWasCreated: userWasCreated,
    };
    
    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Erro interno inesperado no servidor." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})