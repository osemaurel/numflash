// Conversions FCFA ↔ chaînes décimales SasPay ("5000.00"), sans jamais passer par un flottant.

const DECIMAL_RE = /^(\d+)(?:\.(\d+))?$/

export function xofToDecimalString(amountXof: number): string {
  if (!Number.isSafeInteger(amountXof) || amountXof < 0) {
    throw new Error(`invalid XOF amount: ${amountXof}`)
  }
  return `${amountXof}.00`
}

// Compare deux montants à 4 décimales maximum (soldes fournisseur, seuils) sans arithmétique flottante.
export function compareDecimal(a: number, b: number): -1 | 0 | 1 {
  const scaled = (n: number) => {
    const fixed = n.toFixed(4)
    if (!/^-?\d+\.\d{4}$/.test(fixed)) throw new Error(`invalid decimal: ${n}`)
    return BigInt(fixed.replace('.', ''))
  }
  const x = scaled(a)
  const y = scaled(b)
  return x < y ? -1 : x > y ? 1 : 0
}

// Le franc CFA n'a pas de sous-unité : toute partie décimale non nulle est rejetée.
export function decimalToXof(value: unknown): number {
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && value >= 0) return value
    throw new Error(`invalid XOF amount: ${value}`)
  }
  if (typeof value !== 'string') {
    throw new Error('XOF amount must be a string or an integer')
  }
  const match = DECIMAL_RE.exec(value.trim())
  if (!match) throw new Error(`invalid decimal string: ${value}`)
  const [, intPart, fracPart = ''] = match
  if (/[^0]/.test(fracPart)) throw new Error(`XOF amount has a fractional part: ${value}`)
  const n = Number(intPart)
  if (!Number.isSafeInteger(n)) throw new Error(`XOF amount out of range: ${value}`)
  return n
}
