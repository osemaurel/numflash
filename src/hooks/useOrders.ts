import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'
import { useAuth } from './useAuth'

export type OrderStatus = 'pending' | 'received' | 'finished' | 'canceled' | 'timeout' | 'banned' | 'refunded'

export interface OrderSms {
  id: string
  sender: string | null
  text: string | null
  code: string | null
  received_at: string
}

export interface OrderRow {
  id: string
  phone: string
  service_slug: string
  country_code: string
  price_xof: number
  status: OrderStatus
  expires_at: string | null
  created_at: string
  canceled_by: 'user' | 'system' | 'admin' | null
  services: { name_fr: string } | null
  countries: { name_fr: string; flag_emoji: string | null } | null
  order_sms: OrderSms[]
}

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'received']
export const FINISHED_STATUSES: OrderStatus[] = ['finished']
export const CLOSED_STATUSES: OrderStatus[] = ['canceled', 'timeout', 'banned', 'refunded']

const SELECT =
  'id, phone, service_slug, country_code, price_xof, status, expires_at, created_at, canceled_by, services(name_fr), countries(name_fr, flag_emoji), order_sms(id, sender, text, code, received_at)'

/**
 * Commandes de l'utilisateur, par pages (jamais plus de `pageSize` lignes à la fois),
 * rechargées en direct quand une commande ou un SMS change (Supabase Realtime, RLS appliquée).
 */
export function useOrders(statuses: OrderStatus[], pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id
  const key = statuses.join(',')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [pages, setPages] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) {
      setOrders([])
      setLoading(false)
      return
    }
    let active = true
    const wanted = key.split(',') as OrderStatus[]

    async function load() {
      const to = pages * pageSize
      const { data, error: err } = await supabase
        .from('orders')
        .select(SELECT)
        .in('status', wanted)
        .order('created_at', { ascending: false })
        .order('received_at', { referencedTable: 'order_sms', ascending: false })
        .range(0, to) // une ligne de plus que demandé : indique s'il reste des commandes
      if (!active) return
      setError(Boolean(err))
      if (!err) {
        const rows = (data ?? []) as unknown as OrderRow[]
        setHasMore(rows.length > to)
        setOrders(rows.slice(0, to))
      }
      setLoading(false)
    }

    void load()
    const channel = supabase
      .channel(`orders:${userId}:${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => void load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_sms' }, () => void load())
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId, key, pages, pageSize])

  const loadMore = useCallback(() => setPages((p) => p + 1), [])
  return { orders, loading, error, hasMore, loadMore }
}

export interface ReceivedCode {
  id: string
  code: string | null
  text: string | null
  received_at: string
  orders: {
    service_slug: string
    services: { name_fr: string } | null
    countries: { name_fr: string; flag_emoji: string | null } | null
  } | null
}

/** Derniers SMS reçus, toutes commandes confondues. */
export function useLastCodes(limit = 3) {
  const { user } = useAuth()
  const userId = user?.id
  const [codes, setCodes] = useState<ReceivedCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) {
      setCodes([])
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      const { data, error: err } = await supabase
        .from('order_sms')
        .select('id, code, text, received_at, orders!inner(service_slug, services(name_fr), countries(name_fr, flag_emoji))')
        .order('received_at', { ascending: false })
        .limit(limit)
      if (!active) return
      setError(Boolean(err))
      if (!err) setCodes((data ?? []) as unknown as ReceivedCode[])
      setLoading(false)
    }
    void load()
    const channel = supabase
      .channel(`last-codes:${userId}:${uuidv4()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_sms' }, () => void load())
      .subscribe()
    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId, limit])

  return { codes, loading, error }
}
