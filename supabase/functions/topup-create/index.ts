// topup-create : crée une recharge pending et une session de paiement SasPay.
// Appelée depuis le navigateur avec le JWT de l'utilisateur (verify_jwt = true).
// N'écrit jamais dans wallet_transactions : seul le webhook vérifié crédite.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'zod'
import { corsHeaders } from '../_shared/cors.ts'
import { xofToDecimalString } from '../_shared/money.ts'
import { createSaspayClient } from '../_shared/saspay-client.ts'
import { resolveAppOrigin, sanitizeCheckoutUrl } from '../_shared/urls.ts'

const Body = z
  .object({
    amount_xof: z.number().int().positive().max(10_000_000),
    idempotency_key: z.string().uuid(),
  })
  .strict()

// Une même clé reçue pendant que le premier appel est en cours : on ne recrée pas de session.
const IN_PROGRESS_WINDOW_MS = 60_000
// SasPay limite le compte entier à 300 req/min : un utilisateur ne doit pas pouvoir le saturer.
const RATE_LIMIT_WINDOW_MS = 15 * 60_000
const RATE_LIMIT_MAX = 5
const SESSION_TTL_MS = 30 * 60_000

const TOPUP_COLUMNS = 'id, user_id, amount_xof, status, saspay_session_id, saspay_checkout_url, created_at'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, error: string, message: string) {
  return json({ error, message }, status)
}

