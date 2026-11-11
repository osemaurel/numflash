import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PricingSettings } from '@/lib/pricing'

let cache: { settings: PricingSettings; expiresAt: number } | null = null
const TTL_MS = 5 * 60 * 1000

export function usePricingSettings() {
  const [settings, setSettings] = useState<PricingSettings | null>(() => {
    if (cache && cache.expiresAt > Date.now()) return cache.settings
    return null
  })
  const [loading, setLoading] = useState<boolean>(settings == null)

  useEffect(() => {
    if (cache && cache.expiresAt > Date.now()) {
      setSettings(cache.settings)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase.rpc('pricing_settings').then(({ data, error }) => {
      if (!active) return
      if (error || !data) {
        setLoading(false)
        return
      }
      const parsed = data as PricingSettings
      const normalized: PricingSettings = {
        fx_usd_xof: Number(parsed.fx_usd_xof),
        margin_rate: Number(parsed.margin_rate),
        rounding_step: Number(parsed.rounding_step),
        price_floor_xof: Number(parsed.price_floor_xof),
      }
      cache = { settings: normalized, expiresAt: Date.now() + TTL_MS }
      setSettings(normalized)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  return { settings, loading }
}
