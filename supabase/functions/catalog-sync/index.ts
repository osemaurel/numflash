// catalog-sync : synchronise le catalogue 5sim.
// - GET /v1/guest/countries → upsert dans countries
// - Pour chaque pays actif en DB, GET /v1/guest/prices?country=<code> → upsert price_cache
//   (parallélisé avec une concurrence bornée pour tenir dans le budget temps du Edge Runtime)
// - Nouveaux services découverts → créés avec is_active=false (curation humaine)
// - Suppression des lignes price_cache non revues depuis 1 heure
// - Trace dans audit_log
//
// Auth : Supabase gateway (verify_jwt=true, anon/authenticated).
// Rate limit interne : 60 s entre deux syncs.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const FIVESIM_BASE = 'https://5sim.net/v1'
const MIN_INTERVAL_MS = 60_000
const STALE_CUTOFF_MS = 60 * 60 * 1000
const CONCURRENCY = 3
const INTER_WAVE_DELAY_MS = 350
const RETRY_ON_429_DELAYS_MS = [1200, 3000]
const UPSERT_CHUNK = 500

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function fetchWith429Retry(url: string): Promise<Response> {
  let res = await fetch(url, { headers: { Accept: 'application/json' } })
  for (const delay of RETRY_ON_429_DELAYS_MS) {
    if (res.status !== 429) return res
    await sleep(delay)
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  }
  return res
}

interface GuestCountryInfo {
  iso?: Record<string, number>
  prefix?: Record<string, number>
  text_en?: string
}
type GuestCountries = Record<string, GuestCountryInfo>

interface PriceMetrics {
  cost: number
  count: number
  rate?: number
}
type GuestPrices = Record<string, Record<string, Record<string, PriceMetrics>>>

interface CountryResult {
  country: string
  prices_upserted: number
  errors: string[]
}

async function syncCountry(
  supabase: SupabaseClient,
  country: string,
  now: string,
  seenServices: Set<string>,
): Promise<CountryResult> {
  const errors: string[] = []
  let upserted = 0

  const pr = await fetchWith429Retry(
    `${FIVESIM_BASE}/guest/prices?country=${encodeURIComponent(country)}`,
  )
  if (!pr.ok) {
    errors.push(`prices HTTP ${pr.status}`)
    return { country, prices_upserted: 0, errors }
  }

  const pricesJson = (await pr.json()) as GuestPrices
  const countryData = pricesJson[country]
  if (!countryData) {
    errors.push('no data')
    return { country, prices_upserted: 0, errors }
  }

  const newServices: Array<{ slug: string; name_fr: string; is_active: boolean; sort_order: number }> = []
  const priceRows: Array<{
    service_slug: string
    country_code: string
    operator: string
    cost_usd: number
    stock: number
    synced_at: string
  }> = []

  for (const [productSlug, operators] of Object.entries(countryData)) {
    if (!seenServices.has(productSlug)) {
      seenServices.add(productSlug)
      newServices.push({
        slug: productSlug,
        name_fr: productSlug.charAt(0).toUpperCase() + productSlug.slice(1),
        is_active: false,
        sort_order: 100,
      })
    }
    for (const [operator, metrics] of Object.entries(operators)) {
      if (!metrics || typeof metrics.cost !== 'number') continue
      priceRows.push({
        service_slug: productSlug,
        country_code: country,
        operator,
        cost_usd: metrics.cost,
        stock: Number.isFinite(metrics.count) ? Math.max(0, Math.trunc(metrics.count)) : 0,
        synced_at: now,
      })
    }
  }

  if (newServices.length > 0) {
    const { error: sErr } = await supabase
      .from('services')
      .upsert(newServices, { onConflict: 'slug', ignoreDuplicates: true })
    if (sErr) errors.push(`services: ${sErr.message}`)
  }

  for (let i = 0; i < priceRows.length; i += UPSERT_CHUNK) {
    const batch = priceRows.slice(i, i + UPSERT_CHUNK)
    const { error: pErr } = await supabase
      .from('price_cache')
      .upsert(batch, { onConflict: 'service_slug,country_code,operator' })
    if (pErr) {
      errors.push(`prices [${i}]: ${pErr.message}`)
      break
    }
    upserted += batch.length
  }

  return { country, prices_upserted: upserted, errors }
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: lastSync } = await supabase
    .from('audit_log')
    .select('created_at')
    .eq('actor', 'edge:catalog-sync')
    .eq('action', 'sync')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastSync) {
    const elapsed = Date.now() - new Date(lastSync.created_at as string).getTime()
    if (elapsed < MIN_INTERVAL_MS) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', retry_after_ms: MIN_INTERVAL_MS - elapsed }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }

  const startedAt = Date.now()
  const logs: string[] = []

  try {
    // 1. Pays globaux chez 5sim.
    const countriesRes = await fetch(`${FIVESIM_BASE}/guest/countries`, {
      headers: { Accept: 'application/json' },
    })
    if (!countriesRes.ok) throw new Error(`guest/countries ${countriesRes.status}`)
    const guestCountries = (await countriesRes.json()) as GuestCountries
    const allCodes = Object.keys(guestCountries)

    const countryRows = allCodes.map((code) => ({
      code,
      name_fr: guestCountries[code].text_en ?? code,
    }))
    const { error: countriesErr } = await supabase
      .from('countries')
      .upsert(countryRows, { onConflict: 'code', ignoreDuplicates: true })
    if (countriesErr) logs.push(`countries upsert: ${countriesErr.message}`)

    // 2. Pays actifs (par défaut tous, hors ceux explicitement désactivés par un admin).
    const { data: activeCountries, error: acErr } = await supabase
      .from('countries')
      .select('code')
      .eq('is_active', true)
    if (acErr) throw new Error(`active countries: ${acErr.message}`)

    const now = new Date().toISOString()
    const seenServices = new Set<string>()
    let totalPricesUpserted = 0

    // 3. Fetch prix pays par pays, parallélisé par vagues de CONCURRENCY.
    const codes = (activeCountries ?? []).map((r) => r.code as string)
    for (let i = 0; i < codes.length; i += CONCURRENCY) {
      const wave = codes.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        wave.map((c) => syncCountry(supabase, c, now, seenServices)),
      )
      for (const r of results) {
        totalPricesUpserted += r.prices_upserted
        for (const e of r.errors) logs.push(`${r.country}: ${e}`)
      }
      if (i + CONCURRENCY < codes.length) await sleep(INTER_WAVE_DELAY_MS)
    }

    // 4. Purge des prix non rafraîchis depuis 1 heure.
    const cutoff = new Date(Date.now() - STALE_CUTOFF_MS).toISOString()
    const { error: delErr, count: deletedCount } = await supabase
      .from('price_cache')
      .delete({ count: 'exact' })
      .lt('synced_at', cutoff)
    if (delErr) logs.push(`delete stale: ${delErr.message}`)

    const summary = {
      duration_ms: Date.now() - startedAt,
      countries_discovered: allCodes.length,
      active_countries: codes.length,
      prices_upserted: totalPricesUpserted,
      new_services_discovered: seenServices.size,
      deleted_stale: deletedCount ?? 0,
      logs,
    }

    await supabase.from('audit_log').insert({
      actor: 'edge:catalog-sync',
      action: 'sync',
      target: 'catalog',
      payload: summary,
    })

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from('audit_log').insert({
      actor: 'edge:catalog-sync',
      action: 'sync_failed',
      target: 'catalog',
      payload: { error: message, logs },
    })
    return new Response(JSON.stringify({ error: message, logs }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
