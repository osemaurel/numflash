import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent, parseIntegerInput, percentToFraction } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ServiceRow {
  slug: string
  name_fr: string
  is_active: boolean
  margin_override: number | null
  sort_order: number
}

interface CountryRow {
  code: string
  name_fr: string
  flag_emoji: string | null
  is_active: boolean
}

type Tab = 'services' | 'countries'
type Filter = 'all' | 'active' | 'inactive'
const PAGE = 50

function Switch({ checked, busy, onChange, label }: { checked: boolean; busy: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

function ServiceEditor({ service, onSaved, onCancel }: { service: ServiceRow; onSaved: (s: ServiceRow) => void; onCancel: () => void }) {
  const [name, setName] = useState(service.name_fr)
  const [margin, setMargin] = useState(service.margin_override === null ? '' : fractionToPercent(Number(service.margin_override)))
  const [order, setOrder] = useState(String(service.sort_order))
  const [saving, setSaving] = useState(false)

  const marginFraction = margin.trim() === '' ? null : percentToFraction(margin)
  const orderValue = parseIntegerInput(order)
  const invalid = name.trim().length === 0 || (margin.trim() !== '' && marginFraction === null) || orderValue === null

  async function save() {
    const patch: Record<string, unknown> = {}
    if (name.trim() !== service.name_fr) patch.name_fr = name.trim()
    const current = service.margin_override === null ? null : Number(service.margin_override).toFixed(4)
    const next = marginFraction === null ? null : Number(marginFraction).toFixed(4)
    if (current !== next) patch.margin_override = marginFraction
    if (orderValue !== service.sort_order) patch.sort_order = orderValue
    if (Object.keys(patch).length === 0) return onCancel()

    setSaving(true)
    const { data, error } = await supabase.rpc('admin_update_service', { p_slug: service.slug, p_patch: patch })
    setSaving(false)
    if (error) return void toast.error(translateAdminError(error))
    toast.success('Service mis à jour.')
    onSaved(data as ServiceRow)
  }

  return (
    <div className="grid gap-3 border-t p-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor={`name-${service.slug}`}>Nom affiché</Label>
        <Input id={`name-${service.slug}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`margin-${service.slug}`}>Marge spécifique (%)</Label>
        <Input
          id={`margin-${service.slug}`}
          inputMode="decimal"
          placeholder="Marge générale"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`order-${service.slug}`}>Ordre d'affichage</Label>
        <Input id={`order-${service.slug}`} inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} />
        <p className="text-xs text-muted-foreground">En dessous de 100 : section « Populaires ».</p>
      </div>
      <div className="flex gap-2 sm:col-span-3">
        <Button size="sm" onClick={() => void save()} disabled={saving || invalid}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

export default function AdminCatalog() {
  const [tab, setTab] = useState<Tab>('services')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [services, setServices] = useState<ServiceRow[] | null>(null)
  const [countries, setCountries] = useState<CountryRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    // PostgREST plafonne chaque réponse à 1 000 lignes : on charge les services par pages.
    async function loadAllServices() {
      const all: ServiceRow[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('services')
          .select('slug, name_fr, is_active, margin_override, sort_order')
          .order('sort_order')
          .order('slug')
          .range(from, from + 999)
        if (error) throw error
        all.push(...((data ?? []) as ServiceRow[]))
        if (!data || data.length < 1000) return all
      }
    }
    void Promise.all([
      loadAllServices(),
      supabase.from('countries').select('code, name_fr, flag_emoji, is_active').order('name_fr'),
    ])
      .then(([s, c]) => {
        setServices(s)
        setCountries((c.data ?? []) as CountryRow[])
      })
      .catch((error) => toast.error(translateAdminError(error)))
  }, [])

  useEffect(() => setLimit(PAGE), [tab, filter, query])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list: Array<ServiceRow | CountryRow> = (tab === 'services' ? services : countries) ?? []
    return list.filter((r) => {
      if (filter === 'active' && !r.is_active) return false
      if (filter === 'inactive' && r.is_active) return false
      const id = 'slug' in r ? r.slug : r.code
      return !q || r.name_fr.toLowerCase().includes(q) || id.includes(q)
    })
  }, [tab, filter, query, services, countries])

  const total = (tab === 'services' ? services : countries)?.length ?? 0
  const activeCount = ((tab === 'services' ? services : countries) ?? []).filter((r) => r.is_active).length

  async function toggleService(s: ServiceRow) {
    setBusy(s.slug)
    const { data, error } = await supabase.rpc('admin_update_service', { p_slug: s.slug, p_patch: { is_active: !s.is_active } })
    setBusy(null)
    if (error) return void toast.error(translateAdminError(error))
    setServices((list) => list?.map((x) => (x.slug === s.slug ? (data as ServiceRow) : x)) ?? null)
  }

  async function toggleCountry(c: CountryRow) {
    setBusy(c.code)
    const { data, error } = await supabase.rpc('admin_update_country', { p_code: c.code, p_patch: { is_active: !c.is_active } })
    setBusy(null)
    if (error) return void toast.error(translateAdminError(error))
    setCountries((list) => list?.map((x) => (x.code === c.code ? (data as CountryRow) : x)) ?? null)
  }

  const loading = services === null || countries === null

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border p-1" role="tablist">
        {(['services', 'countries'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'h-9 rounded-md px-4 text-sm font-medium transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'services' ? 'Services' : 'Pays'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'services' ? 'Rechercher un service…' : 'Rechercher un pays…'}
            className="pl-9"
            aria-label="Rechercher"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filtrer"
          className="h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Tous</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {activeCount} actif{activeCount > 1 ? 's' : ''} sur {total}
            {tab === 'services' ? ' · les services découverts par la synchronisation arrivent inactifs' : ''}
          </p>
          {rows.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Aucun résultat.</Card>
          ) : (
            <ul className="space-y-2">
              {rows.slice(0, limit).map((row) =>
                'slug' in row ? (
                  <li key={row.slug}>
                    <Card>
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.name_fr}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.slug}
                            {row.margin_override !== null ? ` · marge ${fractionToPercent(Number(row.margin_override))} %` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(editing === row.slug ? null : row.slug)}>
                            Modifier
                          </Button>
                          <Switch
                            checked={row.is_active}
                            busy={busy === row.slug}
                            onChange={() => void toggleService(row)}
                            label={`${row.is_active ? 'Désactiver' : 'Activer'} ${row.name_fr}`}
                          />
                        </div>
                      </div>
                      {editing === row.slug ? (
                        <ServiceEditor
                          service={row}
                          onCancel={() => setEditing(null)}
                          onSaved={(s) => {
                            setServices((list) => list?.map((x) => (x.slug === s.slug ? s : x)) ?? null)
                            setEditing(null)
                          }}
                        />
                      ) : null}
                    </Card>
                  </li>
                ) : (
                  <li key={row.code}>
                    <Card className="flex items-center justify-between gap-3 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-xl leading-none" aria-hidden>
                          {row.flag_emoji ?? '🌐'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.name_fr}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.code}</p>
                        </div>
                      </div>
                      <Switch
                        checked={row.is_active}
                        busy={busy === row.code}
                        onChange={() => void toggleCountry(row)}
                        label={`${row.is_active ? 'Désactiver' : 'Activer'} ${row.name_fr}`}
                      />
                    </Card>
                  </li>
                ),
              )}
            </ul>
          )}
          {rows.length > limit ? (
            <Button variant="outline" className="w-full" onClick={() => setLimit((n) => n + PAGE)}>
              Afficher plus ({rows.length - limit} restants)
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
