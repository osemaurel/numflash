import { describe, expect, it } from 'vitest'
import { isFivesimAccountIssue, translateFivesimError } from './fivesim-errors.ts'

describe('translateFivesimError', () => {
  it('traduit les erreurs connues, quelle que soit la casse ou les guillemets', () => {
    expect(translateFivesimError('no free phones')).toMatch(/Aucun numéro n'est disponible/)
    expect(translateFivesimError(' "No Free Phones" ')).toMatch(/Aucun numéro n'est disponible/)
    expect(translateFivesimError('order has sms')).toMatch(/un SMS a déjà été reçu/)
    expect(translateFivesimError('bad country')).toBe("Ce pays n'est pas disponible.")
  })

  it('ne révèle pas au client que notre compte fournisseur est à sec', () => {
    const msg = translateFivesimError('not enough user balance')
    expect(msg).toBe('Le service est momentanément indisponible. Réessayez dans quelques minutes.')
    expect(msg).not.toMatch(/solde|balance/i)
  })

  it('renvoie un message générique pour une erreur inconnue', () => {
    expect(translateFivesimError('something weird')).toMatch(/Le fournisseur a renvoyé une erreur/)
    expect(translateFivesimError('')).toMatch(/Le fournisseur a renvoyé une erreur/)
    expect(translateFivesimError(null)).toMatch(/Le fournisseur a renvoyé une erreur/)
  })

  it('traite 401, 429 et 5xx comme une indisponibilité', () => {
    expect(translateFivesimError('', 401)).toMatch(/momentanément indisponible/)
    expect(translateFivesimError('', 429)).toMatch(/momentanément indisponible/)
    expect(translateFivesimError('Bad Gateway', 502)).toMatch(/momentanément indisponible/)
  })
})

describe('isFivesimAccountIssue', () => {
  it('repère les problèmes de compte fournisseur', () => {
    expect(isFivesimAccountIssue('not enough user balance')).toBe(true)
    expect(isFivesimAccountIssue('', 401)).toBe(true)
    expect(isFivesimAccountIssue('no free phones')).toBe(false)
  })
})
