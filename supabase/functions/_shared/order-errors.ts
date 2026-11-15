// Erreurs métier NF_* renvoyées par les RPC de commande → réponse HTTP avec message français.

export interface RpcErrorLike {
  message?: string | null
  details?: string | null
  code?: string | null
}

export interface OrderErrorResponse {
  status: number
  body: { error: string; message: string; [key: string]: unknown }
  /** Erreur inattendue (à journaliser en détail côté serveur). */
  unexpected: boolean
}

const MAP: Record<string, { status: number; error: string; message: string }> = {
  NF_INSUFFICIENT_BALANCE: {
    status: 402,
    error: 'insufficient_balance',
    message: 'Votre solde est insuffisant pour ce numéro. Rechargez votre compte puis réessayez.',
  },
  NF_PRICE_CHANGED: {
    status: 409,
    error: 'price_changed',
    message: 'Le prix de ce numéro vient de changer. Vérifiez le nouveau prix puis confirmez à nouveau.',
  },
  NF_NO_STOCK: {
    status: 409,
    error: 'no_stock',
    message: "Aucun numéro n'est disponible pour ce service dans ce pays. Essayez un autre pays.",
  },
  NF_SERVICE_UNAVAILABLE: { status: 409, error: 'service_unavailable', message: "Ce service n'est pas disponible pour le moment." },
  NF_COUNTRY_UNAVAILABLE: { status: 409, error: 'country_unavailable', message: "Ce pays n'est pas disponible pour le moment." },
  NF_ACCOUNT_BLOCKED: {
    status: 403,
    error: 'forbidden',
    message: 'Votre compte ne permet pas cette opération. Contactez le support.',
  },
  NF_PROFILE_NOT_FOUND: {
    status: 403,
    error: 'forbidden',
    message: 'Votre compte ne permet pas cette opération. Contactez le support.',
  },
  NF_MAX_ACTIVE_ORDERS: {
    status: 429,
    error: 'max_active_orders',
    message: 'Vous avez déjà le nombre maximum de numéros en attente de SMS. Attendez un code ou annulez une commande avant d’en acheter un autre.',
  },
  NF_IDEMPOTENCY_CONFLICT: { status: 409, error: 'idempotency_conflict', message: 'Cette demande a déjà été utilisée. Veuillez recommencer.' },
  NF_CANCEL_TOO_EARLY: {
    status: 429,
    error: 'cancel_too_early',
    message: 'Vous pourrez annuler cette commande dans quelques instants.',
  },
  NF_CANCEL_LIMIT_REACHED: {
    status: 429,
    error: 'cancel_limit_reached',
    message: 'Vous avez atteint la limite d’annulations pour l’heure en cours. Réessayez plus tard.',
  },
  NF_CANCEL_NOT_PENDING: { status: 409, error: 'not_cancelable', message: 'Cette commande ne peut plus être annulée.' },
  NF_HAS_SMS: { status: 409, error: 'has_sms', message: 'Un SMS a déjà été reçu : la commande ne peut plus être annulée.' },
  NF_NOT_ASSIGNED: {
    status: 409,
    error: 'not_assigned',
    message: 'Le numéro n’a pas encore été attribué. Patientez quelques secondes.',
  },
  NF_NOT_FOUND: { status: 404, error: 'not_found', message: 'Commande introuvable.' },
}

const GENERIC = { status: 500, error: 'internal_error', message: 'Une erreur est survenue. Réessayez.' }

/** Données publiques jointes à certaines erreurs (nouveau prix, délai avant annulation, plafond). */
function publicDetails(code: string, details: string | null | undefined): Record<string, unknown> {
  if (!details) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(details)
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object') return {}
  const d = parsed as Record<string, unknown>
  const int = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined)
  const pick: Record<string, unknown> = {}
  if (code === 'NF_PRICE_CHANGED' && int(d.price_xof) !== undefined) pick.price_xof = d.price_xof
  if (code === 'NF_INSUFFICIENT_BALANCE') {
    if (int(d.price_xof) !== undefined) pick.price_xof = d.price_xof
    if (int(d.balance_xof) !== undefined) pick.balance_xof = d.balance_xof
  }
  if (code === 'NF_CANCEL_TOO_EARLY' && int(d.retry_after_seconds) !== undefined) pick.retry_after_seconds = d.retry_after_seconds
  if ((code === 'NF_CANCEL_LIMIT_REACHED' || code === 'NF_MAX_ACTIVE_ORDERS') && int(d.max) !== undefined) pick.max = d.max
  return pick
}

export function orderErrorResponse(err: RpcErrorLike | null | undefined): OrderErrorResponse {
  const code = (err?.message ?? '').trim()
  const known = MAP[code]
  if (!known) return { status: GENERIC.status, body: { error: GENERIC.error, message: GENERIC.message }, unexpected: true }
  return {
    status: known.status,
    body: { error: known.error, message: known.message, ...publicDetails(code, err?.details) },
    unexpected: false,
  }
}
