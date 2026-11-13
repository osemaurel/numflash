// Traduit les codes NF_* renvoyés par les RPC d'administration en messages français.

const SETTING_LABELS: Record<string, string> = {
  fx_usd_xof: 'Taux USD → FCFA',
  margin_rate: 'Marge',
  margin_override: 'Marge spécifique',
  rounding_step: "Pas d'arrondi",
  price_floor_xof: 'Prix plancher',
  topup_tiers: 'Paliers de recharge',
  max_cancels_per_hour: "Annulations max. par heure",
  min_seconds_before_cancel: 'Délai minimum avant annulation',
  max_active_orders: 'Commandes en attente max.',
  fivesim_low_balance_threshold: "Seuil d'alerte du solde 5sim",
  cancel_ratio_alert_threshold: "Seuil d'alerte d'annulation",
  cancel_ratio_window: 'Fenêtre de calcul',
  report_timezone: 'Fuseau horaire',
  amount_xof: 'Montant',
  name_fr: 'Nom',
  sort_order: "Ordre d'affichage",
}

const MESSAGES: Record<string, string> = {
  NF_FORBIDDEN: 'Accès réservé aux administrateurs.',
  NF_NOT_FOUND: 'Élément introuvable.',
  NF_INVALID_INPUT: 'Requête invalide.',
  NF_UNKNOWN_SETTING: 'Réglage inconnu.',
  NF_REASON_REQUIRED: 'Indiquez un motif d’au moins 5 caractères.',
  NF_CANNOT_TARGET_SELF: 'Cette action ne peut pas viser votre propre compte.',
  NF_INSUFFICIENT_BALANCE: 'Le solde de l’utilisateur ne permet pas ce débit.',
}

export interface RpcError {
  message?: string
  details?: string | null
}

export function translateAdminError(error: RpcError | null | undefined): string {
  const code = error?.message ?? ''
  if (code === 'NF_INVALID_VALUE') {
    const label = SETTING_LABELS[error?.details ?? '']
    return label ? `Valeur invalide pour « ${label} ».` : 'Valeur invalide.'
  }
  return MESSAGES[code] ?? 'Une erreur est survenue. Réessayez.'
}
