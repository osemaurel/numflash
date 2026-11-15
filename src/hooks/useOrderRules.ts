import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/** Règles d'annulation (réglages admin). Les garde-fous eux-mêmes sont appliqués par la base. */
export interface OrderRules {
  minSecondsBeforeCancel: number
  maxCancelsPerHour: number
  maxActiveOrders: number
}

export const DEFAULT_ORDER_RULES: OrderRules = { minSecondsBeforeCancel: 120, maxCancelsPerHour: 5, maxActiveOrders: 5 }

let cache: { rules: OrderRules; expiresAt: number } | null = null
let inflight: Promise<OrderRules> | null = null
const TTL_MS = 10 * 60 * 1000

function int(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isSafeInteger(n) && n >= 0 ? n : fallback
}

function load(): Promise<OrderRules> {
  inflight ??= Promise.resolve(supabase.rpc('order_rules'))
    .then(({ data, error }) => {
      if (error || !data) return DEFAULT_ORDER_RULES
      const d = data as Record<string, unknown>
      const rules: OrderRules = {
        minSecondsBeforeCancel: int(d.min_seconds_before_cancel, DEFAULT_ORDER_RULES.minSecondsBeforeCancel),
        maxCancelsPerHour: int(d.max_cancels_per_hour, DEFAULT_ORDER_RULES.maxCancelsPerHour),
        maxActiveOrders: int(d.max_active_orders, DEFAULT_ORDER_RULES.maxActiveOrders),
      }
      cache = { rules, expiresAt: Date.now() + TTL_MS }
      return rules
    })
    .catch(() => DEFAULT_ORDER_RULES)
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useOrderRules(): OrderRules {
  const [rules, setRules] = useState<OrderRules>(() => cache?.rules ?? DEFAULT_ORDER_RULES)
  useEffect(() => {
    if (cache && cache.expiresAt > Date.now()) {
      setRules(cache.rules)
      return
    }
    let active = true
    void load().then((r) => {
      if (active) setRules(r)
    })
    return () => {
      active = false
    }
  }, [])
  return rules
}
