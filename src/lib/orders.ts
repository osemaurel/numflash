import type { OrderStatus } from '@/hooks/useOrders'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'En attente',
  received: 'Code reçu',
  finished: 'Terminé',
  canceled: 'Annulé',
  timeout: 'Expiré',
  banned: 'Numéro refusé',
  refunded: 'Remboursé',
}

export type PlaceOrderResult = { ok: true; orderId: string } | { ok: false; message: string }

/**
 * Achat d'un numéro avec le solde.
 * Le moteur d'achat (débit atomique, commande 5sim, réception des SMS) n'est pas encore en place :
 * aucun débit n'est effectué tant qu'il n'est pas activé.
 */
export async function placeOrder(_selection: { service: string; country: string }): Promise<PlaceOrderResult> {
  return {
    ok: false,
    message: 'L’achat en ligne n’est pas encore ouvert : il sera activé très prochainement. Votre solde n’a pas été débité.',
  }
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
