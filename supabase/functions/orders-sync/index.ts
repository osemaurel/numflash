// orders-sync : surveillance des commandes en cours auprès de 5sim (SMS reçus, fin, remboursements).
// Lancée chaque minute par pg_cron (seulement s'il existe une commande en cours) et juste après
// un achat. Authentification par jeton (x-cron-token), jamais exposé hors de la base.
//
// La réponse part tout de suite ; la boucle tourne en arrière-plan ~50 s, une vérification toutes
// les 5 s, et s'arrête dès qu'il n'y a plus rien à suivre. Un bail en base empêche deux boucles
// simultanées. Le navigateur est prévenu par Supabase Realtime : aucun polling côté client.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'zod'
import { createFivesimClient, FivesimError, type FivesimClient } from '../_shared/fivesim-client.ts'
import { describeError, fail, json, serviceClient, sleep } from '../_shared/http.ts'
import {
  isNoop,
  isStuckReservation,
  needsAutoFinish,
  parseFivesimOrder,
  type LocalOrderState,
  type ProviderOrder,
} from '../_shared/order-core.ts'
import { timingSafeEqual } from '../_shared/tokens.ts'

const Body = z.object({ trigger: z.enum(['cron', 'purchase']).optional() }).strict()

const ACTOR = 'edge:orders-sync'
const LEASE = 'orders-sync'
const LEASE_SECONDS = 75
const RUN_MS = 50_000
const TICK_MS = 5_000
const STUCK_AFTER_MS = 3 * 60_000
const AUTO_FINISH_GRACE_MS = 5 * 60_000
const CONCURRENCY = 4
const MAX_ORDERS = 200

type Admin = ReturnType<typeof serviceClient>

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.')

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail(400, 'invalid_request', 'Requête invalide.')

  const admin = serviceClient()
  const presented = req.headers.get('x-cron-token') ?? ''
  const { data: tokenRow } = await admin.from('cron_tokens').select('token').eq('name', 'orders-sync').maybeSingle()
  if (!presented || !tokenRow?.token || !timingSafeEqual(tokenRow.token, presented)) {
    return fail(403, 'forbidden', 'Accès refusé.')
  }

  const token = Deno.env.get('FIVESIM_API_KEY')
  if (!token) return json({ started: false, reason: 'fivesim_not_configured' }, 503)

  const holder = crypto.randomUUID()
  const { data: acquired, error: leaseErr } = await admin.rpc('lease_acquire', {
    p_name: LEASE,
    p_holder: holder,
    p_seconds: LEASE_SECONDS,
  })
  if (leaseErr) return json({ started: false, reason: 'lease_error' }, 500)
  if (!acquired) return json({ started: false, reason: 'already_running' }, 200)

  EdgeRuntime.waitUntil(run(admin, createFivesimClient({ token, timeoutMs: 10_000 }), holder, parsed.data.trigger ?? 'cron'))
  return json({ started: true }, 202)
})

async function run(admin: Admin, client: FivesimClient, holder: string, trigger: string) {
  const started = Date.now()
  const errors: Record<string, unknown>[] = []
  let ticks = 0
  try {
    while (Date.now() - started < RUN_MS) {
      const tickStart = Date.now()
      ticks++
      const active = await loadActive(admin)
      if (active.length === 0) break

      const now = Date.now()
      for (const o of active.filter((x) => isStuckReservation(x, now, STUCK_AFTER_MS))) {
        const { error } = await admin.rpc('order_fail_unassigned', {
          p_order_id: o.id,
          p_reason: 'reservation_stuck',
          p_actor: ACTOR,
          p_payload: { trigger },
        })
        if (error) errors.push({ order_id: o.id, step: 'fail_unassigned', error: error.message })
      }

      const assigned = active.filter((x) => x.fivesim_order_id != null)
      for (let i = 0; i < assigned.length; i += CONCURRENCY) {
        await Promise.all(assigned.slice(i, i + CONCURRENCY).map((o) => syncOne(admin, client, o, errors)))
      }

      await admin.rpc('lease_acquire', { p_name: LEASE, p_holder: holder, p_seconds: LEASE_SECONDS })
      const wait = TICK_MS - (Date.now() - tickStart)
      if (wait > 0) await sleep(wait)
    }
  } catch (err) {
    errors.push({ step: 'loop', error: describeError(err) })
  } finally {
    await admin.rpc('lease_release', { p_name: LEASE, p_holder: holder })
    // Les changements d'état sont journalisés par les RPC ; ici, seulement les anomalies.
    if (errors.length > 0) {
      await admin.from('audit_log').insert({
        actor: ACTOR,
        action: 'orders_sync_errors',
        target: 'orders',
        payload: { trigger, ticks, errors: errors.slice(0, 50), error_count: errors.length },
      })
    }
  }
}

async function loadActive(admin: Admin): Promise<LocalOrderState[]> {
  const { data, error } = await admin
    .from('orders')
    .select('id, fivesim_order_id, status, provider_status, created_at, expires_at, order_sms(count)')
    .in('status', ['pending', 'received'])
    .order('created_at', { ascending: true })
    .limit(MAX_ORDERS)
  if (error) throw new Error(`orders: ${error.message}`)
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown> & { order_sms?: { count: number }[] }
    return {
      id: String(r.id),
      fivesim_order_id: r.fivesim_order_id == null ? null : Number(r.fivesim_order_id),
      status: r.status as LocalOrderState['status'],
      provider_status: (r.provider_status as string | null) ?? null,
      created_at: String(r.created_at),
      expires_at: (r.expires_at as string | null) ?? null,
      sms_count: r.order_sms?.[0]?.count ?? 0,
    }
  })
}

async function apply(admin: Admin, o: LocalOrderState, remote: ProviderOrder, payload: Record<string, unknown> = {}) {
  const { error } = await admin.rpc('order_apply_provider_state', {
    p_order_id: o.id,
    p_provider_status: remote.status,
    p_sms: remote.sms,
    p_canceled_by: 'system',
    p_actor: ACTOR,
    p_payload: { fivesim_order_id: remote.id, ...payload },
  })
  if (error) throw new Error(`apply: ${error.message}`)
}

async function syncOne(admin: Admin, client: FivesimClient, o: LocalOrderState, errors: Record<string, unknown>[]) {
  const id = o.fivesim_order_id!
  try {
    let remote = parseFivesimOrder(await client.checkOrder(id))
    if (!isNoop(o, remote)) await apply(admin, o, remote)

    // Code reçu, délai dépassé et 5sim n'a pas clos la commande : on la termine.
    if (remote.status !== 'FINISHED' && needsAutoFinish(o, Date.now(), AUTO_FINISH_GRACE_MS)) {
      try {
        remote = parseFivesimOrder(await client.finishOrder(id))
        await apply(admin, o, remote, { auto_finish: true })
      } catch (err) {
        if (err instanceof FivesimError && (err.kind === 'expired' || err.kind === 'not_found')) {
          await apply(admin, o, { ...remote, status: 'FINISHED', sms: [] }, { auto_finish: true, local_only: true })
        } else {
          throw err
        }
      }
    }
  } catch (err) {
    errors.push({
      order_id: o.id,
      fivesim_order_id: id,
      error: err instanceof FivesimError ? `${err.kind}: ${err.raw.slice(0, 120)}` : describeError(err).slice(0, 200),
    })
  }
}
