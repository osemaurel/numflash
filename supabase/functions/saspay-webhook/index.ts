// saspay-webhook : endpoint public appelé par SasPay (verify_jwt = false).
// Toute la logique vit dans _shared/saspay-webhook-handler.ts ; ici on ne fait que brancher
// la base (service_role), le client SasPay et l'horloge.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createSaspayClient } from '../_shared/saspay-client.ts'
import { handleSaspayWebhook, type TopupRow } from '../_shared/saspay-webhook-handler.ts'

const TOPUP_COLUMNS = 'id, user_id, amount_xof, status, saspay_session_id, saspay_payment_id, created_at'
const CANDIDATE_WINDOW_MS = 48 * 60 * 60 * 1000
const ACTOR = 'webhook:saspay'

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const requestId = crypto.randomUUID()

  const audit = async (action: string, target: string | null, payload: Record<string, unknown>) => {
    const { error } = await admin.from('audit_log').insert({ actor: ACTOR, action, target, payload })
    if (error) console.error('audit_log insert failed', action, error.message)
  }

  try {
    const result = await handleSaspayWebhook(
      {
        rawBody: await req.text(),
        signature: req.headers.get('x-webhook-signature'),
        timestamp: req.headers.get('x-webhook-timestamp'),
        eventHeader: req.headers.get('x-webhook-event'),
        meta: {
          requestId,
          ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
          userAgent: req.headers.get('user-agent'),
        },
      },
      {
        secret: Deno.env.get('SASPAY_WEBHOOK_SECRET') ?? '',
        nowSeconds: () => Math.floor(Date.now() / 1000),
        saspay: createSaspayClient({ secretKey: Deno.env.get('SASPAY_SECRET_KEY') ?? '' }),
        db: {
          async findTopupByPaymentId(paymentId) {
            const { data, error } = await admin
              .from('topups')
              .select(TOPUP_COLUMNS)
              .eq('saspay_payment_id', paymentId)
              .maybeSingle()
            if (error) throw new Error(`findTopupByPaymentId: ${error.message}`)
            return data as TopupRow | null
          },
          async listCandidateTopups() {
            const { data, error } = await admin
              .from('topups')
              .select(TOPUP_COLUMNS)
              .neq('status', 'succeeded')
              .not('saspay_session_id', 'is', null)
              .gte('created_at', new Date(Date.now() - CANDIDATE_WINDOW_MS).toISOString())
              .order('created_at', { ascending: false })
              .limit(25)
            if (error) throw new Error(`listCandidateTopups: ${error.message}`)
            return (data ?? []) as TopupRow[]
          },
          async creditTopup({ topupId, paymentId, payload }) {
            const { data, error } = await admin.rpc('credit_topup', {
              p_topup_id: topupId,
              p_saspay_payment_id: paymentId,
              p_actor: ACTOR,
              p_payload: payload,
            })
            if (error) throw new Error(`credit_topup: ${error.message}`)
            return data as { credited: boolean }
          },
          async failTopup({ topupId, paymentId, payload }) {
            const { data, error } = await admin.rpc('fail_topup_if_pending', {
              p_topup_id: topupId,
              p_saspay_payment_id: paymentId,
              p_actor: ACTOR,
              p_payload: payload,
            })
            if (error) throw new Error(`fail_topup_if_pending: ${error.message}`)
            return data as { changed: boolean }
          },
          audit,
        },
      },
    )
    return json(result.body, result.status)
  } catch (err) {
    // 500 : SasPay relivrera, et le crédit est idempotent côté base.
    await audit('webhook_error', null, {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    })
    return json({ error: 'internal_error' }, 500)
  }
})
