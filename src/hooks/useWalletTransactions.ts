import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'
import { useAuth } from './useAuth'

export type TransactionType = 'topup' | 'purchase' | 'refund' | 'bonus' | 'adjustment'

export interface WalletTransactionRow {
  id: string
  type: TransactionType
  amount_xof: number
  note: string | null
  created_at: string
  /** Commande liée (achats et remboursements), pour afficher le service et le pays. */
  orders?: { services: { name_fr: string } | null; countries: { name_fr: string; flag_emoji: string | null } | null } | null
}

export function useWalletTransactions(limit = 50) {
  const { user } = useAuth()
  const userId = user?.id
  const [transactions, setTransactions] = useState<WalletTransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) {
      setTransactions([])
      setLoading(false)
      return
    }
    let active = true

    async function load() {
      const { data, error: err } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount_xof, note, created_at, orders(services(name_fr), countries(name_fr, flag_emoji))')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (!active) return
      setError(Boolean(err))
      if (!err) setTransactions((data ?? []) as unknown as WalletTransactionRow[])
      setLoading(false)
    }

    void load()
    const channel = supabase
      .channel(`wallet-history:${userId}:${uuidv4()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId, limit])

  return { transactions, loading, error }
}
