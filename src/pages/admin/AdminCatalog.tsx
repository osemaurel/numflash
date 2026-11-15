import { useEffect, useMemo, useState } from 'react'
import { Pencil, Search } from 'lucide-react'
import { toast } from 'sonner'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent, parseIntegerInput, percentToFraction } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { ServiceTile } from '../landing/ui'
import { Badge, Button, Card, Empty, Field, PageHeader, Segmented, Switch, TextInput, inputClass } from './ui'

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
    <div className="flex flex-col gap-4 border-t border-[var(--glow-line)] px-1 pb-1 pt-4">
      <div className="grid grid-cols-1 gap-4 min-[810px]:grid-cols-3">
        <Field id={`name-${service.slug}`} label="Nom affiché">
          <TextInput id={`name-${service.slug}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field id={`margin-${service.slug}`} label="Marge spécifique (%)" hint="Vide : marge générale.">
          <TextInput id={`margin-${service.slug}`} inputMode="decimal" placeholder="Marge générale" value={margin} onChange={(e) => setMargin(e.target.value)} />
        </Field>
        <Field id={`order-${service.slug}`} label="Ordre d’affichage" hint="En dessous de 100 : section « Populaires ».">
          <TextInput id={`order-${service.slug}`} inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={saving} onClick={() => void save()} disabled={invalid}>
          Enregistrer
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
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
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader
        title="Catalogue"
        subtitle="Activez les services et les pays proposés aux clients, et ajustez la marge par service."
        aside={
          <Segmented
            label="Catalogue"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'services', label: 'Services' },
              { value: 'countries', label: 'Pays' },
            ]}
          />
        }
      />

      <div className="flex flex-col gap-3 min-[810px]:flex-row min-[810px]:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--glow-gray)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'services' ? 'Rechercher un service' : 'Rechercher un pays'}
            className={`${inputClass} pl-10`}
          />
        </label>
        <Segmented
          label="Filtrer"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'active', label: 'Actifs' },
            { value: 'inactive', label: 'Inactifs' },
          ]}
        />
      </div>

      <Card>
        {loading ? (
          <ul className="flex flex-col gap-2" aria-label="Chargement">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="h-14 animate-pulse rounded-2xl bg-[var(--glow-bg)]" style={{ opacity: 1 - i * 0.1 }} />
            ))}
          </ul>
        ) : (
          <>
            <p className="text-[13px] text-[var(--glow-gray)]">
              <span className="font-semibold text-black">{activeCount}</span> actif{activeCount > 1 ? 's' : ''} sur {total}
              {tab === 'services' ? ' · les services découverts par la synchronisation arrivent inactifs' : ''}
            </p>
            {rows.length === 0 ? (
              <Empty>Aucun résultat.</Empty>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--glow-line)]">
                {rows.slice(0, limit).map((row) =>
                  'slug' in row ? (
                    <li key={row.slug} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ServiceTile name={row.name_fr} slug={row.slug} size={38} radius={10} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 truncate text-[15px] font-medium text-black">
                              <span className="truncate">{row.name_fr}</span>
                              {row.sort_order < 100 ? <Badge tone="blue">Populaire</Badge> : null}
                            </p>
                            <p className="truncate text-[13px] text-[var(--glow-gray)]">
                              {row.slug}
                              {row.margin_override !== null ? ` · marge ${fractionToPercent(Number(row.margin_override))} %` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(editing === row.slug ? null : row.slug)} aria-expanded={editing === row.slug}>
                            <span className="hidden min-[810px]:inline">Modifier</span>
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
                        <div className="mt-3">
                          <ServiceEditor
                            service={row}
                            onCancel={() => setEditing(null)}
                            onSaved={(sv) => {
                              setServices((list) => list?.map((x) => (x.slug === sv.slug ? sv : x)) ?? null)
                              setEditing(null)
                            }}
                          />
                        </div>
                      ) : null}
                    </li>
                  ) : (
                    <li key={row.code} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--glow-bg)] text-[22px] leading-none" aria-hidden>
                          {row.flag_emoji ?? '🌐'}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-black">{row.name_fr}</p>
                          <p className="truncate text-[13px] text-[var(--glow-gray)]">{row.code}</p>
                        </div>
                      </div>
                      <Switch
                        checked={row.is_active}
                        busy={busy === row.code}
                        onChange={() => void toggleCountry(row)}
                        label={`${row.is_active ? 'Désactiver' : 'Activer'} ${row.name_fr}`}
                      />
                    </li>
                  ),
                )}
              </ul>
            )}
            {rows.length > limit ? (
              <Button className="self-center" onClick={() => setLimit((n) => n + PAGE)}>
                Afficher plus ({rows.length - limit} restants)
              </Button>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
