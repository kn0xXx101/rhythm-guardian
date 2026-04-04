import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface RefundRequest {
  bookingId: string;
  userId: string;
  reason: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { bookingId, userId, reason }: RefundRequest = await req.json();

    if (!bookingId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processing refund request for booking ${bookingId}`);

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, transactions(*)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Verify user is authorized (hirer or admin)
    if (booking.hirer_id !== userId) {
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      const isAdmin = user?.user?.user_metadata?.role === "admin";
      
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if already refunded
    if (booking.refund_processed_at) {
      return new Response(
        JSON.stringify({ error: "Refund already processed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate refund amount
    const { data: refundCalc, error: calcError } = await supabase
      .rpc("calculate_refund_amount", {
        booking_id: bookingId,
        cancellation_date: new Date().toISOString(),
      })
      .single();

    if (calcError) {
      console.error("Error calculating refund:", calcError);
      throw calcError;
    }

    const refundAmount = refundCalc.refund_amount;
    const refundPercentage = refundCalc.refund_percentage;

    console.log(`Refund calculation: ${refundPercentage}% = GH₵${refundAmount}`);

    // Create refund record
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .insert({
        booking_id: bookingId,
        transaction_id: booking.transactions?.[0]?.id,
        amount: refundAmount,
        refund_percentage: refundPercentage,
        reason,
        requested_by: userId,
        status: refundAmount > 0 ? "processing" : "completed",
      })
      .select()
      .single();

    if (refundError) {
      console.error("Error creating refund record:", refundError);
      throw refundError;
    }

    // Update booking
    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_requested_at: new Date().toISOString(),
        cancellation_requested_by: userId,
        cancellation_reason: reason,
        refund_amount: refundAmount,
        refund_percentage: refundPercentage,
      })
      .eq("id", bookingId);

    // Process Paystack refund if amount > 0
    let paystackResponse = null;
    if (refundAmount > 0 && paystackSecretKey) {
      try {
        const transaction = booking.transactions?.[0];
        if (transaction?.paystack_reference) {
          const response = await fetch("https://api.paystack.co/refund", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transaction: transaction.paystack_reference,
              amount: Math.round(refundAmount * 100), // Convert to kobo
            }),
          });

          paystackResponse = await response.json();

          if (paystackResponse.status) {
            // Update refund record
            await supabase
              .from("refunds")
              .update({
                status: "completed",
                processed_at: new Date().toISOString(),
                paystack_reference: paystackResponse.data.transaction.reference,
              })
              .eq("id", refund.id);

            // Update booking
            await supabase
              .from("bookings")
              .update({
                refund_processed_at: new Date().toISOString(),
                refund_reference: paystackResponse.data.transaction.reference,
              })
              .eq("id", bookingId);

            console.log(`Refund processed successfully: ${paystackResponse.data.transaction.reference}`);
          } else {
            throw new Error(paystackResponse.message || "Paystack refund failed");
          }
        }
      } catch (paystackError) {
        console.error("Paystack refund error:", paystackError);
        
        // Update refund record with error
        await supabase
          .from("refunds")
          .update({
            status: "failed",
            error_message: paystackError instanceof Error ? paystackError.message : "Unknown error",
          })
          .eq("id", refund.id);

        throw paystackError;
      }
    } else if (refundAmount === 0) {
      // No refund due, mark as completed
      await supabase
        .from("refunds")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
        })
        .eq("id", refund.id);

      await supabase
        .from("bookings")
        .update({
          refund_processed_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    // Send notification email
    try {
      const { data: hirer } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", booking.hirer_id)
        .single();

      if (hirer?.email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: hirer.email,
            subject: `Booking Cancelled - Refund ${refundPercentage}%`,
            html: `
              <h2>Booking Cancelled</h2>
              <p>Hi ${hirer.full_name},</p>
              <p>Your booking has been cancelled.</p>
              <p><strong>Refund Amount:</strong> GH₵${refundAmount.toFixed(2)} (${refundPercentage}%)</p>
              <p><strong>Reason:</strong> ${reason}</p>
              ${refundAmount > 0 ? '<p>Your refund will be processed within 5-10 business days.</p>' : '<p>No refund is applicable based on our cancellation policy.</p>'}
            `,
            type: "confirmation",
          },
        });
      }
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the refund if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          id: refund.id,
          amount: refundAmount,
          percentage: refundPercentage,
          status: refund.status,
          paystackReference: paystackResponse?.data?.transaction?.reference,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
