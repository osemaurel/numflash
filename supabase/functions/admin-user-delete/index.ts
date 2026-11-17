// admin-user-delete : suppression d'un compte client par un administrateur.
// 1. RPC admin_delete_user, appelée avec le JWT de l'administrateur (require_admin, request_meta) :
//    contrôles (solde nul, rien en cours), données personnelles effacées, compte bloqué, journal.
// 2. Compte de connexion désactivé : e-mail remplacé, métadonnées effacées, bannissement.
// L'historique financier (registre append-only) est conservé. Opération rejouable sans risque.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'zod'
import { getAdminUserId } from '../_shared/admin-auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { describeError, fail, json, requestMeta, serviceClient } from '../_shared/http.ts'

const Body = z
  .object({
    user_id: z.string().uuid(),
    reason: z.string().trim().min(5).max(500),
    confirm: z.literal('SUPPRIMER'),
  })
  .strict()

const REFUSALS: Record<string, { status: number; message: string }> = {
  NF_BALANCE_NOT_ZERO: { status: 409, message: 'Le solde doit être à 0 FCFA : ajustez-le d’abord, puis recommencez.' },
  NF_ACTIVE_ORDERS: { status: 409, message: 'Des numéros sont encore en cours pour ce compte : attendez leur fin ou annulez-les.' },
  NF_PENDING_TOPUPS: { status: 409, message: 'Une recharge est encore en attente pour ce compte : attendez sa confirmation ou son échec.' },
  NF_CANNOT_DELETE_ADMIN: { status: 409, message: 'Un compte administrateur ne peut pas être supprimé.' },
  NF_CANNOT_TARGET_SELF: { status: 409, message: 'Vous ne pouvez pas supprimer votre propre compte.' },
  NF_REASON_REQUIRED: { status: 400, message: 'Indiquez un motif d’au moins 5 caractères.' },
  NF_NOT_FOUND: { status: 404, message: 'Utilisateur introuvable.' },
  NF_FORBIDDEN: { status: 403, message: 'Accès réservé aux administrateurs.' },
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.')

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail(400, 'invalid_request', 'Indiquez un motif et tapez SUPPRIMER pour confirmer.')
  const { user_id, reason } = parsed.data

  const admin = serviceClient()
  const meta = requestMeta(req)
  const adminId = await getAdminUserId(admin, req)
  if (!adminId) return fail(403, 'forbidden', 'Accès réservé aux administrateurs.')
  const actor = `admin:${adminId}`
  const target = `user:${user_id}`
  const audit = async (action: string, payload: Record<string, unknown> = {}) => {
    const { error } = await admin.from('audit_log').insert({ actor, action, target, payload: { ...meta, ...payload } })
    if (error) console.error('audit_log insert failed', action, error.message)
  }

  try {
    // 1. Partie base, avec les droits de l'administrateur qui fait la demande. Les en-têtes
    //    transmis permettent à request_meta() de journaliser la même IP, le même navigateur et
    //    le même request_id que cette fonction.
    const forwarded: Record<string, string> = {
      Authorization: req.headers.get('Authorization') ?? '',
      'x-request-id': meta.request_id,
    }
    if (meta.ip) forwarded['x-forwarded-for'] = meta.ip
    if (meta.user_agent) forwarded['user-agent'] = meta.user_agent
    const asAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: forwarded },
    })
    const { error: rpcErr } = await asAdmin.rpc('admin_delete_user', { p_user_id: user_id, p_reason: reason })
    if (rpcErr) {
      const refusal = REFUSALS[rpcErr.message]
      if (refusal) return fail(refusal.status, rpcErr.message.toLowerCase(), refusal.message)
      await audit('user_delete_failed', { step: 'database', error: rpcErr.message })
      return fail(500, 'internal_error', 'La suppression a échoué. Réessayez.')
    }

    // 2. Connexion désactivée : l'adresse et le nom disparaissent aussi du compte de connexion.
    const { error: authErr } = await admin.auth.admin.updateUserById(user_id, {
      email: `supprime-${user_id}@numflash.invalid`,
      email_confirm: true,
      user_metadata: { full_name: null, phone: null, deleted: true },
      ban_duration: '876000h',
    })
    if (authErr) {
      await audit('user_delete_failed', { step: 'auth', error: authErr.message })
      return fail(502, 'auth_update_failed', 'Les données ont été effacées, mais la connexion n’a pas pu être désactivée. Relancez la suppression.')
    }

    await audit('user_auth_disabled', { reason })
    return json({ user_id, deleted: true }, 200)
  } catch (err) {
    await audit('user_delete_failed', { step: 'unexpected', error: describeError(err).slice(0, 300) })
    return fail(500, 'internal_error', 'La suppression a échoué. Réessayez.')
  }
})
