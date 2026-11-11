import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifySaspaySignature } from './webhook-signature.ts'

const SECRET = 'whsec_test_secret'
const NOW = 1_800_000_000
const BODY = JSON.stringify({ event: 'transaction.success', data: { id: 'tx_1' } })

function sign(body: string, ts: number | string, secret = SECRET) {
  return createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')
}

function check(overrides: Partial<Parameters<typeof verifySaspaySignature>[0]> = {}) {
  return verifySaspaySignature({
    rawBody: BODY,
    timestamp: String(NOW),
    signature: sign(BODY, NOW),
    secret: SECRET,
    nowSeconds: NOW,
    ...overrides,
  })
}

describe('verifySaspaySignature', () => {
  it('accepte une signature valide', async () => {
    expect(await check()).toEqual({ ok: true })
  })

  it('accepte une signature hexadécimale en majuscules', async () => {
    expect(await check({ signature: sign(BODY, NOW).toUpperCase() })).toEqual({ ok: true })
  })

  it('rejette un corps modifié', async () => {
    expect(await check({ rawBody: BODY.replace('tx_1', 'tx_2') })).toEqual({ ok: false, reason: 'signature_mismatch' })
  })

  it('rejette un mauvais secret', async () => {
    expect(await check({ signature: sign(BODY, NOW, 'autre_secret') })).toEqual({
      ok: false,
      reason: 'signature_mismatch',
    })
  })

  it('rejette un timestamp modifié (signé avec un autre)', async () => {
    expect(await check({ timestamp: String(NOW + 10) })).toEqual({ ok: false, reason: 'signature_mismatch' })
  })

  it('rejette un webhook de plus de 300 s (anti-rejeu)', async () => {
    const old = NOW - 301
    expect(await check({ timestamp: String(old), signature: sign(BODY, old) })).toEqual({
      ok: false,
      reason: 'timestamp_out_of_window',
    })
  })

  it('accepte un webhook à 300 s pile', async () => {
    const edge = NOW - 300
    expect(await check({ timestamp: String(edge), signature: sign(BODY, edge) })).toEqual({ ok: true })
  })

  it('rejette un timestamp trop dans le futur', async () => {
    const future = NOW + 301
    expect(await check({ timestamp: String(future), signature: sign(BODY, future) })).toEqual({
      ok: false,
      reason: 'timestamp_out_of_window',
    })
  })

  it('rejette les en-têtes manquants', async () => {
    expect(await check({ signature: null })).toEqual({ ok: false, reason: 'missing_headers' })
    expect(await check({ timestamp: null })).toEqual({ ok: false, reason: 'missing_headers' })
  })

  it('rejette un secret non configuré', async () => {
    expect(await check({ secret: '' })).toEqual({ ok: false, reason: 'missing_secret' })
  })

  it('rejette une signature mal formée', async () => {
    expect(await check({ signature: 'pas-du-hex' })).toEqual({ ok: false, reason: 'invalid_signature_format' })
    expect(await check({ signature: 'abcd' })).toEqual({ ok: false, reason: 'invalid_signature_format' })
  })

  it('rejette un timestamp non numérique', async () => {
    expect(await check({ timestamp: '12a' })).toEqual({ ok: false, reason: 'invalid_timestamp' })
  })
})
