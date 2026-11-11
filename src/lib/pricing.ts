// Seule source de vérité du prix client, en FCFA entier.
// Formule : ceil(cost_usd × fx_usd_xof × (1 + marge) / rounding_step) × rounding_step
// avec plancher à price_floor_xof.

export interface PricingSettings {
  fx_usd_xof: number
  margin_rate: number
  rounding_step: number
  price_floor_xof: number
}

export interface ServicePricing {
  margin_override: number | null
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
  const raw = costUsd * settings.fx_usd_xof * (1 + margin)
  const rounded = Math.ceil(raw / settings.rounding_step) * settings.rounding_step
  return Math.max(rounded, settings.price_floor_xof)
}
