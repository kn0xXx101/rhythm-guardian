import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

/**
 * Automatic Payout Processor
 * 
 * This function runs on a schedule (e.g., every hour) to automatically
 * process payouts for bookings where:
 * - Payment has been received
 * - Both parties have confirmed service completion
 * - Payout has not been released yet
 * 
 * Schedule this function using Supabase Cron:
 * supabase functions schedule auto-process-payouts --cron "0 * * * *"
 * (Runs every hour at minute 0)
 */

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY environment variable not set");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting automatic payout processing...");

    // Get all eligible bookings
    const { data: eligibleBookings, error: fetchError } = await supabase
      .from("bookings_with_profiles")
      .select("*")
      .eq("payment_status", "paid")
      .eq("service_confirmed_by_hirer", true)
      .eq("service_confirmed_by_musician", true)
      .eq("payout_released", false);

    if (fetchError) {
      console.error("Error fetching eligible bookings:", fetchError);
      throw fetchError;
    }

    if (!eligibleBookings || eligibleBookings.length === 0) {
      console.log("No eligible bookings found for payout");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No eligible bookings for payout",
          processed: 0,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${eligibleBookings.length} eligible booking(s) for payout`);

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const booking of eligibleBookings) {
      try {
        console.log(`Processing payout for booking ${booking.id}...`);

        // Get musician's bank details
        const { data: musicianProfile, error: profileError } = await supabase
          .from("profiles")
          .select("bank_account_number, bank_code, bank_account_name, mobile_money_number, mobile_money_provider, full_name")
          .eq("user_id", booking.musician_id)
          .single();

        if (profileError || !musicianProfile) {
          const errorMsg = `Musician profile not found for booking ${booking.id}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          failed++;
          continue;
        }

        // Check if musician has payment details
        const hasBankAccount = musicianProfile.bank_account_number && musicianProfile.bank_code;
        const hasMobileMoney = musicianProfile.mobile_money_number && musicianProfile.mobile_money_provider;

        if (!hasBankAccount && !hasMobileMoney) {
          const errorMsg = `Musician has no payment details configured for booking ${booking.id}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          failed++;
          continue;
        }

        // Calculate payout amount using dynamic platform fee
        const totalAmount = parseFloat(booking.total_amount) || 0;
        
        // Get platform fee percentage from settings (key 'booking' = Admin Settings bookingPayments)
        const { data: bookingSettings } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "booking")
          .single();
        
        const bookingValue = bookingSettings?.value as { platformCommissionRate?: number } | null;
        const platformCommissionRate = bookingValue?.platformCommissionRate ?? 10;
        const platformFee = totalAmount * (platformCommissionRate / 100);
        const paystackFee = totalAmount * 0.015 + 0.50; // 1.5% + GHS 0.50
        const payoutAmount = totalAmount - platformFee - paystackFee;

        // Determine transfer recipient and verify account name
        let recipient: any;
        let transferType: string;
        let accountName: string;

        if (hasBankAccount) {
          transferType = "nuban";
          accountName = musicianProfile.bank_account_name || "";
          
          // SECURITY: Verify account name is provided
          if (!accountName || accountName.trim() === "") {
            const errorMsg = `Bank account name missing for booking ${booking.id}`;
            console.error(errorMsg);
            errors.push(errorMsg);
            failed++;
            continue;
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
            const errorMsg = `Account name mismatch for booking ${booking.id}: "${accountName}" vs "${musicianProfile.full_name}"`;
            console.error(errorMsg);
            errors.push(errorMsg);
            failed++;
            continue;
          }

          recipient = {
            type: "nuban",
            name: accountName,
            account_number: musicianProfile.bank_account_number,
            bank_code: musicianProfile.bank_code,
            currency: "GHS",
          };
        } else {
          transferType = "mobile_money";
          accountName = musicianProfile.full_name;
          
          recipient = {
            type: "mobile_money",
            name: accountName,
            account_number: musicianProfile.mobile_money_number,
            bank_code: musicianProfile.mobile_money_provider,
            currency: "GHS",
          };
        }

        // Create transfer recipient in Paystack
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
          const errorMsg = `Failed to create recipient for booking ${booking.id}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          failed++;
          continue;
        }

        const recipientData = await recipientResponse.json();
        const recipientCode = recipientData.data.recipient_code;

        // Initiate transfer
        const transferReference = `PAYOUT-${booking.id.substring(0, 8)}-${Date.now()}`;
        const transferResponse = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(payoutAmount * 100),
            recipient: recipientCode,
            reason: `Payout for ${booking.event_type} - Booking ${booking.id.substring(0, 8)}`,
            reference: transferReference,
            currency: "GHS",
          }),
        });

        if (!transferResponse.ok) {
          const error = await transferResponse.json();
          const errorMsg = `Failed to initiate transfer for booking ${booking.id}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          failed++;
          continue;
        }

        const transferData = await transferResponse.json();
        console.log(`Transfer initiated for booking ${booking.id}:`, transferData.data.transfer_code);

        // Update booking
        await supabase
          .from("bookings")
          .update({
            payout_released: true,
            payout_released_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        // Create payout transaction
        await supabase.from("transactions").insert({
          booking_id: booking.id,
          user_id: booking.musician_id,
          amount: payoutAmount,
          type: "payout",
          status: "paid",
          payment_method: transferType,
          currency: "GHS",
          platform_fee: 0,
          paystack_reference: transferReference,
          metadata: {
            transfer_code: transferData.data.transfer_code,
            recipient_code: recipientCode,
            auto_processed: true,
          },
        });

        // Send notification
        await supabase.from("notifications").insert({
          user_id: booking.musician_id,
          type: "payment",
          title: "Payment Released",
          content: `Your payment of GHS ${payoutAmount.toFixed(2)} for ${booking.event_type} has been automatically released and is being transferred to your ${transferType === "nuban" ? "bank account" : "mobile money account"}.`,
          action_url: "/musician/bookings",
          read: false,
          metadata: {
            bookingId: booking.id,
            transferReference,
            amount: payoutAmount,
          },
        });

        processed++;
        console.log(`Successfully processed payout for booking ${booking.id}`);
      } catch (error) {
        const errorMsg = `Error processing booking ${booking.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        failed++;
      }
    }

    console.log(`Payout processing complete. Processed: ${processed}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Fatal error in auto-process-payouts:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
