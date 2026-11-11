import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useServices } from '@/hooks/useServices'
import { useServicePrices, type ServicePriceRow } from '@/hooks/useServicePrices'
import { usePricingSettings } from '@/hooks/usePricingSettings'
import { computePriceXof } from '@/lib/pricing'
import { formatFCFA } from '@/lib/utils'

type SortBy = 'price_asc' | 'price_desc' | 'country_asc'

export default function Service() {
  const { slug } = useParams<{ slug: string }>()
  const { services, loading: servicesLoading } = useServices()
  const service = services.find((s) => s.slug === slug)
  const { rows, loading: pricesLoading } = useServicePrices(slug)
  const { settings, loading: settingsLoading } = usePricingSettings()
  const [sortBy, setSortBy] = useState<SortBy>('price_asc')
  const [query, setQuery] = useState('')

  const enriched = useMemo(() => {
    if (!settings || rows.length === 0) return []

    // Un pays = la meilleure ligne. Préférence à ce qui est en stock, puis au moindre coût.
    const byCountry = new Map<string, ServicePriceRow>()
    for (const r of rows) {
      const existing = byCountry.get(r.country_code)
      if (!existing) {
        byCountry.set(r.country_code, r)
        continue
      }
      const existingInStock = existing.stock > 0
      const rInStock = r.stock > 0
      if (rInStock && !existingInStock) byCountry.set(r.country_code, r)
      else if (rInStock === existingInStock && r.cost_usd < existing.cost_usd) {
        byCountry.set(r.country_code, r)
      }
    }

    let list = Array.from(byCountry.values()).map((r) => ({
      ...r,
      price_xof: computePriceXof(r.cost_usd, service ?? null, settings),
    }))

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          (r.countries?.name_fr ?? '').toLowerCase().includes(q) ||
          r.country_code.includes(q),
      )
    }

    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.price_xof - b.price_xof)
        break
      case 'price_desc':
        list.sort((a, b) => b.price_xof - a.price_xof)
        break
      case 'country_asc':
        list.sort((a, b) =>
          (a.countries?.name_fr ?? '').localeCompare(b.countries?.name_fr ?? '', 'fr'),
        )
        break
    }
    return list
  }, [rows, settings, service, sortBy, query])

  const inStockCount = useMemo(() => enriched.filter((r) => r.stock > 0).length, [enriched])

  const loading = pricesLoading || settingsLoading || servicesLoading

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Retour au catalogue">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{service?.name_fr ?? slug}</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez un pays, le numéro sera réservé pour vous.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pays…"
            className="pl-9"
            inputMode="search"
            autoComplete="off"
            aria-label="Rechercher un pays"
          />
        </div>
        <div className="flex items-center justify-end gap-2 text-sm">
          <label htmlFor="sort" className="text-muted-foreground">
            Trier par
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="country_asc">Pays (A–Z)</option>
          </select>
        </div>
      </div>

      {!loading && enriched.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {enriched.length} pays {query ? 'correspondent' : 'disponibles'}
          {inStockCount > 0 && inStockCount < enriched.length && (
            <> · {inStockCount} en stock</>
          )}
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Aucun numéro disponible pour ce service pour l'instant.
        </Card>
      ) : (
        <ul className="space-y-2">
          {enriched.map((r) => {
            const inStock = r.stock > 0
            return (
              <li key={r.country_code}>
                <Card className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl leading-none" aria-hidden>
                      {r.countries?.flag_emoji ?? '🌐'}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {r.countries?.name_fr ?? r.country_code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inStock
                          ? `${r.stock.toLocaleString('fr-FR')} en stock`
                          : 'Épuisé'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold tabular-nums">
                      {formatFCFA(r.price_xof)}
                    </div>
                    <Button size="sm" disabled={!inStock} title="L'achat arrive en Phase 2">
                      Acheter
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
