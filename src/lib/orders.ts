import type { OrderStatus } from '@/hooks/useOrders'
import { formatFCFA } from '@/lib/utils'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'En attente',
  received: 'Code reçu',
  finished: 'Terminé',
  canceled: 'Annulé',
  timeout: 'Expiré',
  banned: 'Numéro refusé',
  refunded: 'Remboursé',
}

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string; code?: string; priceXof?: number; refunded?: boolean }

export type OrderActionResult = { ok: true; status: OrderStatus; refunded: boolean } | { ok: false; message: string; code?: string }

export interface ErrorBody {
  error?: unknown
  message?: unknown
  price_xof?: unknown
  retry_after_seconds?: unknown
  refunded?: unknown
}

export const NETWORK_ERROR = 'Connexion impossible. Vérifiez votre connexion internet et réessayez.'

export const safeInt = (v: unknown) => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined)

/** Message affiché pour un achat refusé ; le nouveau prix est mis en forme côté client (formatFCFA). */
export function purchaseErrorMessage(body: ErrorBody | null | undefined): string {
  const price = safeInt(body?.price_xof)
  if (body?.error === 'price_changed' && price !== undefined) {
    return `Le prix de ce numéro vient de changer : il est maintenant de ${formatFCFA(price)}. Confirmez pour payer ce nouveau prix.`
  }
  return typeof body?.message === 'string' && body.message ? body.message : 'L’achat n’a pas pu aboutir. Réessayez.'
}

/** Message affiché pour une annulation ou une fin de commande refusée. */
export function actionErrorMessage(body: ErrorBody | null | undefined): string {
  const wait = safeInt(body?.retry_after_seconds)
  if (body?.error === 'cancel_too_early' && wait !== undefined) return `Vous pourrez annuler cette commande dans ${mmss(wait)}.`
  return typeof body?.message === 'string' && body.message ? body.message : 'L’opération n’a pas pu aboutir. Réessayez.'
}

/** « 4:05 » à partir d'un nombre de secondes. */
export function mmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** « il y a 3 min », « aujourd’hui, 10:05 », « hier, 18:42 », « 12 nov., 09:15 ». */
export function relativeTime(iso: string, now = Date.now()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Math.round((now - d.getTime()) / 1000)
  if (diff < 60) return 'à l’instant'
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  const today = new Date(now)
  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (sameDay(d, today)) return `aujourd’hui, ${timeFormatter.format(d)}`
  const yesterday = new Date(now - 86_400_000)
  if (sameDay(d, yesterday)) return `hier, ${timeFormatter.format(d)}`
  return `${dayFormatter.format(d)}, ${timeFormatter.format(d)}`
}
