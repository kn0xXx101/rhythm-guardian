import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface CreateSubaccountRequest {
  business_name: string;
  settlement_bank: string; // The bank code (e.g., "044" for Access Bank)
  account_number: string;
  percentage_charge: number; // The percentage that goes to the platform (e.g., 10 for 10%)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { business_name, settlement_bank, account_number, percentage_charge }: CreateSubaccountRequest = await req.json();

    if (!business_name || !settlement_bank || !account_number || percentage_charge === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Missing Paystack configuration");
    }

    // Call Paystack API to create subaccount
    console.log(`Creating Paystack subaccount for ${business_name}...`);
    const response = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name,
        settlement_bank,
        account_number,
        percentage_charge,
        description: `Musician payouts for ${business_name}`
      }),
    });

    const paystackData = await response.json();

    if (!response.ok || !paystackData.status) {
      console.error("Paystack subaccount creation failed", paystackData);
      return new Response(
        JSON.stringify({ error: paystackData.message || "Failed to create subaccount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subaccountCode = paystackData.data.subaccount_code;

    // Optional: Save the subaccount code to the user's profile
    // Assuming the profiles table has a `paystack_subaccount` column. If it doesn't, this will fail gracefully or we should create it.
    await supabase
      .from("profiles")
      .update({ paystack_subaccount: subaccountCode })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        subaccount_code: subaccountCode,
        message: "Subaccount created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating subaccount:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
