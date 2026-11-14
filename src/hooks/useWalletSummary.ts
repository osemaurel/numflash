import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'
import { useAuth } from './useAuth'

const PAGE = 1000

export interface WalletSummary {
  /** Total des recharges confirmées (FCFA). */
  toppedUp: number
  /** Total dépensé en numéros, remboursements déduits (FCFA). */
  spent: number
}

/** Totaux du portefeuille, calculés depuis le journal des transactions (lu par pages). */
export function useWalletSummary() {
  const { user } = useAuth()
  const userId = user?.id
  const [summary, setSummary] = useState<WalletSummary | null>(null)

  useEffect(() => {
    if (!userId) {
      setSummary(null)
      return
    }
    let active = true

    async function load() {
      let toppedUp = 0
      let spent = 0
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('type, amount_xof')
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) return
        for (const t of data ?? []) {
          if (t.type === 'topup') toppedUp += t.amount_xof
          else if (t.type === 'purchase' || t.type === 'refund') spent -= t.amount_xof
        }
        if (!data || data.length < PAGE) break
      }
      if (active) setSummary({ toppedUp, spent: Math.max(0, spent) })
    }

    void load()
    const channel = supabase
      .channel(`wallet-summary:${userId}:${uuidv4()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` }, () => void load())
      .subscribe()
    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId])

  return summary
}
