import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { computePriceXof, type PricingSettings } from '@/lib/pricing'
import type { CatalogService } from './facts'

/**
 * Pays mis en avant dans le module d'achat, dans cet ordre (codes pays 5sim).
 * Les autres suivent par ordre alphabétique.
 */
export const FEATURED_COUNTRIES = [
  'france',
  'usa',
  'england',
  'germany',
  'canada',
  'netherlands',
  'spain',
  'italy',
  'belgium',
  'switzerland',
  'portugal',
  'sweden',
  'poland',
  'austria',
  'ireland',
  'denmark',
  'norway',
  'finland',
  'australia',
  'greece',
  'luxembourg',
] as const

export interface CountryOffer {
  code: string
  name: string
  flag: string
  /** Coût fournisseur le plus bas parmi les opérateurs en stock (USD). */
  minCostUsd: number
  stock: number
  featured: boolean
}

interface PriceRow {
  country_code: string
  cost_usd: number | string
  stock: number
  countries: { name_fr: string; flag_emoji: string | null } | null
}

/** Un pays par ligne : coût minimal et stock cumulé de ses opérateurs. */
export function groupByCountry(rows: PriceRow[]): CountryOffer[] {
  const featured = new Set<string>(FEATURED_COUNTRIES)
  const byCode = new Map<string, CountryOffer>()
  for (const r of rows) {
    const cost = Number(r.cost_usd)
    if (!(r.stock > 0) || !Number.isFinite(cost)) continue
    const existing = byCode.get(r.country_code)
    if (existing) {
      existing.stock += r.stock
      if (cost < existing.minCostUsd) existing.minCostUsd = cost
    } else {
      byCode.set(r.country_code, {
        code: r.country_code,
        name: r.countries?.name_fr ?? r.country_code,
        flag: r.countries?.flag_emoji ?? '🌐',
        minCostUsd: cost,
        stock: r.stock,
        featured: featured.has(r.country_code),
      })
    }
  }
  return sortCountries([...byCode.values()])
}

/** Pays mis en avant d'abord (dans l'ordre de FEATURED_COUNTRIES), puis les autres de A à Z. */
export function sortCountries(list: CountryOffer[]): CountryOffer[] {
  const rank = (code: string) => {
    const i = (FEATURED_COUNTRIES as readonly string[]).indexOf(code)
    return i === -1 ? Number.POSITIVE_INFINITY : i
  }
  return [...list].sort((a, b) => {
    const ra = rank(a.code)
    const rb = rank(b.code)
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name, 'fr')
  })
}

/** Recherche insensible à la casse et aux accents (« etats » trouve « États-Unis »). */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function offerPrice(offer: CountryOffer, service: CatalogService, settings: PricingSettings): number | null {
  try {
    return computePriceXof(offer.minCostUsd, { margin_override: service.marginOverride }, settings)
  } catch {
    return null
  }
}

const PAGE = 1000
const cache = new Map<string, CountryOffer[]>()

/** Lecture publique du stock d'un service, par pages (PostgREST plafonne à 1 000 lignes). */
async function loadCountries(slug: string): Promise<CountryOffer[]> {
  const rows: PriceRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('price_cache')
      .select('country_code, cost_usd, stock, countries!inner(name_fr, flag_emoji, is_active)')
      .eq('service_slug', slug)
      .gt('stock', 0)
      .eq('countries.is_active', true)
      .order('country_code')
      .order('operator')
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as PriceRow[]))
    if (!data || data.length < PAGE) break
  }
  return groupByCountry(rows)
}

export type CountriesState = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; countries: CountryOffer[] }

export function useServiceCountries(slug: string | null, attempt: number): CountriesState {
  const [state, setState] = useState<CountriesState>({ status: 'idle' })
  useEffect(() => {
    if (!slug) {
      setState({ status: 'idle' })
      return
    }
    const cached = cache.get(slug)
    if (cached) {
      setState({ status: 'ready', countries: cached })
      return
    }
    let active = true
    setState({ status: 'loading' })
    loadCountries(slug).then(
      (countries) => {
        cache.set(slug, countries)
        if (active) setState({ status: 'ready', countries })
      },
      () => {
        if (active) setState({ status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [slug, attempt])
  return state
}
