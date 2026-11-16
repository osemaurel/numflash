// Page de paiement Numflash : frais estimés, pays détecté, réseaux Mobile Money.
// Logique pure (testée par Vitest). Aucun montant n'est calculé en flottant.

export interface FeeTier {
  min: string
  max: string | null
  percent: string
  fixed: string
  floor: string
  cap: string | null
  mode: 'ADD_ON' | 'DEDUCTED'
}

export interface PaymentNetwork {
  code: string
  name: string
  otp_required: boolean
  otp_instructions: string | null
  confirm_otp: boolean
  fees: FeeTier[]
}

export interface PaymentCountry {
  code: string
  name: string
  currency: string
  networks: PaymentNetwork[]
}

/** « 3.9 » → 3900 (millièmes), sans passer par un flottant. */
function toMilli(value: string): number | null {
  const m = /^(\d{1,12})(?:\.(\d{1,6}))?$/.exec(value.trim())
  if (!m) return null
  const frac = (m[2] ?? '').padEnd(3, '0').slice(0, 3)
  const n = Number(m[1]) * 1000 + Number(frac)
  return Number.isSafeInteger(n) ? n : null
}

export interface FeeEstimate {
  /** Frais ajoutés au montant (0 si offerts ou inconnus). */
  fee: number
  /** Total débité sur le compte Mobile Money. */
  total: number
  /** Frais connus d'après le barème de l'opérateur. */
  known: boolean
}

/**
 * Frais estimés : montant × pourcentage + fixe, bornés par le plancher et le plafond, arrondis
 * au franc supérieur. Ils ne s'ajoutent au total que si le barème les met à la charge du client.
 */
export function estimateFee(amount: number, tiers: FeeTier[]): FeeEstimate {
  const amountMilli = amount * 1000
  const tier = tiers.find((t) => {
    const min = toMilli(t.min)
    const max = t.max == null ? null : toMilli(t.max)
    return min !== null && amountMilli >= min && (max === null || amountMilli <= max)
  })
  if (!tier) return { fee: 0, total: amount, known: false }
  const percent = toMilli(tier.percent)
  const fixed = toMilli(tier.fixed)
  const floor = toMilli(tier.floor)
  const cap = tier.cap == null ? null : toMilli(tier.cap)
  if (percent === null || fixed === null || floor === null) return { fee: 0, total: amount, known: false }
  // amount × percent / 100, en millièmes de franc : amount × percentMilli / 100.
  let feeMilli = Math.ceil((amount * percent) / 100) + fixed
  feeMilli = Math.max(feeMilli, floor)
  if (cap !== null) feeMilli = Math.min(feeMilli, cap)
  const fee = Math.ceil(feeMilli / 1000)
  if (tier.mode === 'DEDUCTED') return { fee: 0, total: amount, known: true }
  return { fee, total: amount + fee, known: true }
}

/** Instructions SasPay : « *144*4*6*{amount}# » reçoit le montant réellement débité. */
export function fillOtpInstructions(text: string, total: number): string {
  return text.replace(/\{amount\}/g, String(total))
}

const DIAL: Record<string, string> = {
  BJ: '+229', BF: '+226', CI: '+225', ML: '+223', NE: '+227', SN: '+221', TG: '+228', GW: '+245',
  CM: '+237', CG: '+242', GA: '+241', TD: '+235', CF: '+236', GQ: '+240',
}

export function dialCode(country: string): string | null {
  return DIAL[country] ?? null
}

const FLAGS_A = 0x1f1e6
/** Drapeau emoji à partir du code ISO (« BJ » → 🇧🇯). */
export function flag(country: string): string {
  if (!/^[A-Z]{2}$/.test(country)) return '🌐'
  return String.fromCodePoint(FLAGS_A + country.charCodeAt(0) - 65, FLAGS_A + country.charCodeAt(1) - 65)
}

// Fuseaux horaires des pays proposés : le navigateur les connaît sans demander la localisation.
const TIMEZONES: Record<string, string> = {
  'Africa/Porto-Novo': 'BJ',
  'Africa/Ouagadougou': 'BF',
  'Africa/Abidjan': 'CI',
  'Africa/Bamako': 'ML',
  'Africa/Niamey': 'NE',
  'Africa/Dakar': 'SN',
  'Africa/Lome': 'TG',
  'Africa/Bissau': 'GW',
  'Africa/Douala': 'CM',
  'Africa/Brazzaville': 'CG',
  'Africa/Libreville': 'GA',
  'Africa/Ndjamena': 'TD',
  'Africa/Bangui': 'CF',
  'Africa/Malabo': 'GQ',
}

/**
 * Pays proposé par défaut : celui du numéro du profil, sinon du fuseau horaire, sinon de la langue
 * du navigateur, sinon le premier disponible.
 */
