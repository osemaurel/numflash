import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type TopupStatus = 'pending' | 'succeeded' | 'failed' | 'expired'

export interface TopupView {
  id: string
  amount_xof: number
  status: TopupStatus
}

export type PollPhase = 'loading' | 'polling' | 'final' | 'timeout' | 'not_found'

// Lit seulement l'état écrit par le webhook : cet écran ne déclenche aucun crédit.
export function useTopupStatus(topupId: string | undefined, intervalMs = 3000, maxDurationMs = 120_000) {
  const [topup, setTopup] = useState<TopupView | null>(null)
  const [phase, setPhase] = useState<PollPhase>('loading')
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (!topupId) {
      setPhase('not_found')
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()

    async function tick() {
      const { data, error } = await supabase
        .from('topups')
        .select('id, amount_xof, status')
        .eq('id', topupId)
        .maybeSingle()
      if (cancelled) return

      if (!error && !data) {
        setPhase('not_found')
        return
      }
      if (data) {
        setTopup(data as TopupView)
        if (data.status !== 'pending') {
          setPhase('final')
          return
        }
      }
      if (Date.now() - startedAt >= maxDurationMs) {
        setPhase('timeout')
        return
      }
      setPhase('polling')
      timer = setTimeout(tick, intervalMs)
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [topupId, intervalMs, maxDurationMs, run])

  const retry = useCallback(() => {
    setPhase('loading')
    setRun((n) => n + 1)
  }, [])

  return { topup, phase, retry }
}
