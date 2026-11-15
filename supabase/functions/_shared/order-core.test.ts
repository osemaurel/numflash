import { describe, expect, it } from 'vitest'
import { createFivesimClient, FivesimError } from './fivesim-client.ts'
import {
  expectedLocalStatus,
  isNoop,
  isStuckReservation,
  isTerminalProviderStatus,
  needsAutoFinish,
  parseFivesimOrder,
  type LocalOrderState,
} from './order-core.ts'
import { orderErrorResponse } from './order-errors.ts'

const BUY = {
  id: 11631253,
  phone: '+447000000001',
  operator: 'virtual59',
  product: 'telegram',
  price: 0.8,
  status: 'RECEIVED',
  expires: '2026-11-15T10:15:00.809469028Z',
  sms: null,
  created_at: '2026-11-15T10:00:00.809469028Z',
  forwarding: false,
  forwarding_number: '',
  country: 'england',
}

describe('parseFivesimOrder', () => {
  it('lit une réponse d’achat et garde le coût en décimal exact', () => {
    const o = parseFivesimOrder(BUY)
    expect(o).toEqual({
      id: 11631253,
      phone: '+447000000001',
      operator: 'virtual59',
      costUsd: '0.8000',
      status: 'RECEIVED',
      expiresAt: '2026-11-15T10:15:00.809Z',
      sms: [],
    })
  })

  it('lit les SMS reçus et normalise un code numérique', () => {
    const o = parseFivesimOrder({
      ...BUY,
      price: 0.5311,
      sms: [{ created_at: '2026-11-15T10:01:00Z', date: '2026-11-15T10:01:00Z', sender: 'Telegram', text: 'Code 12345', code: 12345 }],
    })
    expect(o.costUsd).toBe('0.5311')
    expect(o.sms).toEqual([{ created_at: '2026-11-15T10:01:00Z', date: '2026-11-15T10:01:00Z', sender: 'Telegram', text: 'Code 12345', code: '12345' }])
  })

  it('refuse une réponse inattendue', () => {
    expect(() => parseFivesimOrder({ ...BUY, status: 'WEIRD' })).toThrow()
    expect(() => parseFivesimOrder({ ...BUY, phone: '' })).toThrow()
    expect(() => parseFivesimOrder({ ...BUY, price: -1 })).toThrow()
    expect(() => parseFivesimOrder('no free phones')).toThrow()
  })
})

const local = (over: Partial<LocalOrderState> = {}): LocalOrderState => ({
  id: 'o1',
  fivesim_order_id: 11631253,
  status: 'pending',
  provider_status: 'RECEIVED',
  created_at: '2026-11-15T10:00:00Z',
  expires_at: '2026-11-15T10:15:00Z',
  sms_count: 0,
  ...over,
})

describe('décisions de synchronisation', () => {
  it('ignore une vérification qui n’apporte rien', () => {
    const remote = parseFivesimOrder(BUY)
    expect(isNoop(local(), remote)).toBe(true)
    expect(isNoop(local({ provider_status: 'PENDING' }), remote)).toBe(false)
    const withSms = parseFivesimOrder({ ...BUY, sms: [{ text: 'Code 1', code: '1' }] })
    expect(isNoop(local(), withSms)).toBe(false)
    expect(isNoop(local({ sms_count: 1, status: 'received' }), withSms)).toBe(true)
  })

  it('repère une réservation bloquée sans numéro', () => {
    const now = Date.parse('2026-11-15T10:04:00Z')
    expect(isStuckReservation(local({ fivesim_order_id: null }), now, 3 * 60_000)).toBe(true)
    expect(isStuckReservation(local({ fivesim_order_id: null }), now, 5 * 60_000)).toBe(false)
    expect(isStuckReservation(local(), now, 3 * 60_000)).toBe(false)
  })

  it('termine une commande avec code une fois le délai dépassé', () => {
    const after = Date.parse('2026-11-15T10:21:00Z')
    expect(needsAutoFinish(local({ status: 'received' }), after, 5 * 60_000)).toBe(true)
    expect(needsAutoFinish(local({ status: 'received' }), Date.parse('2026-11-15T10:16:00Z'), 5 * 60_000)).toBe(false)
    expect(needsAutoFinish(local({ status: 'pending' }), after, 5 * 60_000)).toBe(false)
  })

  it('suit les mêmes règles que la base pour le statut local', () => {
    expect(expectedLocalStatus('RECEIVED', false)).toBe('pending')
    expect(expectedLocalStatus('RECEIVED', true)).toBe('received')
    expect(expectedLocalStatus('TIMEOUT', false)).toBe('timeout')
    expect(expectedLocalStatus('TIMEOUT', true)).toBe('finished')
    expect(expectedLocalStatus('CANCELED', false)).toBe('canceled')
    expect(expectedLocalStatus('BANNED', false)).toBe('banned')
    expect(isTerminalProviderStatus('RECEIVED')).toBe(false)
    expect(isTerminalProviderStatus('TIMEOUT')).toBe(true)
  })
})

