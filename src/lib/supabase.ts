import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logger } from '@/utils/console-logger';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const supabaseServiceRoleKey = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

// Create client with empty strings as fallback to prevent app from crashing
// The app will still work but Supabase features won't function until env vars are set
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error(
    'Missing Supabase environment variables',
    { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey }
  );
  console.warn(
    '⚠️ Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
  console.warn('   The app will load but database features will not work until configured.');
} else {
  logger.log('Supabase client initialized', { url: supabaseUrl.substring(0, 30) + '...' });
}

// Create client with enhanced session configuration
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
      debug: import.meta.env.DEV,
    },
    global: {
      headers: {
        'X-Client-Info': 'rhythm-guardian-web',
      },
    },
  }
);

/**
 * PostgREST is down, restarting, or rebuilding its schema cache after DB changes.
 * (e.g. HTTP 503 + code PGRST002 — not fixable from app code; check Supabase Dashboard / wait / reload schema.)
 */
export function isSupabaseRestTransientError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'PGRST002') return true;
  const msg = String(e.message ?? '').toLowerCase();
  if (msg.includes('schema cache')) return true;
  if (msg.includes('could not query the database')) return true;
  if (msg.includes('service unavailable')) return true;
  return false;
}

/** HTTP 502/504, statement timeout, or load balancer / PostgREST timeouts (often seen as 504 + empty body). */
export function isGatewayOrTimeoutError(err: unknown): boolean {
  if (err == null) return false;
  const o = err as { code?: string; message?: string; details?: string; status?: number; statusCode?: number };
  const blob = `${String(o.message ?? '')} ${String(o.details ?? '')} ${String(err)}`.toLowerCase();
  if (blob.includes('504') || blob.includes('503') || blob.includes('502')) return true;
  if (blob.includes('gateway') || blob.includes('timeout') || blob.includes('timed out')) return true;
  if (o.code === '57014') return true; // statement_timeout
  const st = o.status ?? o.statusCode;
  if (st === 504 || st === 503 || st === 502) return true;
  return false;
}

/** Primary bookings view failed in a way that may succeed with a narrower query or after retry. */
export function isBookingsViewRecoverableError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const e = err as { code?: string };
  if (e.code === '57014') return true;
  if (isSupabaseRestTransientError(err)) return true;
  if (isGatewayOrTimeoutError(err)) return true;
  return false;
}

// Dev-only: quick connectivity check to surface real errors on localhost.
// This helps distinguish env/config issues from network/CORS/auth problems.
if (import.meta.env.DEV) {
  (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .limit(1);

      if (error) {
        const payload = {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
        };
        if (isSupabaseRestTransientError(error) || isGatewayOrTimeoutError(error)) {
          console.warn(
            '🧪 Supabase API / schema cache / gateway issue (PGRST002, 504, timeout, etc.). Dashboard: check project status, Database logs, then pause/resume or wait for PostgREST to recover.',
            payload
          );
        } else {
          console.error('🧪 Supabase health check failed:', payload);
        }
      } else {
        console.log('🧪 Supabase health check ok:', { rows: data?.length ?? 0 });
      }
    } catch (e) {
      console.error('🧪 Supabase health check crashed:', e);
    }
  })();
}

// Admin client with service role key for elevated permissions
// Note: Service role key bypasses RLS and should only be used server-side
// For client-side admin operations, we use the regular client with admin user session
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase; // Fallback to regular client if service role key not available

// Auth state listener (development only)
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      console.log('🔐 Auth:', event, session?.user?.email);
    }
  });
}

