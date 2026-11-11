// URL de retour après paiement : on ne fait confiance qu'aux origines connues du front,
// pour qu'une preview Vercel revienne sur elle-même sans ouvrir de redirection arbitraire.

const DEFAULT_APP_URL = 'https://numflash-rose.vercel.app'

const ALLOWED_ORIGINS: RegExp[] = [
  /^https:\/\/numflash-rose\.vercel\.app$/,
  /^https:\/\/numflash(-[a-z0-9-]+)?-osecapoch-gmailcoms-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d{2,5}$/,
]

export function resolveAppOrigin(requestOrigin: string | null, configured?: string | null): string {
  const fallback = (configured || DEFAULT_APP_URL).replace(/\/+$/, '')
  if (requestOrigin && ALLOWED_ORIGINS.some((re) => re.test(requestOrigin))) return requestOrigin
  return fallback
}

// '' = pas d'URL (flux push : validation sur le téléphone), null = URL suspecte à refuser.
export function sanitizeCheckoutUrl(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.hostname !== 'saspay.me' && !url.hostname.endsWith('.saspay.me')) return null
    return url.toString()
  } catch {
    return null
  }
}
