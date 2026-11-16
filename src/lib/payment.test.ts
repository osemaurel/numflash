import { describe, expect, it } from 'vitest'
import { detectCountry, estimateFee, fillOtpInstructions, flag, localPart, splitFullName, toE164, type FeeTier } from './payment'

const tier = (percent: string, extra: Partial<FeeTier> = {}): FeeTier => ({
  min: '200',
  max: '100000000',
  percent,
  fixed: '0',
  floor: '0',
  cap: null,
  mode: 'ADD_ON',
  ...extra,
})

describe('estimateFee', () => {
  it('ajoute les frais en pourcentage, arrondis au franc supérieur', () => {
    expect(estimateFee(5000, [tier('3.9')])).toEqual({ fee: 195, total: 5195, known: true })
    expect(estimateFee(500, [tier('3.5')])).toEqual({ fee: 18, total: 518, known: true })
    expect(estimateFee(2000, [tier('4.75')])).toEqual({ fee: 95, total: 2095, known: true })
  })

  it('applique le fixe, le plancher et le plafond', () => {
    expect(estimateFee(1000, [tier('3.9', { fixed: '100' })])).toEqual({ fee: 139, total: 1139, known: true })
    expect(estimateFee(1000, [tier('2.5', { floor: '50.00' })])).toEqual({ fee: 50, total: 1050, known: true })
    expect(estimateFee(100000, [tier('2.5', { cap: '1000' })])).toEqual({ fee: 1000, total: 101000, known: true })
  })

  it('choisit la tranche du montant et gère les frais offerts ou inconnus', () => {
    const tiers = [tier('5', { min: '0', max: '999' }), tier('3', { min: '1000', max: null })]
    expect(estimateFee(500, tiers).fee).toBe(25)
    expect(estimateFee(5000, tiers).fee).toBe(150)
    expect(estimateFee(5000, [tier('3.9', { mode: 'DEDUCTED' })])).toEqual({ fee: 0, total: 5000, known: true })
    expect(estimateFee(5000, [])).toEqual({ fee: 0, total: 5000, known: false })
    expect(estimateFee(100, [tier('3.9')])).toEqual({ fee: 0, total: 100, known: false })
  })
})

describe('detectCountry', () => {
  const available = ['BJ', 'BF', 'CI', 'SN', 'CM']
  it('privilégie le numéro du profil, puis le fuseau, puis la langue', () => {
    expect(detectCountry(available, { profilePhone: '+225 07 12 34 56', timeZone: 'Africa/Dakar' })).toBe('CI')
    expect(detectCountry(available, { timeZone: 'Africa/Dakar', languages: ['fr-BJ'] })).toBe('SN')
    expect(detectCountry(available, { timeZone: 'Europe/Paris', languages: ['fr-FR', 'fr-CM'] })).toBe('CM')
    expect(detectCountry(available, { timeZone: 'Europe/Paris', languages: ['fr-FR'] })).toBe('BJ')
    expect(detectCountry([], {})).toBeNull()
  })
})

describe('numéros', () => {
  it('compose le numéro international à partir de la saisie locale', () => {
    expect(toE164('BJ', '97 12 34 56')).toBe('+22997123456')
    expect(toE164('BJ', '01 97 12 34 56')).toBe('+2290197123456')
    expect(toE164('CI', '+225 07 12 34 56 78')).toBe('+2250712345678')
    expect(toE164('CI', '+229 97 12 34 56')).toBeNull()
    expect(toE164('SN', '77 12')).toBeNull()
    expect(toE164('SN', 'abc')).toBeNull()
  })
  it('retrouve la partie locale pour préremplir', () => {
    expect(localPart('BJ', '+22997123456')).toBe('97123456')
    expect(localPart('CI', '+22997123456')).toBe('')
  })
})

describe('divers', () => {
  it('remplace le montant dans les instructions USSD', () => {
    expect(fillOtpInstructions('Composez *144*4*6*{amount}#', 5225)).toBe('Composez *144*4*6*5225#')
  })
  it('sépare prénom et nom', () => {
    expect(splitFullName('Awa Koné Traoré')).toEqual({ first: 'Awa', last: 'Koné Traoré' })
    expect(splitFullName('  Awa ')).toEqual({ first: 'Awa', last: '' })
    expect(splitFullName(null)).toEqual({ first: '', last: '' })
  })
  it('affiche le drapeau du pays', () => {
    expect(flag('BJ')).toBe('🇧🇯')
    expect(flag('??')).toBe('🌐')
  })
})
