import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// Use a chave secreta do Stripe para verificar a assinatura do webhook
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

// O Webhook não usa CORS, pois é chamado pelo Stripe
serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); // Você deve configurar este segredo no Supabase

  if (!signature || !webhookSecret) {
    return new Response('Webhook Secret ou Signature ausente', { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    // 1. Verifica a assinatura do webhook
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed.`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2. Inicializa o cliente Supabase com permissão de Admin (Service Role Key)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 3. Lida com o evento de pagamento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.user_id;
    const itemsDetails = session.metadata?.items_details;

    if (!userId || !itemsDetails) {
        console.error("Metadata ausente na sessão de checkout:", session.id);
        return new Response('Metadata ausente', { status: 400 });
    }
    
    const items = JSON.parse(itemsDetails);
    
    console.log(`Processando pagamento concluído para User ID: ${userId}`);
    
    // --- LÓGICA DE ADIÇÃO DE CRÉDITOS ---
    
    const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('procedure_credits')
        .eq('id', userId)
        .single();
        
    if (fetchError || !profile) {
        console.error("Erro ao buscar perfil do usuário:", fetchError);
        return new Response('Erro interno do servidor', { status: 500 });
    }
    
    let newCredits = profile.procedure_credits || {};
    
    for (const item of items) {
        const totalSessions = item.isPackage 
            ? item.quantity * (item.sessions || 1) // Se for pacote, a Edge Function de checkout deve ter calculado isso
            : item.quantity * (item.sessions || 1); // Se for serviço individual com sessões
            
        newCredits[item.id] = (newCredits[item.id] || 0) + totalSessions;
    }
    
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ procedure_credits: newCredits })
        .eq('id', userId);
        
    if (updateError) {
        console.error("Erro ao atualizar créditos do usuário:", updateError);
        return new Response('Erro interno do servidor', { status: 500 });
    }
    
    console.log(`Créditos adicionados com sucesso ao usuário ${userId}.`);
    // --- FIM DA LÓGICA DE ADIÇÃO DE CRÉDITOS ---

  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});