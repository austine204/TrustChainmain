import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  orderId: string;
  phoneNumber: string;
  amount: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, phoneNumber, amount }: PaymentRequest = await req.json();

    if (!orderId || !phoneNumber || !amount) {
      throw new Error('Missing required fields: orderId, phoneNumber, amount');
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found');

    const formattedPhone = phoneNumber.replace(/^0/, '254');

    const mpesaResponse = {
      MerchantRequestID: `MPX${Date.now()}`,
      CheckoutRequestID: `CHK${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      CustomerMessage: 'Success. Request accepted for processing',
    };

    const { error: paymentError } = await supabaseClient
      .from('payments')
      .update({
        transaction_ref: mpesaResponse.CheckoutRequestID,
        status: 'held_escrow',
      })
      .eq('order_id', orderId);

    if (paymentError) throw paymentError;

    const { error: orderUpdateError } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'held_escrow',
      })
      .eq('id', orderId);

    if (orderUpdateError) throw orderUpdateError;

    await supabaseClient.from('activity_logs').insert({
      order_id: orderId,
      action: 'payment_initiated',
      details: {
        transaction_ref: mpesaResponse.CheckoutRequestID,
        amount,
        phone: formattedPhone,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment initiated successfully',
        data: mpesaResponse,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing payment:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});