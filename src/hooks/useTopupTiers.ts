import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useTopupTiers() {
  const [tiers, setTiers] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.rpc('topup_tiers').then(({ data, error }) => {
      if (!active) return
      const list: unknown[] = !error && Array.isArray(data) ? data : []
      setTiers(list.filter((n): n is number => Number.isInteger(n) && (n as number) > 0))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { tiers, loading }
}
