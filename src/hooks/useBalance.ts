import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useBalance() {
  const { user } = useAuth()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
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

    void fetchBalance(user.id)

    const channel = supabase
      .channel(`wallet:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => void fetchBalance(user.id),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [user])

  return { balance, loading }
}
