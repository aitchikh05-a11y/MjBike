import { getSupabase } from '@/lib/supabase/client';

export interface ApiErrorPayload {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
}

export class ApiError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, code = 'request_failed', status = 500, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

/**
 * Calls a Cloudflare Pages Function with the current Supabase access token.
 * The Functions verify the JWT server-side and use the service-role key there.
 */
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(path, {
    method: options.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & ApiErrorPayload) : ({} as T & ApiErrorPayload);

  if (!response.ok) {
    const error = payload.error;
    throw new ApiError(
      error?.message ?? 'The server could not complete this request.',
      error?.code ?? 'request_failed',
      response.status,
      error?.fields,
    );
  }
  return payload as T;
}
