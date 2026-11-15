// Fonction unique de traduction des erreurs 5sim (chaînes brutes, pas du JSON) vers un message
// français destiné à l'utilisateur, avec une catégorie (kind) sur laquelle le code applicatif
// peut brancher. Le texte brut n'est comparé nulle part ailleurs.

export type FivesimErrorKind =
  | 'no_numbers' // plus de numéro pour ce service, ce pays et cet opérateur
  | 'bad_operator' // opérateur inconnu ou retiré : on peut essayer le suivant
  | 'account' // problème de notre compte fournisseur (solde, note, clé)
  | 'unavailable' // panne ou surcharge du fournisseur
  | 'has_sms' // la commande a déjà reçu un SMS
  | 'expired' // la commande a expiré
  | 'not_found' // commande inconnue du fournisseur
  | 'invalid' // pays ou service refusés
  | 'reuse' // réutilisation impossible
  | 'unknown'

export interface FivesimErrorInfo {
  kind: FivesimErrorKind
  message: string
}

const UNAVAILABLE = 'Le service est momentanément indisponible. Réessayez dans quelques minutes.'
const GENERIC = 'Le fournisseur a renvoyé une erreur. Réessayez dans quelques minutes.'

const KNOWN: Record<string, FivesimErrorInfo> = {
  'no free phones': { kind: 'no_numbers', message: "Aucun numéro n'est disponible pour ce service dans ce pays. Essayez un autre pays." },
  // Solde ou note de notre compte 5sim insuffisants : on ne l'expose pas au client.
  'not enough user balance': { kind: 'account', message: UNAVAILABLE },
  'not enough rating': { kind: 'account', message: UNAVAILABLE },
  'server offline': { kind: 'unavailable', message: UNAVAILABLE },
  'internal error': { kind: 'unavailable', message: UNAVAILABLE },
  'select country': { kind: 'invalid', message: 'Veuillez choisir un pays.' },
  'select operator': { kind: 'bad_operator', message: 'Veuillez choisir un opérateur.' },
  'bad country': { kind: 'invalid', message: "Ce pays n'est pas disponible." },
  'country is incorrect': { kind: 'invalid', message: "Ce pays n'est pas disponible." },
  'bad operator': { kind: 'bad_operator', message: "Cet opérateur n'est pas disponible." },
  'no product': { kind: 'invalid', message: "Ce service n'est pas disponible." },
  'product is incorrect': { kind: 'invalid', message: "Ce service n'est pas disponible." },
  'order not found': { kind: 'not_found', message: 'Commande introuvable.' },
  'record not found': { kind: 'not_found', message: 'Élément introuvable.' },
  'order expired': { kind: 'expired', message: 'Cette commande a expiré.' },
  'order has sms': { kind: 'has_sms', message: 'Impossible d’annuler : un SMS a déjà été reçu pour cette commande.' },
  'hosting order': { kind: 'invalid', message: 'Cette opération n’est pas possible pour ce type de commande.' },
  'reuse not possible': { kind: 'reuse', message: 'Ce numéro ne peut pas être réutilisé.' },
  'reuse false': { kind: 'reuse', message: 'Ce numéro ne peut pas être réutilisé.' },
  'reuse expired': { kind: 'reuse', message: 'Le délai de réutilisation de ce numéro est dépassé.' },
}

export function normalizeFivesimError(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^["']+|["']+$/g, '').trim().toLowerCase()
}

/** Catégorie et message français d'une erreur 5sim brute. */
export function describeFivesimError(raw: string | null | undefined, httpStatus?: number): FivesimErrorInfo {
  const key = normalizeFivesimError(raw)
  if (key && KNOWN[key]) return KNOWN[key]
  if (httpStatus === 401 || httpStatus === 403) return { kind: 'account', message: UNAVAILABLE }
  if (httpStatus === 429 || (httpStatus ?? 0) >= 500) return { kind: 'unavailable', message: UNAVAILABLE }
  if (httpStatus === 404) return { kind: 'not_found', message: 'Commande introuvable.' }
  return { kind: 'unknown', message: GENERIC }
}

export function translateFivesimError(raw: string | null | undefined, httpStatus?: number): string {
  return describeFivesimError(raw, httpStatus).message
}

// Erreurs qui signalent un problème de notre compte fournisseur, à remonter à l'équipe.
export function isFivesimAccountIssue(raw: string | null | undefined, httpStatus?: number): boolean {
  return describeFivesimError(raw, httpStatus).kind === 'account'
}
