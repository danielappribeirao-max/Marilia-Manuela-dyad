import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@16.2.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inicializa o Stripe com a chave secreta do ambiente
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { items, userId, successUrl, cancelUrl } = await req.json()

    if (!items || !userId || !successUrl || !cancelUrl) {
        return new Response(JSON.stringify({ error: "Dados de compra incompletos." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    
    // Mapeia os itens para o formato line_items do Stripe
    const lineItems = items.map((item: any) => ({
        price_data: {
            currency: 'brl',
            unit_amount: Math.round(item.price * 100), // Preço em centavos
            product_data: {
                name: item.name,
                description: item.description,
                images: item.image ? [item.image] : [],
            },
        },
        quantity: item.quantity,
    }));

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId,
        // Armazena detalhes dos itens para processamento pós-pagamento (webhook)
        items_details: JSON.stringify(items.map((i: any) => ({ id: i.id, quantity: i.quantity, sessions: i.sessions || 1, isPackage: i.isPackage || false }))),
      },
    });

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno ao criar sessão de checkout." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})