export function detectCountry(
  available: string[],
  hints: { profilePhone?: string | null; timeZone?: string | null; languages?: readonly string[] },
): string | null {
  const ok = (c: string | null | undefined) => (c && available.includes(c) ? c : null)
  const phone = (hints.profilePhone ?? '').replace(/[\s.-]/g, '')
  if (phone.startsWith('+')) {
    const byDial = Object.entries(DIAL).find(([, d]) => phone.startsWith(d))?.[0]
    if (ok(byDial)) return byDial!
  }
  const byZone = hints.timeZone ? TIMEZONES[hints.timeZone] : undefined
  if (ok(byZone)) return byZone!
  for (const lang of hints.languages ?? []) {
    const region = lang.split('-')[1]?.toUpperCase()
    if (ok(region)) return region!
  }
  return available[0] ?? null
}

/** Numéro local saisi → format international (« 97 12 34 56 » → « +22997123456 »), ou null. */
export function toE164(country: string, raw: string): string | null {
  const compact = raw.replace(/[\s.\-()]/g, '')
  const dial = dialCode(country)
  if (compact.startsWith('+')) {
    if (!/^\+[1-9][0-9]{7,14}$/.test(compact)) return null
    return dial && !compact.startsWith(dial) ? null : compact
  }
  if (!dial) return null
  const local = compact.replace(/^00/, '')
  const withoutDial = local.startsWith(dial.slice(1)) && local.length > 10 ? local.slice(dial.length - 1) : local
  if (!/^[0-9]{6,12}$/.test(withoutDial)) return null
  const full = `${dial}${withoutDial}`
  return /^\+[1-9][0-9]{7,14}$/.test(full) ? full : null
}

/** Partie locale d'un numéro international du même pays (pour préremplir). */
export function localPart(country: string, e164: string | null | undefined): string {
  const dial = dialCode(country)
  if (!e164 || !dial || !e164.startsWith(dial)) return ''
  return e164.slice(dial.length)
}

/** « Awa Koné Traoré » → prénom « Awa », nom « Koné Traoré ». */
export function splitFullName(full: string | null | undefined): { first: string; last: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

/** Couleur de repère d'un réseau (pastille avec initiale ; pas de logo d'opérateur). */
export function networkStyle(code: string, name: string): { bg: string; fg: string; letter: string } {
  const c = code.toLowerCase()
  if (c.startsWith('mtn')) return { bg: '#FFCB05', fg: '#1A1A1A', letter: 'M' }
  if (c.startsWith('orange')) return { bg: '#FF7900', fg: '#FFFFFF', letter: 'O' }
  if (c.startsWith('moov')) return { bg: '#0066B3', fg: '#FFFFFF', letter: 'M' }
  if (c.startsWith('wave')) return { bg: '#1DC8F2', fg: '#FFFFFF', letter: 'W' }
  if (c.startsWith('airtel')) return { bg: '#E40000', fg: '#FFFFFF', letter: 'A' }
  if (c.startsWith('free')) return { bg: '#CD0067', fg: '#FFFFFF', letter: 'F' }
  if (c.startsWith('celtiis')) return { bg: '#7B2CBF', fg: '#FFFFFF', letter: 'C' }
  if (c.startsWith('djamo')) return { bg: '#111111', fg: '#FFFFFF', letter: 'D' }
  if (c.startsWith('wizall')) return { bg: '#F39200', fg: '#FFFFFF', letter: 'W' }
  if (c.startsWith('expresso')) return { bg: '#00A0DF', fg: '#FFFFFF', letter: 'E' }
  return { bg: '#0085EE', fg: '#FFFFFF', letter: (name.trim().charAt(0) || '?').toUpperCase() }
}

/** Réseaux qui valident sur leur propre page (redirection) plutôt que par une demande sur le téléphone. */
export function isRedirectNetwork(code: string): boolean {
  return /^(wave|djamo|paydunya)/.test(code)
}

const NETWORK_NAMES: [RegExp, string][] = [
  [/^mtn/, 'MTN MoMo'],
  [/^moov/, 'Moov Money'],
  [/^orange/, 'Orange Money'],
  [/^wave/, 'Wave'],
  [/^celtiis/, 'Celtiis Cash'],
  [/^airtel/, 'Airtel Money'],
  [/^freemoney/, 'Free Money'],
  [/^expresso/, 'Expresso'],
  [/^wizall/, 'Wizall'],
  [/^djamo/, 'Djamo'],
  [/^mobi_cash/, 'Mobi Cash'],
  [/^paydunya/, 'PayDunya'],
]

/** Nom lisible d'un réseau à partir de son code (« mtn_bj » → « MTN MoMo »). */
export function networkLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return NETWORK_NAMES.find(([re]) => re.test(code))?.[1] ?? code
}
