import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { VerifiedPayment } from './saspay-client.ts'
import { handleSaspayWebhook, type TopupRow, type WebhookDeps, type WebhookRequest } from './saspay-webhook-handler.ts'

const SECRET = 'whsec_test_secret'
const NOW = 1_800_000_000

function makeEnv(opts: { verify?: (id: string) => Promise<VerifiedPayment>; sessionTx?: Record<string, string> } = {}) {
  const topups = new Map<string, TopupRow>([
    [
      't1',
      {
        id: 't1',
        user_id: 'u1',
        amount_xof: 5000,
        status: 'pending',
        saspay_session_id: 'cs_1',
        saspay_payment_id: null,
        created_at: '2026-11-11T10:00:00Z',
      },
    ],
  ])
  const wallet: Array<{ topup_id: string; amount_xof: number }> = []
  const audits: string[] = []
  const sessionTx: Record<string, string> = { cs_1: 'tx_1', ...opts.sessionTx }

  const verifyPayment = vi.fn(
    opts.verify ??
      (async (id: string): Promise<VerifiedPayment> => ({
        id,
        status: 'SUCCESS',
        currency: 'XOF',
        requested_amount: '5000.00',
      })),
  )
  const getCheckoutSessionStatus = vi.fn(async (sid: string) => ({
    id: sid,
    status: 'PAID',
    transaction_id: sessionTx[sid] ?? null,
  }))

  // Reproduit la sémantique de public.credit_topup : seul 'succeeded' est terminal.
  const creditTopup = vi.fn(async ({ topupId, paymentId }: { topupId: string; paymentId: string }) => {
    const t = topups.get(topupId)!
    if (t.status === 'succeeded') return { credited: false }
    wallet.push({ topup_id: topupId, amount_xof: t.amount_xof })
    t.status = 'succeeded'
    t.saspay_payment_id = paymentId
    return { credited: true }
  })

  const failTopup = vi.fn(async ({ topupId }: { topupId: string }) => {
    const t = topups.get(topupId)!
    if (t.status !== 'pending') return { changed: false }
    t.status = 'failed'
    return { changed: true }
  })

  const deps: WebhookDeps = {
    secret: SECRET,
    nowSeconds: () => NOW,
    saspay: { verifyPayment, getCheckoutSessionStatus },
    db: {
      findTopupByPaymentId: async (pid) => [...topups.values()].find((t) => t.saspay_payment_id === pid) ?? null,
      listCandidateTopups: async () =>
        [...topups.values()].filter((t) => t.status !== 'succeeded' && t.saspay_session_id),
      creditTopup,
      failTopup,
      audit: async (action) => {
        audits.push(action)
      },
    },
  }
  return { deps, topups, wallet, audits, sessionTx, verifyPayment, creditTopup, failTopup }
}

function signedRequest(body: object, ts = NOW): WebhookRequest {
  const rawBody = JSON.stringify(body)
  return {
    rawBody,
    timestamp: String(ts),
    signature: createHmac('sha256', SECRET).update(`${ts}.${rawBody}`).digest('hex'),
    eventHeader: (body as { event?: string }).event ?? null,
    meta: { requestId: 'req-test', ip: '203.0.113.7', userAgent: 'vitest' },
  }
}

const SUCCESS_EVENT = {
  event: 'transaction.success',
  data: { id: 'tx_1', status: 'SUCCESS', amount: '5000.00', currency: 'XOF' },
}

describe('handleSaspayWebhook — rejeu', () => {
  it('deux webhooks identiques ne créditent qu’une seule fois', async () => {
    const env = makeEnv()
    const req = signedRequest(SUCCESS_EVENT)

    const first = await handleSaspayWebhook(req, env.deps)
    const second = await handleSaspayWebhook(req, env.deps)

    expect(first).toEqual({ status: 200, body: { ok: true, action: 'credited' } })
    expect(second).toEqual({ status: 200, body: { ok: true, action: 'already_credited' } })
    expect(env.wallet).toEqual([{ topup_id: 't1', amount_xof: 5000 }])
    expect(env.topups.get('t1')!.status).toBe('succeeded')
    expect(env.verifyPayment).toHaveBeenCalledTimes(2)
  })

  it('deux webhooks identiques en parallèle ne créditent qu’une seule fois', async () => {
    const env = makeEnv()
    const req = signedRequest(SUCCESS_EVENT)

    const results = await Promise.all([handleSaspayWebhook(req, env.deps), handleSaspayWebhook(req, env.deps)])

    expect(results.map((r) => r.body.action).sort()).toEqual(['already_credited', 'credited'])
    expect(env.wallet).toHaveLength(1)
  })

  it('un rejeu signé il y a plus de 300 s est refusé sans appeler SasPay', async () => {
    const env = makeEnv()
    const result = await handleSaspayWebhook(signedRequest(SUCCESS_EVENT, NOW - 301), env.deps)

    expect(result.status).toBe(401)
    expect(env.verifyPayment).not.toHaveBeenCalled()
    expect(env.wallet).toHaveLength(0)
    expect(env.audits).toContain('webhook_rejected')
  })
})

