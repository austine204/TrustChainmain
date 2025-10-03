import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReleasePaymentRequest {
  orderId: string;
  driverId: string;
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

    const { orderId, driverId }: ReleasePaymentRequest = await req.json();

    if (!orderId || !driverId) {
      throw new Error('Missing required fields: orderId, driverId');
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, deliveries(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found');

    if (order.status !== 'delivered') {
      throw new Error('Order must be delivered before releasing payment');
    }

    const delivery = order.deliveries?.[0];
    if (!delivery?.otp_verified) {
      throw new Error('Delivery OTP must be verified before releasing payment');
    }

    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (paymentError) throw paymentError;
    if (!payment) throw new Error('Payment not found');

    if (payment.status !== 'held_escrow') {
      throw new Error('Payment is not in escrow');
    }

    const { error: updatePaymentError } = await supabaseClient
      .from('payments')
      .update({
        status: 'released',
        driver_id: driverId,
        released_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updatePaymentError) throw updatePaymentError;

    const { error: updateOrderError } = await supabaseClient
      .from('orders')
      .update({
        payment_status: 'released',
      })
      .eq('id', orderId);

    if (updateOrderError) throw updateOrderError;

    await supabaseClient.rpc('increment', {
      table_name: 'profiles',
      row_id: driverId,
      column_name: 'total_deliveries',
      increment_by: 1,
    });

    await supabaseClient.from('activity_logs').insert({
      order_id: orderId,
      user_id: driverId,
      action: 'payment_released',
      details: {
        amount: payment.amount,
        transaction_ref: payment.transaction_ref,
      },
    });

    await supabaseClient.from('notifications').insert([
      {
        user_id: order.customer_id,
        type: 'payment',
        title: 'Payment Released',
        message: `Payment of KES ${payment.amount} has been released for order ${order.tracking_id}`,
        data: { order_id: orderId, payment_id: payment.id },
      },
      {
        user_id: driverId,
        type: 'payment',
        title: 'Payment Received',
        message: `You received KES ${payment.amount} for delivering order ${order.tracking_id}`,
        data: { order_id: orderId, payment_id: payment.id },
      },
      {
        user_id: order.merchant_id,
        type: 'order',
        title: 'Order Completed',
        message: `Order ${order.tracking_id} has been successfully delivered and payment released`,
        data: { order_id: orderId },
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment released successfully',
        data: { order_id: orderId, payment_id: payment.id },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error releasing payment:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Payment release failed',
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
