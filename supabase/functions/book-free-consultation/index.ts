import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 2. Initialize Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Parse request body and validate data
    const { name, phone, description, bookingDate, professionalId } = await req.json()
    
    if (!name || !phone || !bookingDate || !professionalId) {
      throw new Error("Dados insuficientes. Nome, telefone, data e profissional são obrigatórios.")
    }

    const date = new Date(bookingDate);
    if (isNaN(date.getTime())) {
        throw new Error(`Formato de data inválido recebido: ${bookingDate}`);
    }

    // 4. Find or Create User
    const phoneDigits = phone.replace(/\D/g, '');
    const tempEmail = `temp_${phoneDigits}@mariliamanuela.com`;
    const tempPassword = `temp${phoneDigits}`;
    let userId;

    const { data: existingUserData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserByEmail(tempEmail);
    
    if (userFetchError && userFetchError.message !== 'User not found') {
        throw new Error(`Erro ao verificar usuário: ${getUserError.message}`);
    }

    if (existingUserData?.user) {
        userId = existingUserData.user.id;
    } else {
        const { data: newAuthData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: tempEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: name, phone: phone },
        });

        if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);
        userId = newAuthData.user.id;
        // O trigger 'handle_new_user' cria o perfil.
    }

    // 5. Prepare Booking Data
    const bookingDateStr = date.toISOString().split('T')[0];
    const bookingTimeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const notes = `Serviços de Interesse: ${description || 'Não informado'}`;

    const bookingPayload = {
        user_id: userId,
        service_id: null, // Consulta gratuita não tem ID de serviço
        service_name: 'Consulta de Avaliação Gratuita',
        professional_id: professionalId,
        booking_date: bookingDateStr,
        booking_time: bookingTimeStr,
        status: 'Agendado',
        duration: 30,
        notes: notes,
    };

    // 6. Insert Booking
    const { data: bookingData, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single();
    
    if (bookingError) {
        throw new Error(`Erro no banco de dados ao agendar: ${bookingError.message}`);
    }

    // 7. Return Success Response
    return new Response(JSON.stringify({ success: true, booking: bookingData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // 8. Return Detailed Error Response
    console.error('!!! Erro crítico na Edge Function:', error);
    // Retorna 400 para que o cliente saiba que a requisição falhou
    return new Response(JSON.stringify({ error: error.message || 'Ocorreu um erro inesperado no servidor.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})