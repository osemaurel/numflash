// Client 5sim authentifié, sans dépendance au runtime. Les erreurs 5sim sont du texte brut :
// elles sont conservées telles quelles (raw) et traduites une seule fois via fivesim-errors.

import { translateFivesimError } from './fivesim-errors.ts'

export class FivesimError extends Error {
  constructor(
    readonly raw: string,
    readonly httpStatus: number,
    readonly userMessage: string,
  ) {
    super(`5sim HTTP ${httpStatus}: ${raw || '(vide)'}`)
    this.name = 'FivesimError'
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
    if (!res.ok) throw new FivesimError(text.trim(), res.status, translateFivesimError(text, res.status))
    try {
      return JSON.parse(text) as T
    } catch {
      // 5sim répond parfois 200 avec un texte d'erreur brut.
      throw new FivesimError(text.trim(), res.status, translateFivesimError(text, res.status))
    }
  }

  return {
    getProfile: () => get<FivesimProfile>('/user/profile'),
    listOrders: ({ category, limit, offset }) =>
      get<FivesimOrdersPage>(
        `/user/orders?category=${category}&limit=${limit}&offset=${offset}&order=id&reverse=true`,
      ),
  }
}
