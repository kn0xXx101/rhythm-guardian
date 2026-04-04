import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({
          status: false,
          message: 'Payment verification not configured. Please set PAYSTACK_SECRET_KEY in Edge Function secrets.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body — reference is required, expectedAmount (in pesewas) is optional
    const body = await req.json();
    const { reference, expectedAmount } = body;

    if (!reference) {
      return new Response(
        JSON.stringify({ status: false, message: 'Payment reference is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Verifying payment with reference:', reference, 'expectedAmount:', expectedAmount);

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verificationData = await paystackResponse.json();
    console.log('Paystack verification response status:', verificationData?.data?.status);

    if (!paystackResponse.ok) {
      console.error('Paystack API error:', verificationData);
      return new Response(
        JSON.stringify({
          status: false,
          message: verificationData.message || 'Failed to verify payment with Paystack',
        }),
        {
          status: paystackResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Guard: transaction must be marked success by Paystack
    if (verificationData?.data?.status !== 'success') {
      console.warn('Paystack transaction not successful:', verificationData?.data?.status);
      return new Response(
        JSON.stringify({
          status: false,
          message: `Payment verification failed: transaction status is "${verificationData?.data?.status}"`,
          data: verificationData?.data,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Guard: confirmed amount must match what we expected (prevents partial-payment fraud)
    if (typeof expectedAmount === 'number') {
      const confirmedAmount = verificationData?.data?.amount; // amount in pesewas from Paystack
      if (confirmedAmount !== expectedAmount) {
        console.error(
          `Amount mismatch: expected ${expectedAmount} pesewas, Paystack confirmed ${confirmedAmount} pesewas`
        );
        return new Response(
          JSON.stringify({
            status: false,
            message: `Payment amount mismatch. Expected ${expectedAmount}, received ${confirmedAmount}.`,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Return structured verification result matching the frontend PaymentVerification interface
    return new Response(
      JSON.stringify({
        status: true,
        message: 'Verification successful',
        data: verificationData.data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in paystack-verify function:', error);
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
