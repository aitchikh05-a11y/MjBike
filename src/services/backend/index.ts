import { isSupabaseConfigured } from '@/lib/supabase/client';
import { demoBackend } from './demoBackend';
import { supabaseBackend } from './supabaseBackend';
import type { Backend } from './types';

/**
 * Single entry point for data access.
 *
 * Production: Supabase (Postgres + RLS + Auth) with Cloudflare Functions for
 * privileged writes and notifications.
 * Local preview: a clearly-labelled in-browser demo store so the whole flow —
 * booking, availability, admin workflow — can be reviewed without credentials.
 */
export const backend: Backend = isSupabaseConfigured ? supabaseBackend : demoBackend;

export const isDemoMode = backend.mode === 'demo';

export * from './types';
export { BackendError, DEMO_ACCOUNTS, DEMO_PASSWORD, resetDemoData } from './demoBackend';
