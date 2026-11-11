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
        .select('id, type, amount_xof, note, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (!active) return
      setError(Boolean(err))
      if (!err) setTransactions((data ?? []) as WalletTransactionRow[])
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
