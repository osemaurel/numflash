import { describe, expect, it } from 'vitest'
import { OTHER_DIAL, defaultDialIso, toInternational } from './fields'

describe('toInternational', () => {
  it('préfixe le numéro national avec l’indicatif, sans toucher au zéro initial', () => {
    expect(toInternational('BJ', '01 97 12 34 56')).toBe('+2290197123456')
    expect(toInternational('CI', '07-12-34-56-78')).toBe('+2250712345678')
    expect(toInternational('SN', '77 123 45 67')).toBe('+221771234567')
  })

  it('accepte un numéro déjà international collé dans le champ', () => {
    expect(toInternational('BJ', '+225 07 12 34 56 78')).toBe('+2250712345678')
  })

  it('demande le numéro complet pour un autre indicatif', () => {
    expect(toInternational(OTHER_DIAL, '+44 7700 900123')).toBe('+447700900123')
    expect(toInternational(OTHER_DIAL, '7700 900123')).toBeNull()
  })

  it('refuse les saisies invalides', () => {
    for (const raw of ['', '12345', 'abc12345678', '0123456789012345', '+12']) {
      expect(toInternational('BJ', raw)).toBeNull()
    }
  })
})

describe('defaultDialIso', () => {
  it('suit la région de la langue du navigateur', () => {
    expect(defaultDialIso(['fr-CI', 'fr'])).toBe('CI')
    expect(defaultDialIso(['en-US', 'fr-SN'])).toBe('SN')
  })

  it('retombe sur le Bénin sinon', () => {
    expect(defaultDialIso(['fr', 'en-US'])).toBe('BJ')
    expect(defaultDialIso([])).toBe('BJ')
  })
})
