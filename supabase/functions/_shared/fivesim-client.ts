// Client 5sim authentifié, sans dépendance au runtime. Les erreurs 5sim sont du texte brut :
// elles sont conservées telles quelles (raw) et traduites une seule fois via fivesim-errors.

import { describeFivesimError, type FivesimErrorKind } from './fivesim-errors.ts'

export class FivesimError extends Error {
  readonly kind: FivesimErrorKind
  readonly userMessage: string

  constructor(
    readonly raw: string,
    readonly httpStatus: number,
  ) {
    super(`5sim HTTP ${httpStatus}: ${raw || '(vide)'}`)
    this.name = 'FivesimError'
    const info = describeFivesimError(raw, httpStatus)
    this.kind = info.kind
    this.userMessage = info.message
  }
}

export interface FivesimProfile {
  id: number
  balance: number
  frozen_balance?: number
  rating?: number
  [key: string]: unknown
}

export interface FivesimOrder {
  id: number
  phone: string
  operator?: string
  product: string
  price: number
  status: string
  expires?: string
  created_at: string
  country: string
  [key: string]: unknown
}

export interface FivesimOrdersPage {
  Data: FivesimOrder[] | null
  Total?: number
}

export interface FivesimClient {
  getProfile(): Promise<FivesimProfile>
  listOrders(params: { category: 'activation' | 'hosting'; limit: number; offset: number }): Promise<FivesimOrdersPage>
  /** Achat d'un numéro d'activation. La réponse brute est validée par parseFivesimOrder. */
  buyActivation(params: { country: string; operator: string; product: string }): Promise<unknown>
  checkOrder(id: number): Promise<unknown>
  cancelOrder(id: number): Promise<unknown>
  finishOrder(id: number): Promise<unknown>
}

const SLUG_RE = /^[a-z0-9_-]{1,64}$/

function segment(value: string, label: string): string {
  if (!SLUG_RE.test(value)) throw new Error(`invalid 5sim ${label}: ${value}`)
  return encodeURIComponent(value)
}

function orderId(id: number): string {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`invalid 5sim order id: ${id}`)
  return String(id)
}

export function createFivesimClient(opts: {
  token: string
  baseUrl?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}): FivesimClient {
  const baseUrl = (opts.baseUrl ?? 'https://5sim.net/v1').replace(/\/+$/, '')
  const doFetch = opts.fetchImpl ?? fetch
  const timeoutMs = opts.timeoutMs ?? 15_000

  async function get<T>(path: string): Promise<T> {
    const res = await doFetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${opts.token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    if (!res.ok) throw new FivesimError(text.trim(), res.status)
    try {
      return JSON.parse(text) as T
    } catch {
      // 5sim répond parfois 200 avec un texte d'erreur brut.
      throw new FivesimError(text.trim(), res.status)
    }
  }

  return {
    getProfile: () => get<FivesimProfile>('/user/profile'),
    listOrders: ({ category, limit, offset }) =>
      get<FivesimOrdersPage>(
        `/user/orders?category=${category}&limit=${limit}&offset=${offset}&order=id&reverse=true`,
      ),
    buyActivation: ({ country, operator, product }) =>
      get<unknown>(
        `/user/buy/activation/${segment(country, 'country')}/${segment(operator, 'operator')}/${segment(product, 'product')}`,
      ),
    checkOrder: (id) => get<unknown>(`/user/check/${orderId(id)}`),
    cancelOrder: (id) => get<unknown>(`/user/cancel/${orderId(id)}`),
    finishOrder: (id) => get<unknown>(`/user/finish/${orderId(id)}`),
  }
}
