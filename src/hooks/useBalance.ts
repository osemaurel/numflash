import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'
import { useAuth } from './useAuth'

export function useBalance() {
  const { user } = useAuth()
  const userId = user?.id
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setBalance(null)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    async function fetchBalance(uid: string) {
      const { data, error } = await supabase
        .from('user_balances')
        .select('balance_xof')
        .eq('user_id', uid)
        .maybeSingle()
      if (!active) return
      if (error) {
        setBalance(0)
      } else {
        setBalance(data?.balance_xof ?? 0)
      }
      setLoading(false)
    }

    void fetchBalance(userId)

    // Nom unique : supabase-js réutilise un canal de même nom déjà abonné (header + page wallet).
    const channel = supabase
      .channel(`wallet-balance:${userId}:${uuidv4()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${userId}`,
        },
        () => void fetchBalance(userId),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [userId])

  return { balance, loading }
}
