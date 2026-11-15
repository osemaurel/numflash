// Briques communes des Edge Functions d'achat : réponses JSON, métadonnées de requête, utilisateur.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function fail(status: number, error: string, message: string, extra: Record<string, unknown> = {}): Response {
  return json({ error, message, ...extra }, status)
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export interface RequestMeta {
  request_id: string
  ip: string | null
  user_agent: string | null
}

export function requestMeta(req: Request): RequestMeta {
  return {
    request_id: crypto.randomUUID(),
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    user_agent: req.headers.get('user-agent'),
  }
}

/** Utilisateur authentifié par son JWT Supabase, ou null. */
export async function authenticatedUserId(admin: SupabaseClient, req: Request): Promise<string | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return null
  const { data, error } = await admin.auth.getUser(jwt)
  return error || !data.user ? null : data.user.id
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
