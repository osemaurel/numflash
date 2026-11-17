import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/pixel'

/*
 * Numéro WhatsApp du support, fixé par l'administrateur (Réglages). Lu une seule fois par visite
 * (RPC publique support_contact) ; tant qu'aucun numéro n'est fixé, aucun lien n'est affiché.
 */

export const SUPPORT_DEFAULT_TEXT = 'Bonjour, j’ai besoin d’aide avec Numflash.'

/** Même règle que la base : « +229 97 12-34-56 », « 00229… » → « +22997123456 ». Null si invalide. */
export function normalizeWhatsapp(input: string): string | null {
  let v = input.trim().replace(/[\s().-]/g, '')
  if (v.startsWith('00')) v = `+${v.slice(2)}`
  return /^\+[1-9]\d{7,14}$/.test(v) ? v : null
}

/** Lien qui ouvre une conversation WhatsApp avec le support, message prérempli. */
export function whatsappUrl(number: string, text: string = SUPPORT_DEFAULT_TEXT): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/** « +22997123456 » → « +229 97 12 34 56 » (affichage seulement). */
export function displayWhatsapp(number: string): string {
  const digits = number.replace(/\D/g, '')
  const rest = digits.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')
  return `+${digits.slice(0, 3)} ${rest}`.trim()
}

let cached: string | null | undefined
let pending: Promise<string | null> | null = null

export function loadSupportNumber(): Promise<string | null> {
  if (cached !== undefined) return Promise.resolve(cached)
  pending ??= Promise.resolve(supabase.rpc('support_contact')).then(({ data, error }) => {
    pending = null
    if (error) return null // Nouvel essai à la prochaine demande.
    const number = typeof (data as { whatsapp?: unknown } | null)?.whatsapp === 'string' ? (data as { whatsapp: string }).whatsapp : null
    cached = number
    return number
  })
  return pending
}

/** Oublie le numéro en mémoire (après une modification dans les Réglages). */
export function resetSupportNumber() {
  cached = undefined
  pending = null
}

/** Numéro du support : undefined pendant le chargement, null si aucun numéro n'est fixé. */
export function useSupportNumber(): string | null | undefined {
  const [number, setNumber] = useState<string | null | undefined>(cached)
  useEffect(() => {
    if (cached !== undefined) return
    let active = true
    void loadSupportNumber().then((n) => active && setNumber(n))
    return () => {
      active = false
    }
  }, [])
  return number
}

/** Lien WhatsApp du support, ou null tant qu'aucun numéro n'est disponible. */
export function useSupportUrl(text?: string): string | null {
  const number = useSupportNumber()
  return number ? whatsappUrl(number, text) : null
}

/** À appeler au clic sur un lien de support (suivi « Contact » du pixel). */
export function trackSupportClick(where: string) {
  track('Contact', { content_name: 'Support WhatsApp', content_category: where })
}
