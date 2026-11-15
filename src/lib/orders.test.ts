import { describe, expect, it } from 'vitest'
import { actionErrorMessage, mmss, purchaseErrorMessage, relativeTime } from './orders'

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

describe('messages d’erreur', () => {
  it('annonce le nouveau prix en FCFA', () => {
    expect(purchaseErrorMessage({ error: 'price_changed', message: 'x', price_xof: 3500 })).toBe(
      'Le prix de ce numéro vient de changer : il est maintenant de 3\u202f500 FCFA. Confirmez pour payer ce nouveau prix.',
    )
  })
  it('reprend le message du serveur sinon', () => {
    expect(purchaseErrorMessage({ error: 'no_stock', message: 'Aucun numéro.' })).toBe('Aucun numéro.')
    expect(purchaseErrorMessage(null)).toMatch(/n’a pas pu aboutir/)
  })
  it('donne le délai restant avant de pouvoir annuler', () => {
    expect(actionErrorMessage({ error: 'cancel_too_early', message: 'x', retry_after_seconds: 75 })).toBe('Vous pourrez annuler cette commande dans 1:15.')
    expect(actionErrorMessage({ error: 'has_sms', message: 'Un SMS a déjà été reçu.' })).toBe('Un SMS a déjà été reçu.')
  })
})
