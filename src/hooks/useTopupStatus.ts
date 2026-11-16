import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'

export type TopupStatus = 'pending' | 'succeeded' | 'failed' | 'expired'

export interface TopupView {
  id: string
  amount_xof: number
  status: TopupStatus
  channel: 'checkout' | 'direct'
  payer_network: string | null
  payer_phone: string | null
}

export type PollPhase = 'loading' | 'polling' | 'final' | 'timeout' | 'not_found'

const COLUMNS = 'id, amount_xof, status, channel, payer_network, payer_phone'

/**
 * État d'une recharge, mis à jour en direct (Supabase Realtime) quand le webhook confirme ou
 * refuse le paiement. Cet écran ne déclenche aucun crédit et n'interroge pas le serveur en boucle.
 * Passé `waitMs` sans confirmation, la phase devient « timeout » mais l'écoute continue.
 */
export function useTopupStatus(topupId: string | undefined, waitMs = 180_000) {
  const [topup, setTopup] = useState<TopupView | null>(null)
  const [phase, setPhase] = useState<PollPhase>('loading')
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (!topupId) {
      setPhase('not_found')
      return
    }
    let active = true

    const apply = (row: TopupView) => {
      setTopup(row)
      setPhase((p) => (row.status !== 'pending' ? 'final' : p === 'timeout' ? 'timeout' : 'polling'))
    }

    async function load() {
      const { data, error } = await supabase.from('topups').select(COLUMNS).eq('id', topupId).maybeSingle()
      if (!active) return
      if (!error && !data) {
        setPhase('not_found')
        return
      }
      if (data) apply(data as TopupView)
    }

    void load()
    const channel = supabase
      .channel(`topup:${topupId}:${uuidv4()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'topups', filter: `id=eq.${topupId}` }, (payload) => {
        if (active) apply(payload.new as TopupView)
      })
      .subscribe()

    // Retour sur l'onglet (après validation dans l'application Mobile Money) : relecture unique.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)

    const timer = setTimeout(() => {
      if (active) setPhase((p) => (p === 'polling' || p === 'loading' ? 'timeout' : p))
    }, waitMs)

    return () => {
      active = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [topupId, waitMs, run])

  const retry = useCallback(() => {
    setPhase('loading')
    setRun((n) => n + 1)
  }, [])

  return { topup, phase, retry }
}
