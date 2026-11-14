import { describe, expect, it } from 'vitest'
import { groupByCountry, normalizeSearch, offerPrice } from './buy'
import { withLandingFloor, MIN_NUMBER_PRICE_XOF } from './facts'

const row = (country_code: string, name_fr: string, cost_usd: number | string, stock: number) => ({
  country_code,
  cost_usd,
  stock,
  countries: { name_fr, flag_emoji: null },
})

describe('groupByCountry', () => {
  it('cumule le stock et garde le coût minimal par pays, sans les opérateurs épuisés', () => {
    const [fr] = groupByCountry([row('france', 'France', '3.0000', 10), row('france', 'France', '2.5000', 5), row('france', 'France', '0.1000', 0)])
    expect(fr.stock).toBe(15)
    expect(fr.minCostUsd).toBe(2.5)
  })

  it('met l’Occident en tête dans l’ordre voulu, puis les autres pays de A à Z', () => {
    const list = groupByCountry([
      row('senegal', 'Sénégal', 0.4, 1),
      row('germany', 'Allemagne', 5, 1),
      row('angola', 'Angola', 0.2, 1),
      row('usa', 'États-Unis', 0.8, 1),
      row('england', 'Royaume-Uni', 0.7, 1),
      row('ivorycoast', 'Côte d’Ivoire', 0.4, 1),
      row('france', 'France', 3, 1),
    ])
    expect(list.map((c) => c.code)).toEqual(['france', 'usa', 'england', 'germany', 'angola', 'ivorycoast', 'senegal'])
    expect(list.filter((c) => c.featured).map((c) => c.code)).toEqual(['france', 'usa', 'england', 'germany'])
  })

  it('ignore les pays sans stock', () => {
    expect(groupByCountry([row('france', 'France', 1, 0)])).toEqual([])
  })
})

describe('prix affichés', () => {
  const settings = withLandingFloor({ fx_usd_xof: 600, margin_rate: 0.3, rounding_step: 100, price_floor_xof: 150 })
  const whatsapp = { slug: 'whatsapp', name: 'WhatsApp', marginOverride: null }

  it('ne descend jamais sous 3 500 FCFA', () => {
    expect(settings.price_floor_xof).toBe(MIN_NUMBER_PRICE_XOF)
    const [c] = groupByCountry([row('england', 'Royaume-Uni', '0.7000', 3)])
    expect(offerPrice(c, whatsapp, settings)).toBe(3500)
  })

  it('applique la formule au-delà du plancher (5 $ × 600 × 1,3 = 3 900)', () => {
    const [c] = groupByCountry([row('germany', 'Allemagne', '5.0000', 3)])
    expect(offerPrice(c, whatsapp, settings)).toBe(3900)
  })

  it('garde un plancher supérieur s’il est réglé plus haut', () => {
    expect(withLandingFloor({ ...settings, price_floor_xof: 4000 }).price_floor_xof).toBe(4000)
  })
})

describe('normalizeSearch', () => {
  it('ignore accents et casse', () => {
    expect(normalizeSearch('  États-Unis ')).toBe('etats-unis')
    expect(normalizeSearch('Côte d’Ivoire')).toContain('cote')
  })
})
