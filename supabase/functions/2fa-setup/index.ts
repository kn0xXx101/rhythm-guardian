import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "../types.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { authenticator } from "npm:otplib@12.0.1";
import QRCode from "npm:qrcode@1.5.3";

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

function generateBackupCodes(count: number) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) {
      const index = Math.floor(Math.random() * characters.length);
      code += characters[index];
    }
    codes.push(code);
  }
  return codes;
}

function maskSecret(secret: string) {
  const groups = secret.match(/.{1,4}/g) || [secret];
  return groups.join(" ");
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

    const secret = authenticator.generateSecret();
    const issuer = "Rhythm Guardian";
    const accountName = user.email || user.id;
    const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
    const qrCodeSvg = await QRCode.toString(otpauthUrl, { type: "svg" });
    const secretMasked = maskSecret(secret);

    const backupCodes = generateBackupCodes(10);
    const backupCodeHashes: string[] = [];
    for (const code of backupCodes) {
      backupCodeHashes.push(await hashString(code));
    }

    const updateResult = await supabaseClient.auth.updateUser({
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_temp_secret: secret,
        two_factor_backup_codes: backupCodeHashes,
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
      JSON.stringify({
        otpauthUrl,
        qrCodeSvg,
        secretMasked,
        backupCodes,
      }),
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
