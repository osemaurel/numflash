/**
 * Destination après connexion ou inscription (`?redirect=`).
 * Seuls les chemins internes sont acceptés : une URL externe ou « //hote » ferait de la
 * page de connexion une redirection ouverte vers un site tiers.
 */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw || raw.length > 512) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null
  // Caractères de contrôle et antislash : refusés (certains navigateurs les normalisent en « / »).
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return null
  // Pas de retour vers les pages d'authentification elles-mêmes.
  const path = raw.split(/[?#]/)[0]
  if (path === '/connexion' || path === '/inscription') return null
  return raw
}

/** Ajoute `?redirect=` à une page d'authentification, si la destination est valide. */
export function withRedirect(authPath: '/connexion' | '/inscription', target: string | null | undefined): string {
  const safe = safeRedirect(target)
  return safe ? `${authPath}?redirect=${encodeURIComponent(safe)}` : authPath
}

/** Page d'achat présélectionnée (service, pays), destination après connexion depuis la landing. */
export function purchasePath(serviceSlug: string, countryCode: string): string {
  return `/acheter?service=${encodeURIComponent(serviceSlug)}&pays=${encodeURIComponent(countryCode)}`
}

/** Service d'un achat en attente (« /acheter?service=whatsapp… » ou ancien « /service/whatsapp »). */
export function pendingServiceSlug(target: string | null | undefined): string | null {
  if (!target) return null
  const legacy = target.match(/^\/service\/([a-z0-9_-]+)/i)
  if (legacy) return legacy[1]
  if (!target.startsWith('/acheter')) return null
  const slug = new URLSearchParams(target.split('?')[1] ?? '').get('service')
  return slug && /^[a-z0-9_-]+$/i.test(slug) ? slug : null
}
