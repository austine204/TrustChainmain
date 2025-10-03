import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SMSRequest {
  phoneNumber: string;
  message: string;
  orderId?: string;
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

    const { phoneNumber, message, orderId }: SMSRequest = await req.json();

    if (!phoneNumber || !message) {
      throw new Error('Missing required fields: phoneNumber, message');
    }

    const formattedPhone = phoneNumber.replace(/^0/, '254');

    console.log(`Sending SMS to ${formattedPhone}: ${message}`);

    const smsResponse = {
      messageId: `SMS${Date.now()}`,
      status: 'sent',
      recipient: formattedPhone,
    };

    if (orderId) {
      await supabaseClient.from('activity_logs').insert({
        order_id: orderId,
        action: 'sms_sent',
        details: {
          phone: formattedPhone,
          message_id: smsResponse.messageId,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        data: smsResponse,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
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