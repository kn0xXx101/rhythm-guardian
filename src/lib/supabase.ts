import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { logger } from '@/utils/console-logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

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
      debug: process.env.NODE_ENV === 'development',
    },
    global: {
      headers: {
        'X-Client-Info': 'rhythm-guardian-web',
      },
    },
  }
);

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

// Debug session state (development only)
if (process.env.NODE_ENV === 'development') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth State Change:', {
      event,
      hasSession: !!session,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      user: session?.user?.email,
      role: session?.user?.app_metadata?.role || session?.user?.user_metadata?.role,
    });
  });
}

