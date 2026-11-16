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

/** Paiement direct Mobile Money (POST /payments/softpay/), sans page SasPay. */
export interface SoftpayInput {
  amount: string
  currency: 'XOF'
  country: string
  network: string
  description?: string
  customer: { email: string; first_name: string; last_name: string; phone: string }
  metadata?: Record<string, unknown>
  fee_charge_mode?: 'ADD_ON' | 'DEDUCTED'
  /** Code obtenu par l'utilisateur AVANT le paiement (Orange Money Côte d'Ivoire, Burkina…). */
  otp?: string
}

export interface SoftpayResult {
  id: string | number
  status?: string
  /** Vide pour un paiement « push » ; sinon page de l'opérateur (Wave…) vers laquelle rediriger. */
  checkout_url?: string | null
  message?: string
}

export interface RateTier {
  min_amount?: string | number | null
  max_amount?: string | number | null
  percent?: string | number | null
  fixed?: string | number | null
  floor_amount?: string | number | null
  cap_amount?: string | number | null
  fee_charge_mode?: string | null
}

/** Une ligne de GET /pricing/my-rates/ : un réseau d'un pays, avec ses frais et l'éventuel code préalable. */
export interface NetworkRate {
  country_code: string
  country_name?: string
  currency?: string
  network_code: string
  network_name?: string
  payin?: {
    available?: boolean
    otp_required?: boolean
    otp_instructions?: string | null
    tiers?: RateTier[]
  }
}

export interface SaspayClient {
  createCheckoutSession(input: CheckoutSessionInput, idempotencyKey: string): Promise<CheckoutSession>
  verifyPayment(paymentId: string): Promise<VerifiedPayment>
  getCheckoutSessionStatus(sessionId: string): Promise<CheckoutSessionStatus>
  softpay(input: SoftpayInput, idempotencyKey: string): Promise<SoftpayResult>
  confirmOtp(paymentId: string, otp: string): Promise<{ id?: string | number; status?: string; message?: string }>
  myRates(): Promise<NetworkRate[]>
}

interface Envelope {
  success?: boolean
  data?: unknown
  error?: { code?: string; message?: string } | Record<string, unknown>
  // Certaines réponses d'erreur sont « à plat » : { message, code }.
  code?: unknown
  message?: unknown
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

    if (!res.ok || (env && !Array.isArray(env) && env.success === false)) {
      const err = (env?.error ?? null) as { code?: string; message?: string } | null
      const message = typeof err?.message === 'string' ? err.message : typeof env?.message === 'string' ? env.message : null
      const code = typeof err?.code === 'string' ? err.code : typeof env?.code === 'string' ? env.code : null
      throw new SaspayError(message ?? `SasPay HTTP ${res.status}`, res.status, code)
    }
    return (env && !Array.isArray(env) && 'data' in env ? env.data : parsed) as T
  }

  return {
    createCheckoutSession: (input, idempotencyKey) =>
      call<CheckoutSession>('POST', '/checkout-sessions/', input, { 'Idempotency-Key': idempotencyKey }),
    verifyPayment: (paymentId) =>
      call<VerifiedPayment>('GET', `/payments/${encodeURIComponent(paymentId)}/verify/`),
    getCheckoutSessionStatus: (sessionId) =>
      call<CheckoutSessionStatus>('GET', `/checkout-sessions/${encodeURIComponent(sessionId)}/status/`),
    softpay: (input, idempotencyKey) =>
      call<SoftpayResult>('POST', '/payments/softpay/', input, { 'Idempotency-Key': idempotencyKey }),
    confirmOtp: (paymentId, otp) =>
      call<{ id?: string | number; status?: string; message?: string }>(
        'POST',
        `/payments/${encodeURIComponent(paymentId)}/confirm-otp/`,
        { otp },
      ),
    myRates: () => call<NetworkRate[]>('GET', '/pricing/my-rates/'),
  }
}
