// Logique pure du moteur d'achat : lecture des réponses 5sim et décisions de synchronisation.
// Aucune dépendance au runtime : testée par Vitest, utilisée par les Edge Functions.

import { z } from 'zod'

export const PROVIDER_STATUSES = ['PENDING', 'RECEIVED', 'CANCELED', 'TIMEOUT', 'FINISHED', 'BANNED'] as const
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number]
const TERMINAL: ProviderStatus[] = ['CANCELED', 'TIMEOUT', 'FINISHED', 'BANNED']

export type LocalStatus = 'pending' | 'received' | 'finished' | 'canceled' | 'timeout' | 'banned' | 'refunded'

const Text = z.string().max(4000).nullish()

const SmsSchema = z
  .object({
    created_at: Text,
    date: Text,
    sender: Text,
    text: Text,
    code: z.union([z.string().max(200), z.number()]).nullish(),
  })
  .passthrough()

const OrderSchema = z
  .object({
    id: z.union([z.number().int().positive(), z.string().regex(/^\d{1,15}$/)]),
    phone: z.string().trim().min(3).max(32),
    operator: Text,
    product: Text,
    price: z.number().finite().nonnegative().max(100_000),
    status: z.string().trim().min(1).max(32),
    expires: Text,
    created_at: Text,
    country: Text,
    sms: z.array(SmsSchema).max(50).nullish(),
  })
  .passthrough()

export interface ProviderSms {
  created_at: string | null
  date: string | null
  sender: string | null
  text: string | null
  code: string | null
}

export interface ProviderOrder {
  id: number
  phone: string
  operator: string | null
  /** Coût fournisseur à 4 décimales, en chaîne : jamais d'arithmétique flottante. */
  costUsd: string
  status: ProviderStatus
  expiresAt: string | null
  sms: ProviderSms[]
}

/** Valide une commande renvoyée par 5sim (achat, vérification, annulation, fin). Lève si la forme est inattendue. */
export function parseFivesimOrder(raw: unknown): ProviderOrder {
  const o = OrderSchema.parse(raw)
  const status = o.status.toUpperCase()
  if (!(PROVIDER_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`unknown 5sim status: ${o.status}`)
  }
  const id = typeof o.id === 'number' ? o.id : Number(o.id)
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`invalid 5sim order id: ${o.id}`)
  const expires = o.expires && !Number.isNaN(Date.parse(o.expires)) ? new Date(o.expires).toISOString() : null
  return {
    id,
    phone: o.phone,
    operator: o.operator ?? null,
    costUsd: o.price.toFixed(4),
    status: status as ProviderStatus,
    expiresAt: expires,
    sms: (o.sms ?? []).map((s) => ({
      created_at: s.created_at ?? null,
      date: s.date ?? null,
      sender: s.sender ?? null,
      text: s.text ?? null,
      code: s.code == null ? null : String(s.code),
    })),
  }
}

export function isTerminalProviderStatus(status: ProviderStatus): boolean {
  return TERMINAL.includes(status)
}

export interface LocalOrderState {
  id: string
  fivesim_order_id: number | null
  status: LocalStatus
  provider_status: string | null
  created_at: string
  expires_at: string | null
  sms_count: number
}

/** Une vérification n'apporte rien de nouveau : même statut fournisseur et aucun SMS de plus. */
export function isNoop(local: LocalOrderState, remote: ProviderOrder): boolean {
  return (local.provider_status ?? '').toUpperCase() === remote.status && remote.sms.length <= local.sms_count
}

/** Réservation sans numéro depuis trop longtemps (l'Edge Function d'achat a été interrompue). */
export function isStuckReservation(local: LocalOrderState, now: number, afterMs: number): boolean {
  return local.status === 'pending' && local.fivesim_order_id == null && now - Date.parse(local.created_at) > afterMs
}

/** Code reçu et délai dépassé : la commande est terminée chez nous si 5sim ne l'a pas encore fait. */
export function needsAutoFinish(local: LocalOrderState, now: number, graceMs: number): boolean {
  if (local.status !== 'received' || !local.expires_at) return false
  return now - Date.parse(local.expires_at) > graceMs
}

/** Statut local attendu pour un état 5sim (miroir de order_apply_provider_state, pour les tests et l'UI). */
export function expectedLocalStatus(remote: ProviderStatus, hasSms: boolean): LocalStatus {
  if (remote === 'PENDING' || remote === 'RECEIVED') return hasSms ? 'received' : 'pending'
  if (remote === 'FINISHED' || hasSms) return 'finished'
  if (remote === 'CANCELED') return 'canceled'
  if (remote === 'TIMEOUT') return 'timeout'
  return 'banned'
}
