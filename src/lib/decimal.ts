// Conversions décimales sans flottant pour les formulaires d'administration.
// Les taux sont stockés en fraction à 4 décimales (0.3050) et saisis en pourcentage (30,5).

const PERCENT_RE = /^(\d{1,3})(?:[.,](\d{1,2}))?$/

// "30,5" → "0.305" ; null si la saisie n'est pas un pourcentage à 2 décimales maximum.
export function percentToFraction(input: string): string | null {
  const match = PERCENT_RE.exec(input.trim())
  if (!match) return null
  const [, intPart, fracPart = ''] = match
  // Pourcentage à l'échelle 10^2, soit la fraction à l'échelle 10^4.
  const scaled = Number(intPart) * 100 + Number(fracPart.padEnd(2, '0'))
  const whole = Math.floor(scaled / 10_000)
  const rest = String(scaled % 10_000).padStart(4, '0').replace(/0+$/, '')
  return rest ? `${whole}.${rest}` : String(whole)
}

// 0.305 → "30,5" (affichage français, 2 décimales maximum).
export function fractionToPercent(value: number): string {
  const [intPart, fracPart] = value.toFixed(4).split('.')
  const scaled = Number(intPart) * 10_000 + Number(fracPart)
  const whole = Math.floor(scaled / 100)
  const rest = String(scaled % 100).padStart(2, '0').replace(/0+$/, '')
  return rest ? `${whole},${rest}` : String(whole)
}

// Décimal positif à 4 décimales maximum, normalisé avec un point : "655,957" → "655.957".
export function normalizeDecimal(input: string): string | null {
  const value = input.trim().replace(',', '.')
  return /^\d+(\.\d{1,4})?$/.test(value) ? value : null
}

export function parseIntegerInput(input: string): number | null {
  const value = input.trim().replace(/[\s  ]/g, '')
  if (!/^\d{1,9}$/.test(value)) return null
  return Number(value)
}
