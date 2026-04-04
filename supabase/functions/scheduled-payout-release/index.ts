import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Booking {
  id: string;
  musician_id: string;
  hirer_id: string;
  service_fee: number;
  event_type: string;
  musician_email: string;
  musician_name: string;
  hirer_name: string;
  bank_account_number: string;
  bank_code: string;
  bank_account_name: string;
  mobile_money_number: string;
  mobile_money_provider: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting scheduled payout release check...");

    // Find bookings eligible for auto-release
    const { data: eligibleBookings, error: fetchError } = await supabase
      .from("bookings_with_profiles")
      .select(`
        id,
        musician_id,
        hirer_id,
        service_fee,
        event_type,
        musician_email,
        musician_name,
        hirer_name,
        bank_account_number,
        bank_code,
        bank_account_name,
        mobile_money_number,
        mobile_money_provider
      `)
      .eq("payout_released", false)
      .eq("auto_release_enabled", true)
      .not("auto_release_date", "is", null)
      .lte("auto_release_date", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching eligible bookings:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${eligibleBookings?.length || 0} bookings eligible for auto-release`);

    const results = {
      total: eligibleBookings?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!eligibleBookings || eligibleBookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No bookings eligible for auto-release", results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each booking
    for (const booking of eligibleBookings as Booking[]) {
      try {
        console.log(`Processing auto-release for booking ${booking.id}`);

        // Call the payout function
        const { data: payoutData, error: payoutError } = await supabase.functions.invoke(
          "paystack-payout",
          {
            body: {
              bookingId: booking.id,
              musicianId: booking.musician_id,
              amount: booking.service_fee * 0.9, // 90% to musician
              reason: `Auto-release: ${booking.event_type}`,
            },
          }
        );

        if (payoutError) {
          console.error(`Failed to process payout for booking ${booking.id}:`, payoutError);
          results.failed++;
          results.errors.push(`Booking ${booking.id}: ${payoutError.message}`);
          continue;
        }

        console.log(`Successfully processed auto-release for booking ${booking.id}`);
        results.successful++;

        // Send notification email
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: booking.musician_email,
              subject: `Payment Released - ${booking.event_type}`,
              html: `
                <h2>Payment Automatically Released</h2>
                <p>Hi ${booking.musician_name},</p>
                <p>Your payment has been automatically released after the confirmation period.</p>
                <p><strong>Amount:</strong> GH₵${(booking.service_fee * 0.9).toFixed(2)}</p>
                <p><strong>Event:</strong> ${booking.event_type}</p>
                <p><strong>Client:</strong> ${booking.hirer_name}</p>
                <p>The funds should arrive in your account within 24 hours.</p>
              `,
              type: "payout",
            },
          });
        } catch (emailError) {
          console.error(`Failed to send email for booking ${booking.id}:`, emailError);
          // Don't fail the payout if email fails
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        results.failed++;
        results.errors.push(
          `Booking ${booking.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log("Scheduled payout release completed:", results);

    return new Response(
      JSON.stringify({
        message: "Scheduled payout release completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scheduled payout release:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
