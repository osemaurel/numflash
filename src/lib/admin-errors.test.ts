import { describe, expect, it } from 'vitest'
import { translateAdminError } from './admin-errors'

describe('translateAdminError', () => {
  it('traduit les codes connus', () => {
    expect(translateAdminError({ message: 'NF_FORBIDDEN' })).toBe('Accès réservé aux administrateurs.')
    expect(translateAdminError({ message: 'NF_INSUFFICIENT_BALANCE', details: '{"balance_xof": 0}' })).toMatch(/ne permet pas ce débit/)
  })

  it('nomme le réglage refusé', () => {
    expect(translateAdminError({ message: 'NF_INVALID_VALUE', details: 'margin_rate' })).toBe('Valeur invalide pour « Marge ».')
    expect(translateAdminError({ message: 'NF_INVALID_VALUE', details: 'inconnu' })).toBe('Valeur invalide.')
  })

  it('renvoie un message générique sinon', () => {
    expect(translateAdminError({ message: 'permission denied' })).toBe('Une erreur est survenue. Réessayez.')
    expect(translateAdminError(null)).toBe('Une erreur est survenue. Réessayez.')
  })
})
