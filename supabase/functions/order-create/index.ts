// order-create : achat d'un numéro avec le solde Numflash.
// Appelée depuis le navigateur avec le JWT de l'utilisateur (verify_jwt = true).
//
// 1. Validation zod, authentification.
// 2. order_reserve : commande insérée et prix débité en une transaction, AVANT tout appel 5sim.
// 3. Achat chez 5sim (opérateurs candidats du moins cher au plus cher, à prix client identique).
// 4. order_assign_number, ou order_fail_unassigned (remboursement) si aucun numéro n'a été obtenu.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'zod'
import { corsHeaders } from '../_shared/cors.ts'
import { createFivesimClient, FivesimError } from '../_shared/fivesim-client.ts'
import { authenticatedUserId, describeError, fail, json, requestMeta, serviceClient } from '../_shared/http.ts'
import { parseFivesimOrder, type ProviderOrder } from '../_shared/order-core.ts'
import { orderErrorResponse } from '../_shared/order-errors.ts'

const Slug = z.string().regex(/^[a-z0-9_-]{1,64}$/)
const Body = z
  .object({
    service: Slug,
    country: Slug,
    expected_price_xof: z.number().int().positive().max(10_000_000),
    idempotency_key: z.string().uuid(),
  })
  .strict()

const Candidates = z.array(z.object({ operator: Slug, cost_usd: z.union([z.number(), z.string()]) })).max(5)

