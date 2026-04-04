// Edge function to create profile when a user signs up
// This should be triggered by a Supabase Auth webhook
// Configure the webhook in Supabase Dashboard: Database > Webhooks > Create Webhook
// Event: auth.users INSERT
// HTTP Request: POST to this function

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseServiceKey) {
      throw new Error("Service role key not configured");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parse the webhook payload
    const payload = await req.json();
    const eventType = payload.type || payload.event?.type;
    const user = payload.record || payload.event?.data?.record || payload.user;

    if (!user) {
      console.error("No user data in payload:", payload);
      return new Response(
        JSON.stringify({ error: "No user data in payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only process user creation events
    if (eventType !== "INSERT" && eventType !== "user.created") {
      return new Response(
        JSON.stringify({ message: "Event type not handled", eventType }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = user.id;
    const email = user.email;

    // Extract metadata
    const appMetadata = user.raw_app_meta_data || user.app_metadata || {};
    const userMetadata = user.raw_user_meta_data || user.user_metadata || {};

    // Determine role and status
    const role = appMetadata.role || userMetadata.role || "hirer";
    const status =
      appMetadata.status ||
      userMetadata.status ||
      (role === "admin" ? "active" : "pending");

    // Get full_name from metadata
    const fullName =
      userMetadata.full_name ||
      userMetadata.name ||
      email?.split("@")[0] ||
      "User";

    // Use upsert to handle race conditions and ensure idempotency
    // This will create the profile if it doesn't exist, or do nothing if it does
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        full_name: fullName,
        role: role,
        status: status,
        email_verified: !!user.email_confirmed_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      // Handle foreign key constraint errors (user might not be fully committed yet)
      if (profileError.code === '23503' || profileError.message?.includes('foreign key')) {
        console.warn(`User ${userId} not yet available for foreign key reference, profile will be created by retry logic`);
        // Return success - the client-side retry logic will handle this
        return new Response(
          JSON.stringify({
            message: "User not yet available, will retry",
            userId,
          }),
          {
            status: 202, // Accepted but not yet processed
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Handle duplicate key errors (profile already exists)
      if (profileError.code === '23505' || profileError.message?.includes('duplicate')) {
        console.log(`Profile already exists for user ${userId}`);
        return new Response(
          JSON.stringify({ message: "Profile already exists", userId }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.error("Error creating profile:", profileError);
      throw profileError;
    }

    console.log(`Profile created successfully for user ${userId}`);

    return new Response(
      JSON.stringify({
        message: "Profile created successfully",
        userId,
        fullName,
        role,
        status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-profile function:", error);
    const errorMessage = error instanceof Error ? error.message : 
                        (typeof error === 'object' && error !== null && 'message' in error) ? 
                        String(error.message) : "Internal server error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

