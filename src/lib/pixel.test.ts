import { describe, expect, it } from 'vitest'
import { isTrackedPath, moneyParams, xofToEur } from './pixel'
import { displayWhatsapp, normalizeWhatsapp, whatsappUrl } from './support'

describe('xofToEur (parité fixe 655,957)', () => {
  it('convertit exactement les montants ronds', () => {
    expect(xofToEur(655_957)).toBe('1000.00')
    expect(xofToEur(65_596)).toBe('100.00')
    expect(xofToEur(0)).toBe('0.00')
  })
  it('arrondit au centime le plus proche', () => {
    expect(xofToEur(5000)).toBe('7.62') // 7,6224…
    expect(xofToEur(3500)).toBe('5.34') // 5,3357…
    expect(xofToEur(1)).toBe('0.00')
    expect(xofToEur(4)).toBe('0.01') // 0,0061
  })
  it('refuse un montant non entier', () => {
    expect(() => xofToEur(10.5)).toThrow()
  })
  it('joint le montant FCFA d’origine', () => {
    expect(moneyParams(5000)).toEqual({ value: '7.62', currency: 'EUR', value_xof: 5000 })
  })
})

describe('isTrackedPath', () => {
  it('ne suit jamais l’administration', () => {
    expect(isTrackedPath('/admin')).toBe(false)
    expect(isTrackedPath('/admin/utilisateurs/1')).toBe(false)
    expect(isTrackedPath('/administration-test')).toBe(true)
    expect(isTrackedPath('/')).toBe(true)
    expect(isTrackedPath('/paiement')).toBe(true)
  })
})

describe('numéro WhatsApp du support', () => {
  it('normalise comme la base', () => {
    expect(normalizeWhatsapp('+229 97 12 34 56')).toBe('+22997123456')
    expect(normalizeWhatsapp('0022997123456')).toBe('+22997123456')
    expect(normalizeWhatsapp('+225 (07) 12-34-56.78')).toBe('+2250712345678')
    expect(normalizeWhatsapp('97123456')).toBeNull()
    expect(normalizeWhatsapp('+0229123456')).toBeNull()
    expect(normalizeWhatsapp('')).toBeNull()
  })
  it('construit le lien wa.me avec message prérempli', () => {
    expect(whatsappUrl('+22997123456', 'Bonjour !')).toBe('https://wa.me/22997123456?text=Bonjour%20!')
  })
  it('affiche le numéro par paires', () => {
    expect(displayWhatsapp('+22997123456')).toBe('+229 97 12 34 56')
  })
})
