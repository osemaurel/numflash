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
  /** Les mêmes services, avec ce qu'il faut pour calculer leurs prix. */
  catalog: CatalogService[]
  /** Réglages de prix publics (plancher de la landing déjà appliqué), absents tant qu'ils ne sont pas chargés. */
  settings: PricingSettings | null
}

export interface CatalogService {
  slug: string
  name: string
  marginOverride: number | null
}

/**
 * Prix de départ d'un numéro, fixé par Numflash (il finance notamment les 500 FCFA
 * reversés à l'affilié). La landing n'affiche jamais moins, quel que soit le coût fournisseur.
 */
export const MIN_NUMBER_PRICE_XOF = 3500

/** Réglages de prix avec le plancher de la landing appliqué. */
export function withLandingFloor(settings: PricingSettings): PricingSettings {
  return { ...settings, price_floor_xof: Math.max(settings.price_floor_xof, MIN_NUMBER_PRICE_XOF) }
}

/** Lit la réponse de la RPC publique `pricing_settings` (valeurs numeric renvoyées en chaînes). */
export function parsePricingSettings(raw: unknown): PricingSettings | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const settings: PricingSettings = {
    fx_usd_xof: Number(r.fx_usd_xof),
    margin_rate: Number(r.margin_rate),
    rounding_step: Number(r.rounding_step),
    price_floor_xof: Number(r.price_floor_xof),
  }
  return Object.values(settings).every(Number.isFinite) ? settings : null
}

export const FALLBACK_FACTS: LandingFacts = {
  countries: 153,
  minPrice: MIN_NUMBER_PRICE_XOF,
  topupTiers: [500, 1000, 2000, 5000, 10000, 20000],
  services: ['WhatsApp', 'Telegram', 'Google', 'Facebook', 'Instagram', 'TikTok', 'Discord', 'Twitter / X', 'Amazon', 'Microsoft', 'Uber', 'Tinder'],
  catalog: [
    ['whatsapp', 'WhatsApp'],
    ['telegram', 'Telegram'],
    ['google', 'Google'],
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['discord', 'Discord'],
    ['twitter', 'Twitter / X'],
    ['amazon', 'Amazon'],
    ['microsoft', 'Microsoft'],
    ['uber', 'Uber'],
    ['tinder', 'Tinder'],
  ].map(([slug, name]) => ({ slug, name, marginOverride: null })),
  settings: null,
}

/** Programme d'affiliation (règles fixées par Numflash, à venir dans l'espace client). */
export const AFFILIATE_REWARD_XOF = 500

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
  if (services.length > 0) {
    facts.services = services.map((s) => s.name_fr)
    facts.catalog = services.map((s) => ({
      slug: s.slug,
      name: s.name_fr,
      marginOverride: s.margin_override == null ? null : Number(s.margin_override),
    }))
  }

  if (Array.isArray(tiersRes.data)) {
    const tiers = (tiersRes.data as unknown[]).filter((n): n is number => Number.isInteger(n) && (n as number) > 0)
    if (tiers.length > 0) facts.topupTiers = [...tiers].sort((a, b) => a - b)
  }

  // Prix le plus bas : numéro en stock le moins cher parmi les services proposés.
  const parsed = settingsRes.error ? null : parsePricingSettings(settingsRes.data)
  if (parsed) facts.settings = withLandingFloor(parsed)
  const settings = facts.settings
  if (settings && services.length > 0) {
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
