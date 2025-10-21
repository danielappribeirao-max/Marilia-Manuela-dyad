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
    
    const phoneDigits = phone.replace(/\D/g, '');
    let userId: string | null = null;
    let tempEmail: string | null = null;
    let userWasCreated = false;
    
    // 1. Tentar encontrar usuário existente pelo telefone na tabela profiles
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', phoneDigits)
        .maybeSingle();

    if (existingProfile) {
        userId = existingProfile.id;
        // Tenta buscar o email de autenticação para retornar
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        tempEmail = authUser?.user?.email || `${phoneDigits}@mariliamanuela.com`;
    }

    // 2. Se o usuário não foi encontrado, criar um novo usuário temporário
    if (!userId) {
        tempEmail = `${phoneDigits}@mariliamanuela.com`;
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: tempEmail,
            password: 'senhaPadrao123',
            email_confirm: false,
            user_metadata: {
                full_name: name,
                phone: phone,
            },
        });
        
        if (authError) {
            // Se a criação falhar porque o email temporário já existe, busca o ID existente
            if (authError.message.includes('User already exists')) {
                const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(tempEmail);
                if (fetchError || !existingUser?.user) {
                    return new Response(JSON.stringify({ error: "Já existe um agendamento em andamento com este telefone. Por favor, faça login ou use outro telefone." }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 400,
                    });
                }
                userId = existingUser.user.id;
            } else {
                return new Response(JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                });
            }
        } else {
            userId = authData.user.id;
            userWasCreated = true;
        }
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
      // Se houver erro de RLS ou de disponibilidade (que deve ser verificado no frontend, mas falha de fallback)
      return new Response(JSON.stringify({ error: `Erro ao inserir agendamento: ${bookingError.message}. Verifique a disponibilidade e tente novamente.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
      });
    }
    
    // 4. Retornar sucesso
    const responsePayload = { 
        success: true, 
        booking: bookingData, 
        newUserId: userId,
        tempEmail: tempEmail,
        tempPassword: userWasCreated ? 'senhaPadrao123' : undefined, 
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