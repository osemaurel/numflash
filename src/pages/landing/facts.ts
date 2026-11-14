import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computePriceXof, type PricingSettings } from '@/lib/pricing'

/**
 * Chiffres affichés sur la landing. Ils viennent du catalogue réel (lecture publique) ;
 * les valeurs par défaut sont celles relevées en base le 14/11/2026 et ne servent
 * qu'en attendant la réponse (ou si le réseau échoue).
 */
export interface LandingFacts {
  /** Pays actuellement proposés. */
  countries: number
  /** Prix du numéro le moins cher en stock, en FCFA. */
  minPrice: number
  /** Paliers de recharge proposés, en FCFA. */
  topupTiers: number[]
  /** Services proposés, dans l'ordre du catalogue. */
  services: string[]
}

export const FALLBACK_FACTS: LandingFacts = {
  countries: 153,
  minPrice: 150,
  topupTiers: [500, 1000, 2000, 5000, 10000, 20000],
  services: ['WhatsApp', 'Telegram', 'Google', 'Facebook', 'Instagram', 'TikTok', 'Discord', 'Twitter / X', 'Amazon', 'Microsoft', 'Uber', 'Tinder'],
}

/** Programme d'affiliation (règles fixées par Numflash, à venir dans l'espace client). */
export const AFFILIATE_REWARD_XOF = 500

/** Assistance : le numéro WhatsApp déjà utilisé par Numflash. */
export const SUPPORT_WHATSAPP_URL = "https://wa.me/18258977760?text=Bonjour%2C%20j'ai%20besoin%20d'aide%20avec%20Numflash."

let cache: LandingFacts | null = null
let pending: Promise<LandingFacts> | null = null

async function loadFacts(): Promise<LandingFacts> {
  const [countriesRes, servicesRes, settingsRes, tiersRes] = await Promise.all([
    supabase.from('countries').select('code', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('services').select('slug, name_fr, margin_override').eq('is_active', true).order('sort_order').order('slug').limit(200),
    supabase.rpc('pricing_settings'),
    supabase.rpc('topup_tiers'),
  ])

  const facts: LandingFacts = { ...FALLBACK_FACTS }
  if (!countriesRes.error && typeof countriesRes.count === 'number' && countriesRes.count > 0) facts.countries = countriesRes.count

  const services = !servicesRes.error && servicesRes.data ? servicesRes.data : []
  if (services.length > 0) facts.services = services.map((s) => s.name_fr)

  if (Array.isArray(tiersRes.data)) {
    const tiers = (tiersRes.data as unknown[]).filter((n): n is number => Number.isInteger(n) && (n as number) > 0)
    if (tiers.length > 0) facts.topupTiers = [...tiers].sort((a, b) => a - b)
  }

  // Prix le plus bas : numéro en stock le moins cher parmi les services proposés.
  if (!settingsRes.error && settingsRes.data && services.length > 0) {
    const raw = settingsRes.data as Record<string, unknown>
    const settings: PricingSettings = {
      fx_usd_xof: Number(raw.fx_usd_xof),
      margin_rate: Number(raw.margin_rate),
      rounding_step: Number(raw.rounding_step),
      price_floor_xof: Number(raw.price_floor_xof),
    }
    const cheapest = await supabase
      .from('price_cache')
      .select('service_slug, cost_usd')
      .gt('stock', 0)
      .in(
        'service_slug',
        services.map((s) => s.slug),
      )
      .order('cost_usd', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!cheapest.error && cheapest.data) {
      const service = services.find((s) => s.slug === cheapest.data!.service_slug)
      try {
        facts.minPrice = computePriceXof(Number(cheapest.data.cost_usd), { margin_override: service?.margin_override ?? null }, settings)
      } catch {
        /* garde la valeur par défaut */
      }
    }
  }
  return facts
}

export function useLandingFacts(): LandingFacts {
  const [facts, setFacts] = useState<LandingFacts>(cache ?? FALLBACK_FACTS)
  useEffect(() => {
    if (cache) return
    let active = true
    pending ??= loadFacts().catch(() => FALLBACK_FACTS)
    void pending.then((f) => {
      cache = f
      if (active) setFacts(f)
    })
    return () => {
      active = false
    }
  }, [])
  return facts
}
