import { describe, expect, it } from 'vitest'
import { isStatusCompatible, reconcileOrders, type DbOrderLite, type FivesimOrderLite } from './reconcile-core.ts'

const NOW = new Date('2026-11-13T02:17:00Z')
const SINCE = new Date('2026-11-10T02:17:00Z')
const OPTS = { since: SINCE, now: NOW, stuckAfterMs: 15 * 60_000 }

const remote = (id: number, status: string, created_at = '2026-11-12T10:00:00Z'): FivesimOrderLite => ({ id, status, created_at })
const local = (
  id: string,
  fivesim: number | null,
  status: DbOrderLite['status'],
  created_at = '2026-11-12T10:00:05Z',
): DbOrderLite => ({ id, fivesim_order_id: fivesim, status, created_at })

describe('reconcileOrders', () => {
  it('ne signale rien quand les deux côtés concordent', () => {
    const res = reconcileOrders(
      [remote(1, 'FINISHED'), remote(2, 'CANCELED'), remote(3, 'PENDING')],
      [local('a', 1, 'finished'), local('b', 2, 'refunded'), local('c', 3, 'pending')],
      OPTS,
    )
    expect(res).toEqual({ matched: 3, onlyInFivesim: [], onlyInDb: [], statusMismatches: [], stuckWithoutFivesimId: [] })
  })

  it('signale une commande payée chez 5sim mais absente de la base', () => {
    const res = reconcileOrders([remote(1, 'RECEIVED'), remote(2, 'FINISHED')], [local('a', 1, 'received')], OPTS)
    expect(res.onlyInFivesim).toEqual([{ fivesim_order_id: '2', status: 'FINISHED', created_at: '2026-11-12T10:00:00Z' }])
  })

  it('signale une commande en base absente chez 5sim', () => {
    const res = reconcileOrders([], [local('a', 42, 'pending')], OPTS)
    expect(res.onlyInDb).toEqual([
      { order_id: 'a', fivesim_order_id: '42', status: 'pending', created_at: '2026-11-12T10:00:05Z' },
    ])
  })

  it('signale un SMS reçu chez 5sim mais encore en attente chez nous', () => {
    const res = reconcileOrders([remote(7, 'RECEIVED')], [local('a', 7, 'pending')], OPTS)
    expect(res.statusMismatches).toEqual([
      { order_id: 'a', fivesim_order_id: '7', db_status: 'pending', fivesim_status: 'RECEIVED' },
    ])
  })

  it('accepte refunded pour une commande expirée ou bannie', () => {
    expect(isStatusCompatible('TIMEOUT', 'refunded')).toBe(true)
    expect(isStatusCompatible('BANNED', 'refunded')).toBe(true)
    expect(isStatusCompatible('timeout', 'timeout')).toBe(true)
    expect(isStatusCompatible('FINISHED', 'refunded')).toBe(false)
    expect(isStatusCompatible('INCONNU', 'pending')).toBe(false)
  })

  it('compare les identifiants indépendamment de leur type (nombre ou texte)', () => {
    const res = reconcileOrders([remote(11631253, 'FINISHED')], [local('a', '11631253', 'finished')], OPTS)
    expect(res.matched).toBe(1)
    expect(res.onlyInDb).toEqual([])
  })

  it('ignore les éléments hors fenêtre, chargés seulement comme marge', () => {
    const old = '2026-11-10T02:10:00Z'
    const res = reconcileOrders([remote(1, 'FINISHED', old)], [local('a', 2, 'pending', old)], OPTS)
    expect(res.onlyInFivesim).toEqual([])
    expect(res.onlyInDb).toEqual([])
  })

  it('signale une commande restée sans identifiant 5sim au-delà du délai', () => {
    const res = reconcileOrders(
      [],
      [local('ancienne', null, 'pending', '2026-11-13T01:00:00Z'), local('recente', null, 'pending', '2026-11-13T02:10:00Z')],
      OPTS,
    )
    expect(res.stuckWithoutFivesimId.map((o) => o.order_id)).toEqual(['ancienne'])
  })
})
