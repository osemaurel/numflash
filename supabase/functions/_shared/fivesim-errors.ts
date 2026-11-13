// Fonction unique de traduction des erreurs 5sim (chaînes brutes, pas du JSON) vers un message
// français destiné à l'utilisateur. Le code applicatif ne compare jamais le texte brut ailleurs.

const UNAVAILABLE = 'Le service est momentanément indisponible. Réessayez dans quelques minutes.'

const MESSAGES: Record<string, string> = {
  'no free phones': "Aucun numéro n'est disponible pour ce service dans ce pays. Essayez un autre pays.",
  // Solde ou note de notre compte 5sim insuffisants : on ne l'expose pas au client.
  'not enough user balance': UNAVAILABLE,
  'not enough rating': UNAVAILABLE,
  'server offline': UNAVAILABLE,
  'internal error': UNAVAILABLE,
  'select country': 'Veuillez choisir un pays.',
  'select operator': 'Veuillez choisir un opérateur.',
  'bad country': "Ce pays n'est pas disponible.",
  'country is incorrect': "Ce pays n'est pas disponible.",
  'bad operator': "Cet opérateur n'est pas disponible.",
  'no product': "Ce service n'est pas disponible.",
  'product is incorrect': "Ce service n'est pas disponible.",
  'order not found': 'Commande introuvable.',
  'record not found': 'Élément introuvable.',
  'order expired': 'Cette commande a expiré.',
  'order has sms': 'Impossible d’annuler : un SMS a déjà été reçu pour cette commande.',
  'hosting order': 'Cette opération n’est pas possible pour ce type de commande.',
  'reuse not possible': 'Ce numéro ne peut pas être réutilisé.',
  'reuse false': 'Ce numéro ne peut pas être réutilisé.',
  'reuse expired': 'Le délai de réutilisation de ce numéro est dépassé.',
}

const GENERIC = 'Le fournisseur a renvoyé une erreur. Réessayez dans quelques minutes.'

export function normalizeFivesimError(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^["']+|["']+$/g, '').trim().toLowerCase()
}

export function translateFivesimError(raw: string | null | undefined, httpStatus?: number): string {
  const key = normalizeFivesimError(raw)
  if (key && MESSAGES[key]) return MESSAGES[key]
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429 || (httpStatus ?? 0) >= 500) return UNAVAILABLE
  return GENERIC
}

// Erreurs qui signalent un problème de notre compte fournisseur, à remonter à l'équipe.
export function isFivesimAccountIssue(raw: string | null | undefined, httpStatus?: number): boolean {
  const key = normalizeFivesimError(raw)
  return key === 'not enough user balance' || key === 'not enough rating' || httpStatus === 401 || httpStatus === 403
}
