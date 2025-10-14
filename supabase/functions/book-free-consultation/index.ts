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
      throw new Error("Dados insuficientes para criar o agendamento.")
    }

    // A. Gerar credenciais temporárias baseadas no telefone
    const phoneDigits = phone.replace(/\D/g, '');
    const tempEmail = `temp_${phoneDigits}@mariliamanuela.com`;
    const tempPassword = `temp${phoneDigits}`;

    // B. Verificar se o usuário já existe pelo e-mail temporário
    let userId;
    const { data: { user: existingUser } } = await supabaseAdmin.auth.admin.getUserByEmail(tempEmail);

    if (existingUser) {
        userId = existingUser.id;
    } else {
        // C. Criar novo usuário se não existir
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: tempEmail,
            password: tempPassword,
            email_confirm: true, // Já cria como confirmado
            user_metadata: { full_name: name, phone: phone },
        });

        if (authError) throw authError;
        userId = authData.user.id;
        // O trigger 'handle_new_user' cria o perfil. Apenas garantimos que o telefone está lá.
        await supabaseAdmin.from('profiles').update({ phone: phone }).eq('id', userId);
    }

    // D. Inserir o agendamento na tabela
    const date = new Date(bookingDate);
    const bookingDateStr = date.toISOString().split('T')[0];
    const bookingTimeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const notes = `Serviços de Interesse: ${description || 'Não informado'}`;

    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        service_id: null, // Chave da solução: Inserir como nulo
        service_name: 'Consulta de Avaliação Gratuita',
        professional_id: professionalId,
        booking_date: bookingDateStr,
        booking_time: bookingTimeStr,
        status: 'Agendado',
        duration: 30, // Duração padrão da consulta
        notes: notes,
      })
      .select()
      .single();
    
    if (bookingError) throw bookingError;

    return new Response(JSON.stringify({ success: true, booking: bookingData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in book-free-consultation function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})