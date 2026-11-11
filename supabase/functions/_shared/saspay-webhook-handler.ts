// Logique du webhook SasPay, indépendante du runtime : la base, SasPay et l'horloge sont injectés.
// Règles : signature vérifiée sur le corps brut, montant et statut toujours relus via
// GET /payments/{id}/verify/, crédit atomique et idempotent côté base (credit_topup).

import { z } from 'zod'
import { decimalToXof } from './money.ts'
import type { SaspayClient, VerifiedPayment } from './saspay-client.ts'
import { verifySaspaySignature } from './webhook-signature.ts'

const Envelope = z
  .object({
    event: z.string().min(1).max(100),
    data: z
      .object({ id: z.union([z.string().min(1).max(200), z.number().int()]) })
      .passthrough(),
  })
  .passthrough()

const HANDLED_EVENTS = new Set(['transaction.success', 'transaction.failed', 'transaction.cancelled'])

export interface TopupRow {
  id: string
  user_id: string
  amount_xof: number
  status: 'pending' | 'succeeded' | 'failed' | 'expired'
  saspay_session_id: string | null
  saspay_payment_id: string | null
  created_at: string
}

type Payload = Record<string, unknown>

export interface WebhookDeps {
  secret: string
  nowSeconds: () => number
  saspay: Pick<SaspayClient, 'verifyPayment' | 'getCheckoutSessionStatus'>
  db: {
    findTopupByPaymentId(paymentId: string): Promise<TopupRow | null>
    listCandidateTopups(): Promise<TopupRow[]>
    creditTopup(args: { topupId: string; paymentId: string; payload: Payload }): Promise<{ credited: boolean }>
    failTopup(args: { topupId: string; paymentId: string; payload: Payload }): Promise<{ changed: boolean }>
    audit(action: string, target: string | null, payload: Payload): Promise<void>
  }
}

export interface WebhookRequest {
  rawBody: string
  signature: string | null
  timestamp: string | null
  eventHeader: string | null
  meta: { requestId: string; ip: string | null; userAgent: string | null }
}

export interface WebhookResult {
  status: number
  body: Record<string, unknown>
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function verifiedAmount(tx: VerifiedPayment): number | null {
  try {
    return decimalToXof(tx.requested_amount ?? tx.amount)
  } catch {
    return null
  }
}

// Une transaction SasPay se rattache à une recharge soit parce qu'on l'a déjà liée
// (rejeu), soit via la session de paiement stockée à la création.
async function findTopup(paymentId: string, tx: VerifiedPayment, deps: WebhookDeps): Promise<TopupRow | null> {
  const linked = await deps.db.findTopupByPaymentId(paymentId)
  if (linked) return linked

  const expected = verifiedAmount(tx)
  const candidates = await deps.db.listCandidateTopups()
  const ordered = [
    ...candidates.filter((c) => c.amount_xof === expected),
    ...candidates.filter((c) => c.amount_xof !== expected),
  ]
  for (const candidate of ordered) {
    if (!candidate.saspay_session_id) continue
    try {
      const status = await deps.saspay.getCheckoutSessionStatus(candidate.saspay_session_id)
      if (status?.transaction_id != null && String(status.transaction_id) === paymentId) return candidate
    } catch {
      continue
    }
  }
  return null
}

export async function handleSaspayWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResult> {
  const base: Payload = {
    request_id: req.meta.requestId,
    ip: req.meta.ip,
    user_agent: req.meta.userAgent,
    event_header: req.eventHeader,
  }

  const signature = await verifySaspaySignature({
    rawBody: req.rawBody,
    timestamp: req.timestamp,
    signature: req.signature,
    secret: deps.secret,
    nowSeconds: deps.nowSeconds(),
  })
  if (!signature.ok) {
    await deps.db.audit('webhook_rejected', null, { ...base, reason: signature.reason })
    return { status: 401, body: { error: 'invalid_signature' } }
  }

  let json: unknown = null
  try {
    json = JSON.parse(req.rawBody)
  } catch {
    json = null
  }
  const parsed = Envelope.safeParse(json)
  if (!parsed.success) {
    await deps.db.audit('webhook_invalid_body', null, { ...base, issues: parsed.error.issues.slice(0, 5) })
    return { status: 400, body: { error: 'invalid_body' } }
  }

  const event = parsed.data.event
  const paymentId = String(parsed.data.data.id)
  const paymentTarget = `saspay_payment:${paymentId}`
  await deps.db.audit('webhook_received', paymentTarget, { ...base, event })

  if (!HANDLED_EVENTS.has(event)) {
    return { status: 200, body: { ok: true, action: 'ignored', event } }
  }

  // Le corps du webhook n'est qu'un signal : statut et montant viennent de verify.
  let tx: VerifiedPayment
  try {
    tx = await deps.saspay.verifyPayment(paymentId)
  } catch (err) {
    await deps.db.audit('webhook_verify_failed', paymentTarget, { ...base, event, error: describe(err) })
    return { status: 502, body: { error: 'verify_failed' } }
  }

  const verifiedStatus = String(tx?.status ?? '').toUpperCase()
  if (tx?.id != null && String(tx.id) !== paymentId) {
    await deps.db.audit('webhook_verify_id_mismatch', paymentTarget, { ...base, event, verified_id: String(tx.id) })
    return { status: 200, body: { ok: true, action: 'verify_id_mismatch' } }
  }

  const topup = await findTopup(paymentId, tx, deps)
  if (!topup) {
    await deps.db.audit('webhook_orphan', paymentTarget, { ...base, event, verified_status: verifiedStatus })
    return { status: 200, body: { ok: true, action: 'orphan' } }
  }
  const topupTarget = `topup:${topup.id}`
  const context: Payload = {
    ...base,
    event,
    verified_status: verifiedStatus,
    verified_reference: typeof tx.reference === 'string' ? tx.reference : null,
  }

  if (verifiedStatus === 'SUCCESS') {
    const amount = verifiedAmount(tx)
    const currency = String(tx.currency ?? '').toUpperCase()
    if (currency !== 'XOF' || amount !== topup.amount_xof) {
      await deps.db.audit('topup_amount_mismatch', topupTarget, {
        ...context,
        saspay_payment_id: paymentId,
        verified_amount: tx.requested_amount ?? tx.amount ?? null,
        verified_currency: tx.currency ?? null,
        expected_amount_xof: topup.amount_xof,
      })
      return { status: 200, body: { ok: true, action: 'amount_mismatch' } }
    }
    const result = await deps.db.creditTopup({ topupId: topup.id, paymentId, payload: context })
    return { status: 200, body: { ok: true, action: result.credited ? 'credited' : 'already_credited' } }
  }

  if (verifiedStatus === 'FAILED' || verifiedStatus === 'CANCELLED') {
    const result = await deps.db.failTopup({ topupId: topup.id, paymentId, payload: context })
    return { status: 200, body: { ok: true, action: result.changed ? 'marked_failed' : 'unchanged' } }
  }

  await deps.db.audit('webhook_not_final', topupTarget, { ...context, saspay_payment_id: paymentId })
  return { status: 200, body: { ok: true, action: 'not_final' } }
}
