import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable not set");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "Booking ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get booking details with musician info
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings_with_profiles")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate booking is eligible for payout
    if (booking.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not received" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!booking.service_confirmed_by_hirer || !booking.service_confirmed_by_musician) {
      return new Response(
        JSON.stringify({ error: "Service not confirmed by both parties" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (booking.payout_released) {
      return new Response(
        JSON.stringify({ error: "Payout already released" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get musician's bank details
    const { data: musicianProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("bank_account_number, bank_code, bank_account_name, mobile_money_number, mobile_money_provider, full_name")
      .eq("user_id", booking.musician_id)
      .single();

    if (profileError || !musicianProfile) {
      return new Response(
        JSON.stringify({ error: "Musician profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate payout amount after all fees
    const totalAmount = parseFloat(booking.total_amount) || 0;
    
    // Get platform fee percentage from settings (default 10%)
    const { data: settings } = await supabaseClient
      .from("platform_settings")
      .select("value")
      .eq("key", "booking")
      .single();
    
    const platformFeePercentage = (settings?.value as any)?.platformCommissionRate || 10;
    const platformFee = totalAmount * (platformFeePercentage / 100);
    
    // Paystack charges 1.5% + GHS 0.50 for local transactions
    const paystackFeePercentage = 1.5;
    const paystackFixedFee = 0.50;
    const paystackFee = (totalAmount * (paystackFeePercentage / 100)) + paystackFixedFee;
    
    // Total deductions
    const totalFees = platformFee + paystackFee;
    
    // Amount musician receives
    const payoutAmount = totalAmount - totalFees;

    // Determine transfer recipient and verify account name
    let recipient: any;
    let transferType: string;
    let accountName: string;

    if (musicianProfile.bank_account_number && musicianProfile.bank_code) {
      // Bank transfer
      transferType = "nuban";
      accountName = musicianProfile.bank_account_name || "";
      
      // SECURITY: Verify account name is provided
      if (!accountName || accountName.trim() === "") {
        return new Response(
          JSON.stringify({ 
            error: "Bank account name is required",
            message: "Musician must provide the name on their bank account for security verification"
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // SECURITY: Verify account name matches musician name
      const musicianNameLower = (musicianProfile.full_name || "").toLowerCase().trim();
      const accountNameLower = accountName.toLowerCase().trim();
      
      // Remove common prefixes/suffixes for comparison
      const cleanName = (name: string) => name
        .replace(/\b(mr|mrs|ms|dr|prof)\b\.?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      const cleanMusicianName = cleanName(musicianNameLower);
      const cleanAccountName = cleanName(accountNameLower);
      
      // Check if names match (allow for middle names, initials)
      const namesMatch = 
        cleanAccountName.includes(cleanMusicianName) || 
        cleanMusicianName.includes(cleanAccountName) ||
        cleanAccountName === cleanMusicianName;
      
      if (!namesMatch) {
        return new Response(
          JSON.stringify({ 
            error: "Account name verification failed",
            message: `Bank account name "${accountName}" does not match musician name "${musicianProfile.full_name}". Payment cannot proceed for security reasons. Please contact support if this is an error.`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      recipient = {
        type: "nuban",
        name: accountName,
        account_number: musicianProfile.bank_account_number,
        bank_code: musicianProfile.bank_code,
        currency: "GHS",
      };
    } else if (musicianProfile.mobile_money_number && musicianProfile.mobile_money_provider) {
      // Mobile money transfer
      transferType = "mobile_money";
      accountName = musicianProfile.full_name;
      
      // Mobile money uses the profile name
      recipient = {
        type: "mobile_money",
        name: accountName,
        account_number: musicianProfile.mobile_money_number,
        bank_code: musicianProfile.mobile_money_provider,
        currency: "GHS",
      };
    } else {
      return new Response(
        JSON.stringify({ 
          error: "Musician has no payment details configured",
          message: "Please ask the musician to add their bank account or mobile money details in their profile"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create transfer recipient in Paystack (if not exists)
    const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recipient),
    });

    if (!recipientResponse.ok) {
      const error = await recipientResponse.json();
      console.error("Failed to create transfer recipient:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create transfer recipient",
          details: error.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const recipientData = await recipientResponse.json();
    const recipientCode = recipientData.data.recipient_code;

    // Initiate transfer
    const transferReference = `PAYOUT-${bookingId.substring(0, 8)}-${Date.now()}`;
    const transferResponse = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.round(payoutAmount * 100), // Convert to kobo
        recipient: recipientCode,
        reason: `Payout for ${booking.event_type} - Booking ${bookingId.substring(0, 8)}`,
        reference: transferReference,
        currency: "GHS",
      }),
    });

    if (!transferResponse.ok) {
      const error = await transferResponse.json();
      console.error("Failed to initiate transfer:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to initiate transfer",
          details: error.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transferData = await transferResponse.json();

    // Update booking to mark payout as released
    const { error: updateError } = await supabaseClient
      .from("bookings")
      .update({
        payout_released: true,
        payout_released_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      // Continue anyway - transfer was initiated
    }

    // Create payout transaction record
    const { error: txError } = await supabaseClient
      .from("transactions")
      .insert({
        booking_id: bookingId,
        user_id: booking.musician_id,
        amount: payoutAmount,
        type: "payout",
        status: "paid",
        payment_method: transferType,
        currency: "GHS",
        platform_fee: platformFee,
        paystack_reference: transferReference,
        metadata: {
          transfer_code: transferData.data.transfer_code,
          recipient_code: recipientCode,
          total_amount: totalAmount,
          platform_fee: platformFee,
          paystack_fee: paystackFee,
          total_fees: totalFees,
        },
      });

    if (txError) {
      console.error("Failed to create payout transaction:", txError);
      // Continue anyway - transfer was initiated
    }

    // Send notification to musician
    try {
      await supabaseClient.from("notifications").insert({
        user_id: booking.musician_id,
        type: "payment",
        title: "Payment Released",
        content: `Your payment of GHS ${payoutAmount.toFixed(2)} for ${booking.event_type} has been automatically released and is being transferred to your account. Reference: ${transferReference}`,
        action_url: "/musician/bookings",
        read: false,
      });
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payout initiated successfully",
        data: {
          bookingId,
          amount: payoutAmount,
          reference: transferReference,
          transferCode: transferData.data.transfer_code,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing payout:", error);
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
