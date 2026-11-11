import { describe, it, expect } from 'vitest'
import { computePriceXof, type PricingSettings } from './pricing'

const defaults: PricingSettings = {
  fx_usd_xof: 600,
  margin_rate: 0.30,
  rounding_step: 100,
  price_floor_xof: 150,
}

describe('computePriceXof', () => {
  it('applique fx × marge puis arrondit au pas supérieur', () => {
    // 0.15 × 600 × 1.30 = 117 → ceil(117/100) × 100 = 200
    expect(computePriceXof(0.15, null, defaults)).toBe(200)
  })

  it('applique le plancher price_floor_xof', () => {
    // 0.01 × 600 × 1.30 = 7.8 → ceil(0.078) × 100 = 100 → max(100, 150) = 150
    expect(computePriceXof(0.01, null, defaults)).toBe(150)
  })

  it('cost_usd = 0 renvoie le plancher', () => {
    expect(computePriceXof(0, null, defaults)).toBe(150)
  })

  it('margin_override d\'un service remplace margin_rate global', () => {
    // 0.15 × 600 × 1.50 = 135 → ceil(1.35) × 100 = 200
    expect(computePriceXof(0.15, { margin_override: 0.50 }, defaults)).toBe(200)
  })

  it('margin_override = 0 peut faire tomber au plancher', () => {
    // 0.15 × 600 × 1.00 = 90 → ceil(0.9) × 100 = 100 → max(100, 150) = 150
    expect(computePriceXof(0.15, { margin_override: 0 }, defaults)).toBe(150)
  })

  it('margin_override plus élevée que le global augmente le prix', () => {
    // 0.50 × 600 × 2.00 = 600 → ceil(6) × 100 = 600
    expect(computePriceXof(0.50, { margin_override: 1.00 }, defaults)).toBe(600)
  })

  it('service undefined équivaut à service null (utilise le global)', () => {
    expect(computePriceXof(0.15, undefined, defaults)).toBe(200)
    expect(computePriceXof(0.15, null, defaults)).toBe(200)
  })

  it('arrondit toujours vers le haut, même à 1 centime près', () => {
    const noFloor: PricingSettings = { fx_usd_xof: 1000, margin_rate: 0, rounding_step: 100, price_floor_xof: 0 }
    expect(computePriceXof(0.2, null, noFloor)).toBe(200)
    expect(computePriceXof(0.2001, null, noFloor)).toBe(300)
  })

  it('respecte un rounding_step différent (50 FCFA)', () => {
    const s: PricingSettings = { ...defaults, rounding_step: 50 }
    // 0.15 × 600 × 1.30 = 117 → ceil(117/50) × 50 = 150
    expect(computePriceXof(0.15, null, s)).toBe(150)
  })

  it('cas réel : WhatsApp Bénin virtual34 à $0.373', () => {
    // 0.373 × 600 × 1.30 = 290.94 → ceil(2.9094) × 100 = 300
    expect(computePriceXof(0.373, null, defaults)).toBe(300)
  })

  it('rejette un cost_usd négatif', () => {
    expect(() => computePriceXof(-0.01, null, defaults)).toThrow()
  })

  it('rejette NaN et Infinity', () => {
    expect(() => computePriceXof(Number.NaN, null, defaults)).toThrow()
    expect(() => computePriceXof(Number.POSITIVE_INFINITY, null, defaults)).toThrow()
  })

  it('rejette un rounding_step non entier ou nul', () => {
    expect(() => computePriceXof(0.15, null, { ...defaults, rounding_step: 0 })).toThrow()
    expect(() => computePriceXof(0.15, null, { ...defaults, rounding_step: 50.5 })).toThrow()
  })

  it('rejette un fx_usd_xof nul ou négatif', () => {
    expect(() => computePriceXof(0.15, null, { ...defaults, fx_usd_xof: 0 })).toThrow()
    expect(() => computePriceXof(0.15, null, { ...defaults, fx_usd_xof: -1 })).toThrow()
  })
})
