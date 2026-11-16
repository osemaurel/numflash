// Fonction unique de traduction des erreurs SasPay du paiement direct vers un message français.
// Les codes viennent de la documentation SasPay (POST /payments/softpay/, /confirm-otp/).

export interface SaspayErrorInfo {
  message: string
  /** Le paiement n'a pas pu partir : la recharge peut être close en échec. */
  final: boolean
}

const RETRY_LATER = 'Le paiement est momentanément indisponible. Réessayez dans quelques minutes.'

const BY_CODE: Record<string, SaspayErrorInfo> = {
  invalid_customer: { message: 'Vérifiez votre nom, votre e-mail et votre numéro de téléphone.', final: true },
  invalid_method: { message: 'Ce moyen de paiement n’est pas disponible pour le moment. Choisissez-en un autre.', final: true },
  missing_method: { message: 'Choisissez votre moyen de paiement.', final: true },
  invalid_country: { message: 'Ce pays n’est pas disponible pour le paiement. Choisissez-en un autre.', final: true },
  no_exchange_rate: { message: 'Ce pays n’est pas disponible pour le paiement. Choisissez-en un autre.', final: true },
  no_route_available: { message: 'Ce moyen de paiement est momentanément indisponible. Choisissez-en un autre ou réessayez plus tard.', final: true },
  prepayment_otp_missing: { message: 'Saisissez le code de paiement obtenu sur votre téléphone.', final: true },
  api_key_scope_forbidden: { message: RETRY_LATER, final: true },
  // Code de confirmation (après la demande de paiement).
  otp_confirmation_failed: { message: 'Code incorrect ou expiré. Vérifiez-le et réessayez.', final: false },
  otp_not_applicable: { message: 'Ce moyen de paiement ne demande pas de code : validez simplement sur votre téléphone.', final: false },
  not_pending: { message: 'Ce paiement est déjà traité.', final: false },
  no_gateway: { message: RETRY_LATER, final: false },
  no_attempt: { message: RETRY_LATER, final: false },
  not_found: { message: 'Paiement introuvable.', final: false },
}

export function describeSaspayError(code: string | null | undefined, httpStatus: number): SaspayErrorInfo {
  const known = code ? BY_CODE[code] : undefined
  if (known) return known
  if (httpStatus === 429) return { message: 'Trop de demandes de paiement. Réessayez dans une minute.', final: true }
  if (httpStatus === 409) return { message: 'Ce paiement est déjà en cours de traitement.', final: false }
  if (httpStatus === 401 || httpStatus === 403) return { message: RETRY_LATER, final: true }
  // Erreur serveur : la demande a pu aboutir chez SasPay, on ne la considère pas comme échouée.
  if (httpStatus >= 500) return { message: RETRY_LATER, final: false }
  return { message: 'Le paiement a été refusé. Vérifiez vos informations puis réessayez.', final: true }
}