function describe(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.')

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const meta = {
    request_id: crypto.randomUUID(),
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: req.headers.get('user-agent'),
  }
  let actor = 'anonymous'
  const audit = async (action: string, target: string | null, payload: Record<string, unknown> = {}) => {
    const { error } = await admin.from('audit_log').insert({ actor, action, target, payload: { ...meta, ...payload } })
    if (error) console.error('audit_log insert failed', action, error.message)
  }

  try {
    // 1. Validation des entrées avant tout accès base ou appel externe.
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      await audit('topup_create_invalid', null, { issues: parsed.error.issues.slice(0, 5) })
      return fail(400, 'invalid_request', 'Requête invalide.')
    }
    const { amount_xof, idempotency_key } = parsed.data

    // 2. Authentification.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    const user = userData?.user
    if (userErr || !user) {
      return fail(401, 'unauthorized', 'Votre session a expiré. Veuillez vous reconnecter.')
    }
    actor = `user:${user.id}`

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, phone, is_blocked')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile || profile.is_blocked) {
      await audit('topup_create_refused', null, { reason: profile ? 'blocked' : 'no_profile' })
      return fail(403, 'forbidden', 'Votre compte ne permet pas cette opération. Contactez le support.')
    }

    // 3. Le montant doit être un palier configuré.
    const { data: tiersRow } = await admin.from('settings').select('value').eq('key', 'topup_tiers').maybeSingle()
    const tiers = Array.isArray(tiersRow?.value) ? (tiersRow.value as unknown[]).filter(Number.isInteger) : []
    if (!tiers.includes(amount_xof)) {
      await audit('topup_create_invalid_tier', null, { amount_xof })
      return fail(400, 'invalid_amount', "Ce montant de recharge n'est pas disponible.")
    }

    // 4. Rejeu d'une même demande : on renvoie la session déjà créée.
    const { data: existing } = await admin
      .from('topups')
      .select(TOPUP_COLUMNS)
      .eq('idempotency_key', idempotency_key)
      .maybeSingle()

    if (existing) {
      if (existing.user_id !== user.id || existing.amount_xof !== amount_xof) {
        await audit('topup_create_idempotency_conflict', `topup:${existing.id}`, { amount_xof })
        return fail(409, 'idempotency_conflict', 'Cette demande a déjà été utilisée. Veuillez recommencer.')
      }
      if (existing.saspay_session_id) {
        return json({ topup_id: existing.id, checkout_url: existing.saspay_checkout_url ?? '', replayed: true }, 200)
      }
      if (existing.status !== 'pending') {
        return fail(409, 'topup_closed', "Cette recharge n'a pas pu être lancée. Veuillez recommencer.")
      }
      if (Date.now() - new Date(existing.created_at).getTime() < IN_PROGRESS_WINDOW_MS) {
        return fail(409, 'in_progress', 'Votre demande est en cours de traitement.')
      }
    } else {
      const { count } = await admin
        .from('topups')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        await audit('topup_create_rate_limited', null, { recent_count: count })
        return fail(429, 'rate_limited', 'Trop de tentatives de recharge. Réessayez dans quelques minutes.')
      }
    }

    const secretKey = Deno.env.get('SASPAY_SECRET_KEY')
    if (!secretKey) {
      await audit('topup_create_unconfigured', null)
      return fail(503, 'payment_unavailable', 'Le paiement est momentanément indisponible. Réessayez plus tard.')
    }

    // 5. Ligne pending (la contrainte unique sur idempotency_key arbitre les courses).
    let topup = existing
    if (!topup) {
      const { data: inserted, error: insErr } = await admin
        .from('topups')
        .insert({ user_id: user.id, amount_xof, idempotency_key, status: 'pending' })
        .select(TOPUP_COLUMNS)
        .single()
      if (insErr) {
        if (insErr.code === '23505') return fail(409, 'in_progress', 'Votre demande est en cours de traitement.')
        throw new Error(`insert topup: ${insErr.message}`)
      }
      topup = inserted
    }
    const target = `topup:${topup.id}`
    const markFailed = () =>
      admin
        .from('topups')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', topup!.id)
        .eq('status', 'pending')

    // 6. Session SasPay. L'en-tête Idempotency-Key est ignoré par SasPay sur cet endpoint ;
    //    la vraie garde contre les doublons est la clé unique en base ci-dessus.
    const origin = resolveAppOrigin(req.headers.get('origin'), Deno.env.get('PUBLIC_APP_URL'))
    let session
    try {
      session = await createSaspayClient({ secretKey }).createCheckoutSession(
        {
          amount: xofToDecimalString(amount_xof),
          currency: 'XOF',
          customer_email: user.email ?? '',
          customer_name: profile.full_name || user.email || 'Client Numflash',
          ...(profile.phone ? { customer_phone: profile.phone } : {}),
          description: `Recharge Numflash de ${amount_xof} FCFA`,
          return_url: `${origin}/wallet/recharge/${topup.id}`,
          metadata: { topup_id: topup.id, user_id: user.id },
          fee_charge_mode: 'ADD_ON',
          expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        },
        idempotency_key,
      )
    } catch (err) {
      await markFailed()
      await audit('topup_create_saspay_error', target, { error: describe(err) })
      return fail(502, 'payment_provider_error', 'Le service de paiement ne répond pas. Réessayez dans quelques instants.')
    }

    const checkoutUrl = sanitizeCheckoutUrl(session.checkout_url)
    if (session.id == null || checkoutUrl === null) {
      await markFailed()
      await audit('topup_create_bad_session', target, {
        saspay_session_id: session.id ?? null,
        checkout_url: typeof session.checkout_url === 'string' ? session.checkout_url : null,
      })
      return fail(502, 'payment_provider_error', 'Le service de paiement ne répond pas. Réessayez dans quelques instants.')
    }

    // 7. Sans session stockée, un paiement ne pourrait pas être rattaché : on refuse plutôt
    //    que de laisser le client payer une session orpheline (elle expire en 30 min).
    const { error: updErr } = await admin
      .from('topups')
      .update({
        saspay_session_id: String(session.id),
        saspay_checkout_url: checkoutUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', topup.id)
    if (updErr) {
      await markFailed()
      await audit('topup_create_store_failed', target, { saspay_session_id: String(session.id), error: updErr.message })
      return fail(500, 'internal_error', 'Une erreur est survenue. Réessayez.')
    }

    await audit('topup_created', target, {
      amount_xof,
      saspay_session_id: String(session.id),
      push_flow: checkoutUrl === '',
      return_origin: origin,
    })
    return json({ topup_id: topup.id, checkout_url: checkoutUrl }, 200)
  } catch (err) {
    await audit('topup_create_error', null, { error: describe(err) })
    return fail(500, 'internal_error', 'Une erreur est survenue. Réessayez.')
  }
})
