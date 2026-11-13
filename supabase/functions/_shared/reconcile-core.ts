// Rapprochement entre les commandes 5sim et la table orders. Logique pure, testable.

export type DbOrderStatus = 'pending' | 'received' | 'finished' | 'canceled' | 'timeout' | 'banned' | 'refunded'

export interface FivesimOrderLite {
  id: number | string
  status: string
  created_at: string
}

export interface DbOrderLite {
  id: string
  fivesim_order_id: number | string | null
  status: DbOrderStatus
  created_at: string
}

// Statuts locaux compatibles avec chaque statut 5sim. « refunded » est l'état final local
// après remboursement d'une commande annulée, expirée ou bannie.
const COMPATIBLE: Record<string, DbOrderStatus[]> = {
  PENDING: ['pending'],
  RECEIVED: ['received'],
  FINISHED: ['finished'],
  CANCELED: ['canceled', 'refunded'],
  TIMEOUT: ['timeout', 'refunded'],
  BANNED: ['banned', 'refunded'],
}

export interface StatusMismatch {
  order_id: string
  fivesim_order_id: string
  db_status: DbOrderStatus
  fivesim_status: string
}

export interface ReconcileResult {
  matched: number
  onlyInFivesim: Array<{ fivesim_order_id: string; status: string; created_at: string }>
  onlyInDb: Array<{ order_id: string; fivesim_order_id: string; status: DbOrderStatus; created_at: string }>
  statusMismatches: StatusMismatch[]
  stuckWithoutFivesimId: Array<{ order_id: string; status: DbOrderStatus; created_at: string }>
}

export interface ReconcileOptions {
  // Seuls les éléments créés à partir de `since` sont signalés ; les listes sont chargées
  // avec une marge avant `since` pour éviter les faux positifs en bordure de fenêtre.
  since: Date
  now: Date
  stuckAfterMs: number
}

export function isStatusCompatible(fivesimStatus: string, dbStatus: DbOrderStatus): boolean {
  return (COMPATIBLE[fivesimStatus.toUpperCase()] ?? []).includes(dbStatus)
}

export function reconcileOrders(
  fivesimOrders: FivesimOrderLite[],
  dbOrders: DbOrderLite[],
  opts: ReconcileOptions,
): ReconcileResult {
  const since = opts.since.getTime()
  const inWindow = (iso: string) => new Date(iso).getTime() >= since

  const fivesimById = new Map(fivesimOrders.map((o) => [String(o.id), o]))
  const dbByFivesimId = new Map<string, DbOrderLite>()
  const result: ReconcileResult = {
    matched: 0,
    onlyInFivesim: [],
    onlyInDb: [],
    statusMismatches: [],
    stuckWithoutFivesimId: [],
  }

  for (const order of dbOrders) {
    if (order.fivesim_order_id == null) {
      const age = opts.now.getTime() - new Date(order.created_at).getTime()
      if (inWindow(order.created_at) && age > opts.stuckAfterMs) {
        result.stuckWithoutFivesimId.push({ order_id: order.id, status: order.status, created_at: order.created_at })
      }
      continue
    }
    dbByFivesimId.set(String(order.fivesim_order_id), order)
  }

  for (const [fivesimId, remote] of fivesimById) {
    const local = dbByFivesimId.get(fivesimId)
    if (!local) {
      if (inWindow(remote.created_at)) {
        result.onlyInFivesim.push({ fivesim_order_id: fivesimId, status: remote.status, created_at: remote.created_at })
      }
      continue
    }
    result.matched++
    if (!isStatusCompatible(remote.status, local.status)) {
      result.statusMismatches.push({
        order_id: local.id,
        fivesim_order_id: fivesimId,
        db_status: local.status,
        fivesim_status: remote.status.toUpperCase(),
      })
    }
  }

  for (const [fivesimId, local] of dbByFivesimId) {
    if (!fivesimById.has(fivesimId) && inWindow(local.created_at)) {
      result.onlyInDb.push({
        order_id: local.id,
        fivesim_order_id: fivesimId,
        status: local.status,
        created_at: local.created_at,
      })
    }
  }

  return result
}
