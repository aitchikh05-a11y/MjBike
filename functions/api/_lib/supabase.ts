/// <reference types="@cloudflare/workers-types" />
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ADMIN_EMAIL?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  SITE_URL?: string;
}

export type AppEnv = { Bindings: Env; Variables: { user: User | null; profile: AdminProfile | null } };

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Service-role client: bypasses RLS. Never expose this to the browser. */
export function adminClient(env: Env): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(500, 'not_configured', 'Supabase service credentials are missing on the server.');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'staff';
  is_active: boolean;
}

/** Verify the caller's Supabase JWT and load their profile row. */
export async function requireProfile(env: Env, authorization: string | null): Promise<{ user: User; profile: AdminProfile }> {
  const token = authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new ApiError(401, 'unauthorized', 'Sign in to continue.');

  const client = adminClient(env);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, 'unauthorized', 'Your session has expired. Please sign in again.');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', data.user.id)
    .maybeSingle<AdminProfile>();

  if (profileError) throw new ApiError(500, 'profile_lookup_failed', profileError.message);
  if (!profile || !profile.is_active) throw new ApiError(403, 'forbidden', 'This administrator account is not active.');

  return { user: data.user, profile };
}

export async function requireRole(
  env: Env,
  authorization: string | null,
  roles: AdminProfile['role'][],
): Promise<{ user: User; profile: AdminProfile }> {
  const session = await requireProfile(env, authorization);
  if (!roles.includes(session.profile.role)) {
    throw new ApiError(403, 'forbidden', 'Your role does not allow this action.');
  }
  return session;
}

export async function audit(
  env: Env,
  actor: AdminProfile | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await adminClient(env)
      .from('audit_logs')
      .insert({
        actor_id: actor?.id ?? null,
        actor_email: actor?.email ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details ?? null,
      });
  } catch {
    // Audit failures must never break the operation; they are logged by Cloudflare.
  }
}
