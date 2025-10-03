import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface FraudCheckRequest {
  orderId?: string;
  userId?: string;
  action: string;
}

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

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

    const { orderId, userId, action }: FraudCheckRequest = await req.json();

    const alerts: Array<{
      user_id: string | null;
      order_id: string | null;
      alert_type: string;
      severity: AlertSeverity;
      details: Record<string, unknown>;
    }> = [];

    if (userId) {
      const { data: user } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (user) {
        const { data: recentOrders, error: ordersError } = await supabaseClient
          .from('orders')
          .select('*')
          .eq('customer_id', userId)
          .gte('created_at', new Date(Date.now() - 3600000).toISOString())
          .order('created_at', { ascending: false });

        if (!ordersError && recentOrders && recentOrders.length > 5) {
          alerts.push({
            user_id: userId,
            order_id: null,
            alert_type: 'rapid_order_creation',
            severity: 'high',
            details: {
              order_count: recentOrders.length,
              timeframe: '1 hour',
              action,
            },
          });
        }

        if (user.rating < 2.0 && user.total_deliveries > 10) {
          alerts.push({
            user_id: userId,
            order_id: null,
            alert_type: 'low_rating',
            severity: 'medium',
            details: {
              rating: user.rating,
              total_deliveries: user.total_deliveries,
              action,
            },
          });
        }

        const { data: cancelledOrders } = await supabaseClient
          .from('orders')
          .select('*')
          .eq('customer_id', userId)
          .eq('status', 'cancelled')
          .gte('created_at', new Date(Date.now() - 86400000 * 7).toISOString());

        if (cancelledOrders && cancelledOrders.length > 3) {
          alerts.push({
            user_id: userId,
            order_id: null,
            alert_type: 'excessive_cancellations',
            severity: 'high',
            details: {
              cancelled_count: cancelledOrders.length,
              timeframe: '7 days',
              action,
            },
          });
        }
      }
    }

    if (orderId) {
      const { data: order } = await supabaseClient
        .from('orders')
        .select('*, deliveries(*)')
        .eq('id', orderId)
        .single();

      if (order) {
        if (order.amount > 50000) {
          alerts.push({
            user_id: order.customer_id,
            order_id: orderId,
            alert_type: 'high_value_transaction',
            severity: 'medium',
            details: {
              amount: order.amount,
              tracking_id: order.tracking_id,
              action,
            },
          });
        }

        const delivery = order.deliveries?.[0];
        if (delivery) {
          const assignedTime = new Date(delivery.assigned_at).getTime();
          const deliveredTime = delivery.delivered_at ? new Date(delivery.delivered_at).getTime() : null;

          if (deliveredTime && (deliveredTime - assignedTime) < 300000) {
            alerts.push({
              user_id: delivery.driver_id,
              order_id: orderId,
              alert_type: 'suspiciously_fast_delivery',
              severity: 'high',
              details: {
                delivery_time_minutes: Math.round((deliveredTime - assignedTime) / 60000),
                tracking_id: order.tracking_id,
                action,
              },
            });
          }

          if (delivery.otp_verified && !delivery.delivered_at) {
            alerts.push({
              user_id: delivery.driver_id,
              order_id: orderId,
              alert_type: 'otp_verified_without_delivery',
              severity: 'critical',
              details: {
                tracking_id: order.tracking_id,
                action,
              },
            });
          }
        }
      }
    }

    if (alerts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('fraud_alerts')
        .insert(alerts);

      if (insertError) {
        console.error('Error inserting fraud alerts:', insertError);
      }

      for (const alert of alerts.filter(a => a.severity === 'critical' || a.severity === 'high')) {
        const { data: admins } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('role', 'admin');

        if (admins) {
          await supabaseClient.from('notifications').insert(
            admins.map(admin => ({
              user_id: admin.id,
              type: 'fraud_alert',
              title: `${alert.severity.toUpperCase()} Fraud Alert`,
              message: `${alert.alert_type.replace(/_/g, ' ').toUpperCase()} detected`,
              data: alert.details,
            }))
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fraud check completed. ${alerts.length} alerts generated.`,
        data: {
          alerts_generated: alerts.length,
          alerts,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in fraud detection:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Fraud detection failed',
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
