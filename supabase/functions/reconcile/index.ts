// reconcile : rapprochement nocturne entre GET /user/orders de 5sim et la table orders.
// Appelé par pg_cron (en-tête x-cron-token) ou manuellement par un administrateur (JWT).
// N'écrit rien d'autre qu'un rapport dans audit_log.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'zod'
import { getAdminUserId } from '../_shared/admin-auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createFivesimClient, FivesimError, type FivesimOrder } from '../_shared/fivesim-client.ts'
import { compareDecimal } from '../_shared/money.ts'
import { reconcileOrders, type DbOrderLite } from '../_shared/reconcile-core.ts'
import { timingSafeEqual } from '../_shared/tokens.ts'

const Body = z.object({ trigger: z.enum(['cron', 'manual']).optional() }).strict()

const WINDOW_MS = 72 * 60 * 60 * 1000
const LOAD_MARGIN_MS = 30 * 60 * 1000
const STUCK_AFTER_MS = 15 * 60 * 1000
const MIN_INTERVAL_MS = 2 * 60 * 1000
const PAGE_SIZE = 100
const MAX_PAGES = 30
const DETAIL_CAP = 100
const ACTOR = 'edge:reconcile'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return json({ error: 'invalid_request', message: 'Requête invalide.' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const audit = async (action: string, payload: Record<string, unknown>) => {
    const { error } = await admin.from('audit_log').insert({ actor: ACTOR, action, target: 'orders', payload })
    if (error) console.error('audit_log insert failed', action, error.message)
  }

  // Authentification : jeton cron (jamais exposé hors de la base) ou administrateur.
  let trigger: string | null = null
  const cronToken = req.headers.get('x-cron-token')
  if (cronToken) {
    const { data } = await admin.from('cron_tokens').select('token').eq('name', 'reconcile').maybeSingle()
    if (data?.token && timingSafeEqual(data.token, cronToken)) trigger = 'cron'
  } else {
    const adminId = await getAdminUserId(admin, req)
    if (adminId) trigger = `admin:${adminId}`
  }
  if (!trigger) return json({ error: 'forbidden', message: 'Accès réservé aux administrateurs.' }, 403)

  const { data: last } = await admin
    .from('audit_log')
    .select('created_at')
    .eq('actor', ACTOR)
    .in('action', ['reconcile_report', 'reconcile_failed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (last && Date.now() - new Date(last.created_at as string).getTime() < MIN_INTERVAL_MS) {
    return json({ error: 'rate_limited', message: 'Un rapprochement vient d’être lancé. Réessayez dans deux minutes.' }, 429)
  }

  const token = Deno.env.get('FIVESIM_API_KEY')
  if (!token) {
    await audit('reconcile_skipped', { trigger, reason: 'fivesim_not_configured' })
    return json({ error: 'not_configured', message: 'La clé API 5sim n’est pas configurée.' }, 503)
  }

  const now = new Date()
  const since = new Date(now.getTime() - WINDOW_MS)
  const loadFrom = new Date(since.getTime() - LOAD_MARGIN_MS)

  try {
    const client = createFivesimClient({ token })

    const fivesimOrders: FivesimOrder[] = []
    let truncated = false
    for (let page = 0; ; page++) {
      if (page === MAX_PAGES) {
        truncated = true
        break
      }
      const rows = (await client.listOrders({ category: 'activation', limit: PAGE_SIZE, offset: page * PAGE_SIZE })).Data ?? []
      fivesimOrders.push(...rows)
      const oldest = rows[rows.length - 1]
      if (rows.length < PAGE_SIZE || (oldest && new Date(oldest.created_at) < loadFrom)) break
    }

    const dbOrders: DbOrderLite[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin
        .from('orders')
        .select('id, fivesim_order_id, status, created_at')
        .gte('created_at', loadFrom.toISOString())
        .order('created_at', { ascending: true })
        .range(from, from + 999)
      if (error) throw new Error(`orders: ${error.message}`)
      dbOrders.push(...((data ?? []) as DbOrderLite[]))
      if (!data || data.length < 1000) break
    }

    const result = reconcileOrders(fivesimOrders, dbOrders, { since, now, stuckAfterMs: STUCK_AFTER_MS })

    const { data: setting } = await admin
      .from('settings')
      .select('value')
      .eq('key', 'fivesim_low_balance_threshold')
      .maybeSingle()
    const threshold = Number(setting?.value ?? 10)
    let balance: number | null = null
    try {
      balance = Number((await client.getProfile()).balance)
    } catch {
      balance = null
    }
    const lowBalance = balance !== null && compareDecimal(balance, threshold) < 0
    if (lowBalance) await audit('fivesim_low_balance', { trigger, balance, threshold })

    const summary = {
      fivesim_orders: fivesimOrders.length,
      db_orders: dbOrders.length,
      matched: result.matched,
      only_in_fivesim: result.onlyInFivesim.length,
      only_in_db: result.onlyInDb.length,
      status_mismatches: result.statusMismatches.length,
      stuck_without_fivesim_id: result.stuckWithoutFivesimId.length,
      fivesim_balance: balance,
      low_balance: lowBalance,
      truncated,
    }

    await audit('reconcile_report', {
      trigger,
      window: { since: since.toISOString(), until: now.toISOString() },
      summary,
      details: {
        only_in_fivesim: result.onlyInFivesim.slice(0, DETAIL_CAP),
        only_in_db: result.onlyInDb.slice(0, DETAIL_CAP),
        status_mismatches: result.statusMismatches.slice(0, DETAIL_CAP),
        stuck_without_fivesim_id: result.stuckWithoutFivesimId.slice(0, DETAIL_CAP),
      },
    })

    return json({ summary }, 200)
  } catch (err) {
    const error =
      err instanceof FivesimError
        ? { source: '5sim', http_status: err.httpStatus, raw: err.raw }
        : { source: 'internal', message: err instanceof Error ? err.message : String(err) }
    await audit('reconcile_failed', { trigger, error })
    const message = err instanceof FivesimError ? err.userMessage : 'Le rapprochement a échoué.'
    return json({ error: 'reconcile_failed', message }, 502)
  }
})
