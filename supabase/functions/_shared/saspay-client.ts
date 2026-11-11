// Client HTTP SasPay, sans dépendance au runtime (Deno en prod, Node pour les tests).

export class SaspayError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code: string | null,
  ) {
    super(message)
    this.name = 'SaspayError'
  }
}

export interface CheckoutSessionInput {
  amount: string
  currency: 'XOF'
  customer_email: string
  customer_name: string
  customer_phone?: string
  description?: string
  return_url: string
  metadata?: Record<string, unknown>
  fee_charge_mode?: 'ADD_ON' | 'DEDUCTED'
  expires_at?: string
}

export interface CheckoutSession {
  id: string | number
  slug?: string
  checkout_url?: string | null
  status?: string
}

export interface CheckoutSessionStatus {
  id: string | number
  status?: string
  transaction_id?: string | number | null
  transaction_status?: string | null
}

export interface VerifiedPayment {
  id: string | number
  status: string
  currency?: string
  requested_amount?: string | number
  amount?: string | number
  reference?: string
  [key: string]: unknown
}

export interface SaspayClient {
  createCheckoutSession(input: CheckoutSessionInput, idempotencyKey: string): Promise<CheckoutSession>
  verifyPayment(paymentId: string): Promise<VerifiedPayment>
  getCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionStatus>
}

interface Envelope {
  success?: boolean
  data?: unknown
  error?: { code?: string; message?: string } | Record<string, unknown>
}

export function createSaspayClient(opts: {
  secretKey: string
  baseUrl?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}): SaspayClient {
  const baseUrl = (opts.baseUrl ?? 'https://api.saspay.me/api/v1').replace(/\/+$/, '')
  const doFetch = opts.fetchImpl ?? fetch
  const timeoutMs = opts.timeoutMs ?? 15_000

  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${opts.secretKey}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })

    const text = await res.text()
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = null
    }
    const env = (parsed && typeof parsed === 'object' ? parsed : null) as Envelope | null

    if (!res.ok || env?.success === false) {
      const err = env?.error as { code?: string; message?: string } | undefined
      throw new SaspayError(
        typeof err?.message === 'string' ? err.message : `SasPay HTTP ${res.status}`,
        res.status,
        typeof err?.code === 'string' ? err.code : null,
      )
    }
    return (env && 'data' in env ? env.data : parsed) as T
  }

  return {
    createCheckoutSession: (input, idempotencyKey) =>
      call<CheckoutSession>('POST', '/checkout-sessions/', input, { 'Idempotency-Key': idempotencyKey }),
    verifyPayment: (paymentId) =>
      call<VerifiedPayment>('GET', `/payments/${encodeURIComponent(paymentId)}/verify/`),
    getCheckoutSessionStatus: (sessionId) =>
      call<CheckoutSessionStatus>('GET', `/checkout-sessions/${encodeURIComponent(sessionId)}/status/`),
  }
}
