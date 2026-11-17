/*
 * Pixel Meta (Facebook / Instagram) : suivi des pages vues et des étapes clés du parcours.
 * Le code de base est dans index.html (premier PageView). Ici : PageView à chaque changement de
 * page (application monopage) et évènements standard. L'administration n'est jamais suivie.
 *
 * Montants : Meta ne prend pas en charge le franc CFA (XOF). La valeur est envoyée en euros à la
 * parité fixe (1 € = 655,957 FCFA), calculée en entiers (aucun flottant), sous forme de chaîne
 * décimale ; le montant FCFA d'origine part aussi, dans `value_xof`.
 */

type Fbq = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

export type StandardEvent =
  | 'PageView'
  | 'CompleteRegistration'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Contact'
  | 'Lead'

/** 1 € = 655,957 FCFA (parité fixe), exprimé en millièmes de FCFA. */
const XOF_MILLI_PER_EUR = 655_957n

/** Montant FCFA entier → euros à 2 décimales, arrondi au centime le plus proche (« 7.62 »). */
export function xofToEur(amountXof: number): string {
  if (!Number.isSafeInteger(amountXof)) throw new Error('Montant FCFA entier attendu')
  const negative = amountXof < 0
  const xof = BigInt(Math.abs(amountXof))
  // centimes = xof × 100 × 1000 / 655 957, arrondi au plus proche (demi vers le haut).
  const cents = (xof * 100_000n * 2n + XOF_MILLI_PER_EUR) / (XOF_MILLI_PER_EUR * 2n)
  const whole = cents / 100n
  const frac = (cents % 100n).toString().padStart(2, '0')
  return `${negative && cents > 0n ? '-' : ''}${whole}.${frac}`
}

/** Paramètres d'un montant pour Meta (devise prise en charge + montant FCFA d'origine). */
export function moneyParams(amountXof: number): { value: string; currency: 'EUR'; value_xof: number } {
  return { value: xofToEur(amountXof), currency: 'EUR', value_xof: amountXof }
}

export function isTrackedPath(pathname: string): boolean {
  return !(pathname === '/admin' || pathname.startsWith('/admin/'))
}

function fbq(): Fbq | null {
  if (typeof window === 'undefined') return null
  if (!isTrackedPath(window.location.pathname)) return null
  return typeof window.fbq === 'function' ? window.fbq : null
}

/** Évènement standard. `eventID` : identifiant unique pour éviter les doublons côté Meta. */
export function track(event: StandardEvent, params?: Record<string, unknown>, eventID?: string) {
  try {
    const f = fbq()
    if (!f) return
    if (eventID) f('track', event, params ?? {}, { eventID })
    else if (params) f('track', event, params)
    else f('track', event)
  } catch {
    // Le suivi ne doit jamais casser l'application.
  }
}

/** Évènement personnalisé (ex. achat d'un numéro avec le solde). */
export function trackCustom(name: string, params?: Record<string, unknown>, eventID?: string) {
  try {
    const f = fbq()
    if (!f) return
    if (eventID) f('trackCustom', name, params ?? {}, { eventID })
    else f('trackCustom', name, params ?? {})
  } catch {
    // Idem.
  }
}

/** N'envoie l'évènement qu'une fois par clé sur cet appareil (ex. un achat confirmé). */
export function trackOnce(key: string, send: () => void) {
  const storageKey = `nf_px_${key}`
  try {
    if (window.localStorage.getItem(storageKey)) return
    window.localStorage.setItem(storageKey, '1')
  } catch {
    // Stockage indisponible (navigation privée) : on envoie quand même, avec un eventID pour dédoublonner.
  }
  send()
}
