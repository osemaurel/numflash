import { describe, expect, it } from 'vitest'
import { normalizeContactEmail } from './provider-contact.ts'

describe('normalizeContactEmail', () => {
  it('accepte une adresse valide, normalisée', () => {
    expect(normalizeContactEmail('  Paiements@Numflash.com ')).toBe('paiements@numflash.com')
  })
  it('considère une valeur vide ou invalide comme non configurée', () => {
    expect(normalizeContactEmail('')).toBeNull()
    expect(normalizeContactEmail('pas-un-email')).toBeNull()
    expect(normalizeContactEmail(null)).toBeNull()
    expect(normalizeContactEmail(42)).toBeNull()
  })
})
