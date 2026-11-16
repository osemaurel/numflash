// topup-confirm-otp : code de confirmation reçu par SMS APRÈS la demande de paiement
// (réseaux comme Wizall Sénégal). Appelée avec le JWT de l'utilisateur (verify_jwt = true).
// Ne crédite rien : le solde n'est crédité que par le webhook SasPay vérifié.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'zod'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticatedUserId, describeError, fail, json, requestMeta, serviceClient } from '../_shared/http.ts'
import { createSaspayClient, SaspayError } from '../_shared/saspay-client.ts'
import { describeSaspayError } from '../_shared/saspay-errors.ts'

const Body = z
  .object({
    topup_id: z.string().uuid(),
    otp: z.string().regex(/^[0-9A-Za-z]{3,12}$/),
  })
  .strict()

const MAX_ATTEMPTS = 5

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.')

  const admin = serviceClient()
  const meta = requestMeta(req)
  let actor = 'anonymous'
  const audit = async (action: string, target: string | null, payload: Record<string, unknown> = {}) => {
    const { error } = await admin.from('audit_log').insert({ actor, action, target, payload: { ...meta, ...payload } })
    if (error) console.error('audit_log insert failed', action, error.message)
  }

  try {
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return fail(400, 'invalid_request', 'Saisissez le code reçu par SMS.')
    const { topup_id, otp } = parsed.data

    const userId = await authenticatedUserId(admin, req)
    if (!userId) return fail(401, 'unauthorized', 'Votre session a expiré. Veuillez vous reconnecter.')
    actor = `user:${userId}`
    const target = `topup:${topup_id}`

    const { data: topup } = await admin
      .from('topups')
      .select('id, user_id, status, channel, saspay_payment_id')
      .eq('id', topup_id)
      .maybeSingle()
    if (!topup || topup.user_id !== userId) return fail(404, 'not_found', 'Paiement introuvable.')
    if (topup.status !== 'pending') return fail(409, 'not_pending', 'Ce paiement est déjà traité.')
    if (topup.channel !== 'direct' || !topup.saspay_payment_id) {
      return fail(409, 'not_applicable', 'Ce paiement ne demande pas de code.')
    }

    // Plafond de tentatives par paiement (le code n'est jamais journalisé).
    const { count } = await admin
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('target', target)
      .eq('action', 'topup_confirm_otp_attempt')
    if ((count ?? 0) >= MAX_ATTEMPTS) {
      return fail(429, 'too_many_attempts', 'Trop de tentatives. Recommencez une nouvelle recharge.')
    }
    await audit('topup_confirm_otp_attempt', target, { attempt: (count ?? 0) + 1 })

    const secretKey = Deno.env.get('SASPAY_SECRET_KEY')
    if (!secretKey) return fail(503, 'payment_unavailable', 'Le paiement est momentanément indisponible. Réessayez plus tard.')

    try {
      const res = await createSaspayClient({ secretKey }).confirmOtp(topup.saspay_payment_id, otp)
      await audit('topup_confirm_otp_accepted', target, { status: res?.status ?? null })
      return json({ topup_id, status: String(res?.status ?? 'PENDING').toUpperCase() }, 200)
    } catch (err) {
      if (err instanceof SaspayError) {
        const info = describeSaspayError(err.code, err.httpStatus)
        await audit('topup_confirm_otp_refused', target, { http_status: err.httpStatus, code: err.code })
        return fail(err.httpStatus >= 500 ? 502 : 422, err.code ?? 'otp_refused', info.message)
      }
      await audit('topup_confirm_otp_error', target, { error: describeError(err).slice(0, 300) })
      return fail(504, 'provider_timeout', 'Le service de paiement tarde à répondre. Réessayez dans quelques instants.')
    }
  } catch (err) {
    await audit('topup_confirm_otp_failed', null, { error: describeError(err).slice(0, 300) })
    return fail(500, 'internal_error', 'Une erreur est survenue. Réessayez.')
  }
})
