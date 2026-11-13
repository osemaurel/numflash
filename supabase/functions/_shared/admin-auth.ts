// Vérifie qu'une requête vient d'un administrateur non bloqué (JWT Supabase de l'utilisateur).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function getAdminUserId(admin: SupabaseClient, req: Request): Promise<string | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return null
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) return null
  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_blocked')
    .eq('id', data.user.id)
    .maybeSingle()
  return profile?.role === 'admin' && !profile.is_blocked ? data.user.id : null
}