describe('handleSaspayWebhook — confiance', () => {
  it('refuse une signature invalide', async () => {
    const env = makeEnv()
    const req = { ...signedRequest(SUCCESS_EVENT), signature: '0'.repeat(64) }
    const result = await handleSaspayWebhook(req, env.deps)

    expect(result.status).toBe(401)
    expect(env.verifyPayment).not.toHaveBeenCalled()
    expect(env.creditTopup).not.toHaveBeenCalled()
  })

  it('ne crédite pas si verify dit PENDING, même si le webhook dit success', async () => {
    const env = makeEnv({
      verify: async (id) => ({ id, status: 'PENDING', currency: 'XOF', requested_amount: '5000.00' }),
    })
    const result = await handleSaspayWebhook(signedRequest(SUCCESS_EVENT), env.deps)

    expect(result.body.action).toBe('not_final')
    expect(env.wallet).toHaveLength(0)
    expect(env.topups.get('t1')!.status).toBe('pending')
  })

  it('ignore le montant du corps et refuse si verify donne un autre montant', async () => {
    const env = makeEnv({
      verify: async (id) => ({ id, status: 'SUCCESS', currency: 'XOF', requested_amount: '500.00' }),
    })
    const tampered = { ...SUCCESS_EVENT, data: { ...SUCCESS_EVENT.data, amount: '5000.00' } }
    const result = await handleSaspayWebhook(signedRequest(tampered), env.deps)

    expect(result.body.action).toBe('amount_mismatch')
    expect(env.wallet).toHaveLength(0)
    expect(env.audits).toContain('topup_amount_mismatch')
  })

  it('refuse une devise autre que XOF', async () => {
    const env = makeEnv({
      verify: async (id) => ({ id, status: 'SUCCESS', currency: 'XAF', requested_amount: '5000.00' }),
    })
    const result = await handleSaspayWebhook(signedRequest(SUCCESS_EVENT), env.deps)

    expect(result.body.action).toBe('amount_mismatch')
    expect(env.wallet).toHaveLength(0)
  })

  it('renvoie 502 si verify échoue, pour que SasPay relivre', async () => {
    const env = makeEnv({
      verify: async () => {
        throw new Error('network down')
      },
    })
    const result = await handleSaspayWebhook(signedRequest(SUCCESS_EVENT), env.deps)

    expect(result.status).toBe(502)
    expect(env.wallet).toHaveLength(0)
  })
})

describe('handleSaspayWebhook — cycle de vie', () => {
  it('marque la recharge en échec puis crédite un succès ultérieur sur la même session', async () => {
    const env = makeEnv({
      verify: async (id) =>
        id === 'tx_fail'
          ? { id, status: 'FAILED', currency: 'XOF', requested_amount: '5000.00' }
          : { id, status: 'SUCCESS', currency: 'XOF', requested_amount: '5000.00' },
      sessionTx: { cs_1: 'tx_fail' },
    })

    const failed = await handleSaspayWebhook(
      signedRequest({ event: 'transaction.failed', data: { id: 'tx_fail' } }),
      env.deps,
    )
    expect(failed.body.action).toBe('marked_failed')
    expect(env.topups.get('t1')!.status).toBe('failed')

    env.sessionTx.cs_1 = 'tx_ok'
    const success = await handleSaspayWebhook(
      signedRequest({ event: 'transaction.success', data: { id: 'tx_ok' } }),
      env.deps,
    )
    expect(success.body.action).toBe('credited')
    expect(env.wallet).toHaveLength(1)
  })

  it('ignore les événements non gérés sans appeler SasPay', async () => {
    const env = makeEnv()
    const result = await handleSaspayWebhook(
      signedRequest({ event: 'webhook.test', data: { id: 'evt_test' } }),
      env.deps,
    )

    expect(result).toEqual({ status: 200, body: { ok: true, action: 'ignored', event: 'webhook.test' } })
    expect(env.verifyPayment).not.toHaveBeenCalled()
  })

  it('signale une transaction orpheline sans rien créditer', async () => {
    const env = makeEnv({ sessionTx: { cs_1: 'tx_autre' } })
    const result = await handleSaspayWebhook(signedRequest(SUCCESS_EVENT), env.deps)

    expect(result.body.action).toBe('orphan')
    expect(env.wallet).toHaveLength(0)
    expect(env.audits).toContain('webhook_orphan')
  })

  it('rejette un corps invalide', async () => {
    const env = makeEnv()
    const result = await handleSaspayWebhook(signedRequest({ hello: 'world' }), env.deps)

    expect(result.status).toBe(400)
    expect(env.verifyPayment).not.toHaveBeenCalled()
  })
})
