import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ServiceRow {
  slug: string
  name_fr: string
  logo_url: string | null
  sort_order: number
  margin_override: number | null
}

export function useServices() {
  const [services, setServices] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('services')
      .select('slug, name_fr, logo_url, sort_order, margin_override')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name_fr', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setServices([])
        } else {
          setServices((data ?? []) as ServiceRow[])
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { services, loading }
}
