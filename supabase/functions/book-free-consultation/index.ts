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

    const { name, phone, description, bookingDate, professionalId } = await req.json()

    if (!name || !phone || !bookingDate || !professionalId) {
      throw new Error("Dados insuficientes: nome, telefone, data e profissional são obrigatórios.")
    }

    const phoneDigits = phone.replace(/\D/g, '');
    const tempEmail = `temp_${phoneDigits}@mariliamanuela.com`;
    const tempPassword = `temp${phoneDigits}`;

    // Etapa B: Verificar se o usuário já existe (de forma mais segura)
    let userId;
    const { data: userData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserByEmail(tempEmail);

    // Se houver um erro que não seja "usuário não encontrado", lance-o.
    if (userFetchError && userFetchError.message !== 'User not found') {
        throw userFetchError;
    }
    
    const existingUser = userData?.user;

    if (existingUser) {
        userId = existingUser.id;
    } else {
        // Etapa C: Criar novo usuário se não existir
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: tempEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: name, phone: phone },
        });

        if (authError) throw new Error(`Erro ao criar usuário: ${authError.message}`);
        userId = authData.user.id;
        
        // O trigger 'handle_new_user' já cria o perfil. Esta linha é uma garantia.
        await supabaseAdmin.from('profiles').update({ phone: phone }).eq('id', userId);
    }

    // Etapa D: Inserir o agendamento
    const date = new Date(bookingDate);
    const bookingDateStr = date.toISOString().split('T')[0];
    const bookingTimeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const notes = `Serviços de Interesse: ${description || 'Não informado'}`;

    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        service_id: null,
        service_name: 'Consulta de Avaliação Gratuita',
        professional_id: professionalId,
        booking_date: bookingDateStr,
        booking_time: bookingTimeStr,
        status: 'Agendado',
        duration: 30,
        notes: notes,
      })
      .select()
      .single();
    
    if (bookingError) throw new Error(`Erro ao inserir agendamento: ${bookingError.message}`);

    return new Response(JSON.stringify({ success: true, booking: bookingData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função book-free-consultation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Usar 500 para indicar um erro do servidor
    })
  }
})