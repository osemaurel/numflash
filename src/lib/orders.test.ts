import { describe, expect, it } from 'vitest'
import { mmss, placeOrder, relativeTime } from './orders'

describe('mmss', () => {
  it('formate un compte à rebours', () => {
    expect(mmss(0)).toBe('0:00')
    expect(mmss(65)).toBe('1:05')
    expect(mmss(1062)).toBe('17:42')
    expect(mmss(-5)).toBe('0:00')
  })
})

describe('relativeTime', () => {
  const now = new Date(2026, 10, 14, 12, 0, 0).getTime()
  it('affiche des durées courtes en minutes', () => {
    expect(relativeTime(new Date(now - 20_000).toISOString(), now)).toBe('à l’instant')
    expect(relativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe('il y a 5 min')
  })
  it('distingue aujourd’hui, hier et les jours précédents', () => {
    expect(relativeTime(new Date(2026, 10, 14, 9, 5).toISOString(), now)).toBe('aujourd’hui, 09:05')
    expect(relativeTime(new Date(2026, 10, 13, 18, 42).toISOString(), now)).toBe('hier, 18:42')
    expect(relativeTime(new Date(2026, 10, 12, 9, 15).toISOString(), now)).toMatch(/^12 nov\.?, 09:15$/)
  })
})

describe('placeOrder', () => {
  it('ne débite rien tant que l’achat en ligne n’est pas ouvert', async () => {
    const res = await placeOrder({ service: 'whatsapp', country: 'france' })
    expect(res.ok).toBe(false)
  })
})