const REFUNDED = 'Le montant a été recrédité sur votre solde.'

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
    // 1. Entrées validées avant tout accès base ou appel externe.
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      await audit('order_create_invalid', null, { issues: parsed.error.issues.slice(0, 5) })
      return fail(400, 'invalid_request', 'Requête invalide.')
    }
    const { service, country, expected_price_xof, idempotency_key } = parsed.data

    const userId = await authenticatedUserId(admin, req)
    if (!userId) return fail(401, 'unauthorized', 'Votre session a expiré. Veuillez vous reconnecter.')
    actor = `user:${userId}`

    const token = Deno.env.get('FIVESIM_API_KEY')
    if (!token) {
      await audit('order_create_unconfigured', null)
      return fail(503, 'provider_unavailable', 'Le service est momentanément indisponible. Réessayez dans quelques minutes.')
    }

    // 2. Réservation et débit atomiques (garde-fous de orders compris).
    const { data: reserved, error: reserveErr } = await admin.rpc('order_reserve', {
      p_user_id: userId,
      p_service: service,
      p_country: country,
      p_expected_price_xof: expected_price_xof,
      p_idempotency_key: idempotency_key,
      p_meta: meta,
    })
    if (reserveErr) {
      const mapped = orderErrorResponse(reserveErr)
      await audit(mapped.unexpected ? 'order_create_error' : 'order_create_refused', null, {
        service,
        country,
        code: reserveErr.message,
        details: reserveErr.details ?? null,
      })
      return json(mapped.body, mapped.status)
    }

    const orderId = String(reserved.order_id)
    const target = `order:${orderId}`

    // Retry réseau d'une demande déjà traitée : aucun nouvel achat.
    if (reserved.replayed) {
      if (reserved.fivesim_order_id != null) return json({ order_id: orderId, replayed: true }, 200)
      if (reserved.status === 'pending') return fail(409, 'in_progress', 'Votre achat est en cours de traitement.')
      return fail(409, 'purchase_failed', `L’achat n’a pas abouti. ${REFUNDED}`)
    }

    const candidates = Candidates.parse(reserved.candidates ?? [])
    const client = createFivesimClient({ token, timeoutMs: 20_000 })

    // 3. Achat chez 5sim.
    const attempts: Record<string, unknown>[] = []
    let remote: ProviderOrder | null = null
    let lastError: FivesimError | null = null
    let ambiguous = false

    for (const c of candidates) {
      try {
        remote = parseFivesimOrder(await client.buyActivation({ country, operator: c.operator, product: service }))
        attempts.push({ operator: c.operator, ok: true })
        break
      } catch (err) {
        if (err instanceof FivesimError) {
          lastError = err
          attempts.push({ operator: c.operator, kind: err.kind, raw: err.raw.slice(0, 200), http_status: err.httpStatus })
          if (err.kind === 'no_numbers' || err.kind === 'bad_operator') continue
          break
        }
        // Délai dépassé ou réponse illisible : 5sim a peut-être créé la commande. Le rapprochement
        // nocturne la signalera ; on ne retente pas pour ne jamais acheter deux numéros.
        ambiguous = true
        attempts.push({ operator: c.operator, error: describeError(err).slice(0, 200) })
        break
      }
    }

    if (!remote) {
      const reason = ambiguous ? 'provider_no_answer' : lastError?.kind ?? 'no_candidates'
      const { error: failErr } = await admin.rpc('order_fail_unassigned', {
        p_order_id: orderId,
        p_reason: reason,
        p_actor: actor,
        p_payload: { ...meta, attempts },
      })
      if (failErr) {
        // La réservation sera remboursée par orders-sync (réservation bloquée).
        await audit('order_refund_deferred', target, { error: failErr.message, attempts })
      }
      if (lastError?.kind === 'account') await audit('fivesim_account_issue', target, { attempts })
      const message = ambiguous
        ? `Le fournisseur n’a pas répondu à temps. ${REFUNDED} Réessayez dans quelques instants.`
        : `${lastError?.userMessage ?? "Aucun numéro n'est disponible pour ce service dans ce pays. Essayez un autre pays."} ${REFUNDED}`
      return fail(ambiguous ? 504 : 409, 'purchase_failed', message, { refunded: !failErr })
    }

    // 4. Numéro obtenu : on l'attache à la commande.
    const { error: assignErr } = await admin.rpc('order_assign_number', {
      p_order_id: orderId,
      p_fivesim_order_id: remote.id,
      p_phone: remote.phone,
      p_operator: remote.operator,
      p_cost_usd: remote.costUsd,
      p_expires_at: remote.expiresAt,
      p_provider_status: remote.status,
      p_actor: actor,
      p_payload: { ...meta, attempts },
    })
    if (assignErr) {
      // On ne garde pas un numéro qu'on ne peut pas rattacher : annulation chez 5sim, remboursement.
      let canceled = false
      try {
        await client.cancelOrder(remote.id)
        canceled = true
      } catch (err) {
        canceled = false
        await audit('order_assign_cancel_failed', target, { fivesim_order_id: remote.id, error: describeError(err) })
      }
      const { error: failErr } = await admin.rpc('order_fail_unassigned', {
        p_order_id: orderId,
        p_reason: 'assign_failed',
        p_actor: actor,
        p_payload: { ...meta, fivesim_order_id: remote.id, provider_canceled: canceled, error: assignErr.message },
      })
      await audit('order_assign_failed', target, {
        fivesim_order_id: remote.id,
        provider_canceled: canceled,
        error: assignErr.message,
        refund_error: failErr?.message ?? null,
      })
      return fail(500, 'purchase_failed', `L’achat n’a pas abouti. ${REFUNDED}`, { refunded: !failErr })
    }

    // Lance la surveillance des SMS sans attendre la prochaine minute (sans bloquer la réponse).
    EdgeRuntime.waitUntil(kickSync(admin))

    return json({ order_id: orderId, phone: remote.phone, expires_at: remote.expiresAt, price_xof: reserved.price_xof }, 200)
  } catch (err) {
    await audit('order_create_error', null, { error: describeError(err) })
    return fail(500, 'internal_error', 'Une erreur est survenue. Réessayez.')
  }
})

async function kickSync(admin: ReturnType<typeof serviceClient>) {
  try {
    const { data } = await admin.from('cron_tokens').select('token').eq('name', 'orders-sync').maybeSingle()
    if (!data?.token) return
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/orders-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-token': data.token },
      body: JSON.stringify({ trigger: 'purchase' }),
      signal: AbortSignal.timeout(5_000),
    })
  } catch {
    // La tâche planifiée prend le relais à la minute suivante.
  }
}
