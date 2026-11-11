import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useServices, type ServiceRow } from '@/hooks/useServices'
import ServiceCard from '@/components/ServiceCard'

export default function Home() {
  const { services, loading } = useServices()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return services
    return services.filter(
      (s) => s.name_fr.toLowerCase().includes(q) || s.slug.includes(q),
    )
  }, [services, query])

  const { popular, rest } = useMemo(() => {
    const popular: ServiceRow[] = []
    const rest: ServiceRow[] = []
    for (const s of filtered) {
      if (s.sort_order < 100 && popular.length < 6) popular.push(s)
      else rest.push(s)
    }
    return { popular, rest }
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez un service, nous vous trouvons un numéro.
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un service…"
          className="pl-9"
          inputMode="search"
          autoComplete="off"
          aria-label="Rechercher un service"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {query
            ? 'Aucun service ne correspond à votre recherche.'
            : "Le catalogue n'est pas encore disponible. Revenez dans quelques minutes."}
        </Card>
      ) : (
        <div className="space-y-6">
          {popular.length > 0 && !query && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Populaires</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {popular.map((s) => (
                  <ServiceCard key={s.slug} service={s} />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {query ? 'Résultats' : 'Autres services'}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(query ? filtered : rest).map((s) => (
                  <ServiceCard key={s.slug} service={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
