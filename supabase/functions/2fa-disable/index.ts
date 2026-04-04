import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "../types.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { authenticator } from "npm:otplib@12.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const encoder = new TextEncoder();

async function hashString(value: string) {
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => null);
    const code = body?.code as string | undefined;

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const metadata = user.user_metadata as any;
    const secret = metadata?.two_factor_secret as string | undefined;
    const backupHashes = (metadata?.two_factor_backup_codes as string[]) || [];

    let isValid = false;
    let updatedBackupHashes = backupHashes;

    if (secret) {
      isValid = authenticator.verify({ token: code, secret });
    }

    if (!isValid && backupHashes.length > 0) {
      const hash = await hashString(code);
      if (backupHashes.includes(hash)) {
        isValid = true;
        updatedBackupHashes = backupHashes.filter((value) => value !== hash);
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const updateResult = await supabaseClient.auth.updateUser({
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_temp_secret: null,
        two_factor_backup_codes: updatedBackupHashes.length ? updatedBackupHashes : [],
      },
    });

    if (updateResult.error) {
      return new Response(
        JSON.stringify({ error: updateResult.error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
