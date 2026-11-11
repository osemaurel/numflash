import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ServicePriceRow {
  country_code: string
  operator: string
  cost_usd: number
  stock: number
  countries: {
    name_fr: string
    flag_emoji: string | null
  } | null
}

export function useServicePrices(serviceSlug: string | undefined) {
  const [rows, setRows] = useState<ServicePriceRow[]>([])
  const [loading, setLoading] = useState<boolean>(Boolean(serviceSlug))

  useEffect(() => {
    if (!serviceSlug) {
      setRows([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('price_cache')
      .select(
        'country_code, operator, cost_usd, stock, countries!inner(name_fr, flag_emoji, is_active)',
      )
      .eq('service_slug', serviceSlug)
      .eq('countries.is_active', true)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setRows([])
        } else {
          setRows((data ?? []) as unknown as ServicePriceRow[])
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [serviceSlug])

  return { rows, loading }
}
