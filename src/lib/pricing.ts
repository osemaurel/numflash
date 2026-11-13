// Seule source de vérité du prix client, en FCFA entier.
// Formule : ceil(cost_usd × fx_usd_xof × (1 + marge) / rounding_step) × rounding_step
// avec plancher à price_floor_xof.
// Calcul exact en entiers (BigInt, 4 décimales) : un flottant ferait par exemple
// 10 × 600 × 1,35 = 8100,000000000001 et facturerait un palier de trop.

export interface PricingSettings {
  fx_usd_xof: number
  margin_rate: number
  rounding_step: number
  price_floor_xof: number
}

export interface ServicePricing {
  margin_override: number | null
}

const SCALE = 10_000n

// Les coûts, taux et marges sont stockés en numeric à 4 décimales : toFixed(4) les restitue exactement.
function toScaled(value: number, label: string): bigint {
  const fixed = value.toFixed(4)
  if (!/^-?\d+\.\d{4}$/.test(fixed)) throw new Error(`${label} out of range`)
  const negative = fixed.startsWith('-')
  const [intPart, fracPart] = fixed.replace('-', '').split('.')
  const scaled = BigInt(intPart) * SCALE + BigInt(fracPart)
  return negative ? -scaled : scaled
}

export function computePriceXof(
  costUsd: number,
  service: ServicePricing | null | undefined,
  settings: PricingSettings,
): number {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new Error('cost_usd must be a non-negative finite number')
  }
  if (!Number.isFinite(settings.fx_usd_xof) || settings.fx_usd_xof <= 0) {
    throw new Error('fx_usd_xof must be positive')
  }
  if (!Number.isInteger(settings.rounding_step) || settings.rounding_step <= 0) {
    throw new Error('rounding_step must be a positive integer')
  }
  if (!Number.isInteger(settings.price_floor_xof) || settings.price_floor_xof < 0) {
    throw new Error('price_floor_xof must be a non-negative integer')
  }
  const margin = service?.margin_override ?? settings.margin_rate
  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error('margin must be a non-negative finite number')
  }

  // cost × fx × (1 + marge), chacun à l'échelle 10^4 : le produit est à l'échelle 10^12.
  const raw = toScaled(costUsd, 'cost_usd') * toScaled(settings.fx_usd_xof, 'fx_usd_xof') * (SCALE + toScaled(margin, 'margin'))
  const step = BigInt(settings.rounding_step)
  const stepScaled = step * SCALE * SCALE * SCALE
  const rounded = ((raw + stepScaled - 1n) / stepScaled) * step
  return Math.max(Number(rounded), settings.price_floor_xof)
}
