import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  role: 'user' | 'admin'
  is_blocked: boolean
}

// Le rôle sert seulement à l'affichage : les droits réels sont vérifiés par la base.
export function useProfile() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    let active = true
    supabase
      .from('profiles')
      .select('id, full_name, phone, role, is_blocked')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setProfile((data as Profile | null) ?? null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, authLoading])

  return { profile, loading, isAdmin: profile?.role === 'admin' && !profile.is_blocked }
}