describe('client 5sim', () => {
  function mockFetch(status: number, body: string, seen: string[] = []) {
    return (async (url: string | URL | Request) => {
      seen.push(String(url))
      return new Response(body, { status })
    }) as typeof fetch
  }

  it('appelle les bons chemins', async () => {
    const seen: string[] = []
    const client = createFivesimClient({ token: 't', fetchImpl: mockFetch(200, JSON.stringify(BUY), seen) })
    await client.buyActivation({ country: 'england', operator: 'virtual59', product: 'telegram' })
    await client.checkOrder(11631253)
    await client.cancelOrder(11631253)
    await client.finishOrder(11631253)
    expect(seen).toEqual([
      'https://5sim.net/v1/user/buy/activation/england/virtual59/telegram',
      'https://5sim.net/v1/user/check/11631253',
      'https://5sim.net/v1/user/cancel/11631253',
      'https://5sim.net/v1/user/finish/11631253',
    ])
  })

  it('refuse un segment de chemin non conforme avant tout appel', async () => {
    const seen: string[] = []
    const client = createFivesimClient({ token: 't', fetchImpl: mockFetch(200, '{}', seen) })
    expect(() => client.buyActivation({ country: '../x', operator: 'any', product: 'telegram' })).toThrow()
    expect(() => client.checkOrder(-1)).toThrow()
    expect(seen).toEqual([])
  })

  it('transforme une erreur texte (même en HTTP 200) en FivesimError catégorisée', async () => {
    const client = createFivesimClient({ token: 't', fetchImpl: mockFetch(200, 'no free phones') })
    const err = await client.buyActivation({ country: 'england', operator: 'any', product: 'telegram' }).catch((e) => e)
    expect(err).toBeInstanceOf(FivesimError)
    expect(err.kind).toBe('no_numbers')
    expect(err.userMessage).toMatch(/Aucun numéro/)
  })
})

describe('orderErrorResponse', () => {
  it('traduit les erreurs NF_* avec leurs données publiques seulement', () => {
    const r = orderErrorResponse({ message: 'NF_PRICE_CHANGED', details: '{"price_xof": 700, "cost": 0.8}' })
    expect(r.status).toBe(409)
    expect(r.body).toEqual({ error: 'price_changed', message: expect.stringMatching(/prix/), price_xof: 700 })
    expect(r.unexpected).toBe(false)
    const early = orderErrorResponse({ message: 'NF_CANCEL_TOO_EARLY', details: '{"retry_after_seconds": 42}' })
    expect(early.body.retry_after_seconds).toBe(42)
    expect(orderErrorResponse({ message: 'NF_INSUFFICIENT_BALANCE', details: 'pas du json' }).status).toBe(402)
  })

  it('masque une erreur inattendue derrière un message générique', () => {
    const r = orderErrorResponse({ message: 'duplicate key value violates unique constraint "orders_pkey"' })
    expect(r.status).toBe(500)
    expect(r.body.message).toBe('Une erreur est survenue. Réessayez.')
    expect(r.unexpected).toBe(true)
  })
})
