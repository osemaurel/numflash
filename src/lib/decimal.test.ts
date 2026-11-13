import { describe, expect, it } from 'vitest'
import { fractionToPercent, normalizeDecimal, parseIntegerInput, percentToFraction } from './decimal'

describe('percentToFraction', () => {
  it('convertit un pourcentage saisi en fraction exacte', () => {
    expect(percentToFraction('30')).toBe('0.3')
    expect(percentToFraction('30,5')).toBe('0.305')
    expect(percentToFraction('12.34')).toBe('0.1234')
    expect(percentToFraction('0')).toBe('0')
    expect(percentToFraction('100')).toBe('1')
    expect(percentToFraction('250')).toBe('2.5')
    expect(percentToFraction(' 7 ')).toBe('0.07')
  })

  it('refuse plus de 2 décimales ou une saisie invalide', () => {
    expect(percentToFraction('30,555')).toBeNull()
    expect(percentToFraction('-5')).toBeNull()
    expect(percentToFraction('abc')).toBeNull()
    expect(percentToFraction('')).toBeNull()
  })
})

describe('fractionToPercent', () => {
  it('affiche une fraction en pourcentage français', () => {
    expect(fractionToPercent(0.3)).toBe('30')
    expect(fractionToPercent(0.305)).toBe('30,5')
    expect(fractionToPercent(0.1234)).toBe('12,34')
    expect(fractionToPercent(0)).toBe('0')
    expect(fractionToPercent(1.5)).toBe('150')
  })

  it('fait l’aller-retour sans perte', () => {
    for (const p of ['0', '1', '30', '30,5', '12,34', '99,99', '500']) {
      expect(fractionToPercent(Number(percentToFraction(p)))).toBe(p)
    }
  })
})

describe('normalizeDecimal', () => {
  it('accepte la virgule et limite à 4 décimales', () => {
    expect(normalizeDecimal('655,957')).toBe('655.957')
    expect(normalizeDecimal('600')).toBe('600')
    expect(normalizeDecimal('0.1234')).toBe('0.1234')
    expect(normalizeDecimal('0.12345')).toBeNull()
    expect(normalizeDecimal('1e3')).toBeNull()
  })
})

describe('parseIntegerInput', () => {
  it('lit un entier avec espaces de milliers', () => {
    expect(parseIntegerInput('1 500')).toBe(1500)
    expect(parseIntegerInput('20 000')).toBe(20000)
    expect(parseIntegerInput('12')).toBe(12)
    expect(parseIntegerInput('1,5')).toBeNull()
    expect(parseIntegerInput('-3')).toBeNull()
  })
})
