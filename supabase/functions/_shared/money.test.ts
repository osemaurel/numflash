import { describe, expect, it } from 'vitest'
import { decimalToXof, xofToDecimalString } from './money.ts'

describe('xofToDecimalString', () => {
  it('formate un entier FCFA au format décimal SasPay', () => {
    expect(xofToDecimalString(5000)).toBe('5000.00')
    expect(xofToDecimalString(500)).toBe('500.00')
  })

  it('refuse les montants non entiers ou négatifs', () => {
    expect(() => xofToDecimalString(1.5)).toThrow()
    expect(() => xofToDecimalString(-100)).toThrow()
    expect(() => xofToDecimalString(Number.NaN)).toThrow()
  })
})

describe('decimalToXof', () => {
  it('lit les chaînes décimales sans passer par un flottant', () => {
    expect(decimalToXof('5000.00')).toBe(5000)
    expect(decimalToXof('5000')).toBe(5000)
    expect(decimalToXof(' 20000.0 ')).toBe(20000)
  })

  it('accepte un entier', () => {
    expect(decimalToXof(1000)).toBe(1000)
  })

  it('refuse une partie décimale non nulle (pas de centimes en FCFA)', () => {
    expect(() => decimalToXof('5000.50')).toThrow()
    expect(() => decimalToXof('5000.01')).toThrow()
  })

  it('refuse les valeurs invalides', () => {
    expect(() => decimalToXof('abc')).toThrow()
    expect(() => decimalToXof('-500.00')).toThrow()
    expect(() => decimalToXof(12.5)).toThrow()
    expect(() => decimalToXof(null)).toThrow()
    expect(() => decimalToXof(undefined)).toThrow()
  })
})
