import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Paystack-Signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable not set");
    }

    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate webhook signature
    const hash = createHmac("sha512", paystackSecretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency Check: Verify if we've already processed this event
    const eventId = event.data?.id?.toString() || event.id?.toString();
    if (eventId) {
      const { data: existingEvent, error: checkError } = await supabase
        .from("webhook_events")
        .select("id")
        .eq("id", eventId)
        .single();
        
      if (existingEvent) {
        console.log(`Event ${eventId} already processed natively. Skipping.`);
        return new Response(JSON.stringify({ status: "success", message: "Already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Attempt to immediately insert the event. If a race condition occurs, 
      // the unique primary key constraint on 'id' will cause a failure and prevent duplicate processing.
      const { error: insertError } = await supabase
        .from("webhook_events")
        .insert({ id: eventId, event_type: event.event });
        
      if (insertError) {
        console.error("Failed to insert webhook event ID (potential race condition or db error):", insertError);
        return new Response(JSON.stringify({ error: "Failed to record event idempotency" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("Webhook event is missing a unique ID, idempotency not guaranteed.");
    }

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(supabase, event.data);
        break;

      case "charge.failed":
        await handleChargeFailed(supabase, event.data);
        break;

      case "transfer.success":
        await handleTransferSuccess(supabase, event.data);
        break;

      case "transfer.failed":
        await handleTransferFailed(supabase, event.data);
        break;

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleChargeSuccess(supabase: any, data: any) {
  console.log("Handling successful charge:", data.reference);

  try {
    // Determine if this was a split payment
    const isSplit = !!data.subaccount;
    const splitData = isSplit ? {
      subaccount_code: data.subaccount.subaccount_code,
      transaction_charge: data.fees_split?.integration,
      subaccount_share: data.fees_split?.subaccount,
    } : {};

    // Update transaction status
    const { error: transactionError } = await supabase
      .from("transactions")
      .update({
        status: "paid",
        paystack_authorization: data.authorization,
        channel: data.channel,
        metadata: {
          customer_code: data.customer?.customer_code,
          gateway_response: data.gateway_response,
          is_split_payment: isSplit,
          ...splitData
        },
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_reference", data.reference);

    if (transactionError) {
      console.error("Failed to update transaction:", transactionError);
      throw transactionError;
    }

    // Get booking ID from metadata
    const bookingId = data.metadata?.bookingId;

    if (bookingId) {
      // Update booking payment status
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          payment_status: "deposit_paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (bookingError) {
        console.error("Failed to update booking:", bookingError);
      }

      // Create notification for hirer
      await supabase.from("notifications").insert({
        user_id: data.metadata?.hirerId,
        type: "payment",
        title: "Payment Successful",
        message: `Your deposit payment of ${data.currency} ${data.amount / 100} was successful.`,
        read: false,
        created_at: new Date().toISOString(),
      });

      // Create notification for musician
      await supabase.from("notifications").insert({
        user_id: data.metadata?.musicianId,
        type: "booking",
        title: "New Booking Confirmed",
        message: "A new booking has been confirmed with deposit payment.",
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    console.log("Charge success handled successfully");
  } catch (error) {
    console.error("Error handling charge success:", error);
    throw error;
  }
}

async function handleChargeFailed(supabase: any, data: any) {
  console.log("Handling failed charge:", data.reference);

  try {
    // Update transaction status
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_reference", data.reference);

    // Create notification for user
    if (data.metadata?.hirerId) {
      await supabase.from("notifications").insert({
        user_id: data.metadata.hirerId,
        type: "payment",
        title: "Payment Failed",
        message: `Your payment of ${data.currency} ${data.amount / 100} failed. Please try again.`,
        read: false,
        created_at: new Date().toISOString(),
      });
    }

    console.log("Charge failure handled successfully");
  } catch (error) {
    console.error("Error handling charge failure:", error);
    throw error;
  }
}

async function handleTransferSuccess(supabase: any, data: any) {
  console.log("Handling successful transfer:", data.reference);

  try {
    // Update payout transaction
    await supabase
      .from("transactions")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_reference", data.reference);

    // Update booking payout status
    if (data.metadata?.bookingId) {
      await supabase
        .from("bookings")
        .update({
          payout_status: "released",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.metadata.bookingId);

      // Notify musician
      if (data.metadata?.musicianId) {
        await supabase.from("notifications").insert({
          user_id: data.metadata.musicianId,
          type: "payment",
          title: "Payment Released",
          message: `Your payment of ${data.currency} ${data.amount / 100} has been transferred to your account.`,
          read: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    console.log("Transfer success handled successfully");
  } catch (error) {
    console.error("Error handling transfer success:", error);
    throw error;
  }
}

async function handleTransferFailed(supabase: any, data: any) {
  console.log("Handling failed transfer:", data.reference);

  try {
    // Update transaction status
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("paystack_reference", data.reference);

    // Notify admin and musician
    console.log("Transfer failed, manual intervention required");

    console.log("Transfer failure handled successfully");
  } catch (error) {
    console.error("Error handling transfer failure:", error);
    throw error;
  }
}
