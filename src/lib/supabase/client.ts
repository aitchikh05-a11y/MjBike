import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** True when the browser has a Supabase project configured (public anon key only). */
export const isSupabaseConfigured = Boolean(url && anonKey);

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client. It only ever uses the public anon key — every request
 * is subject to Row Level Security, and privileged operations go through the
 * Cloudflare Functions in /functions/api (service role key stays server-side).
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!browserClient) {
    browserClient = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'mjb.auth',
      },
      global: { headers: { 'x-application-name': 'mj-bike-tangier' } },
    });
  }
  return browserClient;
}

export const SUPABASE_URL = url ?? '';
export const SUPABASE_ANON_KEY = anonKey ?? '';
