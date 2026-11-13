import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent, normalizeDecimal, parseIntegerInput, percentToFraction } from '@/lib/decimal'
import { computePriceXof, type PricingSettings } from '@/lib/pricing'
import { supabase } from '@/lib/supabase'
import { cn, formatFCFA } from '@/lib/utils'

type Stored = Record<string, unknown>

interface Form {
  fx_usd_xof: string
  margin_rate: string
  rounding_step: string
  price_floor_xof: string
  topup_tiers: string
  max_cancels_per_hour: string
  min_seconds_before_cancel: string
  max_active_orders: string
  cancel_ratio_alert_threshold: string
  cancel_ratio_window: string
  fivesim_low_balance_threshold: string
  report_timezone: string
}

interface ServiceOption {
  slug: string
  name_fr: string
  margin_override: number | null
  is_active: boolean
}

interface Example {
  service: string
  serviceName: string
  country: string
  cost: number
  marginOverride: number | null
}

const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'UTC+1 : Bénin, Niger, Cameroun, Gabon, Congo, Tchad' },
  { value: 'Africa/Abidjan', label: "UTC+0 : Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Togo, Guinée" },
  { value: 'Africa/Kinshasa', label: 'UTC+1 : Kinshasa' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'UTC', label: 'UTC' },
]

const EXAMPLE_SERVICES = ['whatsapp', 'telegram', 'google', 'facebook']
const EXAMPLE_COUNTRIES = ['benin', 'ivorycoast', 'france', 'usa']

// Représentation canonique à 4 décimales pour comparer sans flottant.
function canonical(decimal: string): string {
  const [i, f = ''] = decimal.split('.')
  return `${BigInt(i)}.${f.padEnd(4, '0')}`
}
const storedCanonical = (v: unknown) => Number(v).toFixed(4)
const showDecimal = (v: unknown) => Number(v).toFixed(4).replace(/\.?0+$/, '').replace('.', ',')

function toForm(s: Stored): Form {
  return {
    fx_usd_xof: showDecimal(s.fx_usd_xof),
    margin_rate: fractionToPercent(Number(s.margin_rate)),
    rounding_step: String(s.rounding_step),
    price_floor_xof: String(s.price_floor_xof),
    topup_tiers: (Array.isArray(s.topup_tiers) ? s.topup_tiers : []).join(', '),
    max_cancels_per_hour: String(s.max_cancels_per_hour),
    min_seconds_before_cancel: String(s.min_seconds_before_cancel),
    max_active_orders: String(s.max_active_orders),
    cancel_ratio_alert_threshold: fractionToPercent(Number(s.cancel_ratio_alert_threshold)),
    cancel_ratio_window: String(s.cancel_ratio_window),
    fivesim_low_balance_threshold: showDecimal(s.fivesim_low_balance_threshold),
    report_timezone: String(s.report_timezone ?? 'Africa/Lagos'),
  }
}

interface Parsed {
  changes: Record<string, unknown>
  errors: Partial<Record<keyof Form, string>>
  draftPricing: PricingSettings | null
}

function parseForm(form: Form, stored: Stored): Parsed {
  const changes: Record<string, unknown> = {}
  const errors: Partial<Record<keyof Form, string>> = {}

  const decimalField = (key: keyof Form, value: string | null, label: string) => {
    if (value === null) {
      errors[key] = `${label} : nombre à 4 décimales maximum.`
      return null
    }
    if (canonical(value) !== storedCanonical(stored[key])) changes[key] = value
    return value
  }
  const intField = (key: keyof Form) => {
    const value = parseIntegerInput(form[key])
    if (value === null) {
      errors[key] = 'Nombre entier attendu.'
      return null
    }
    if (value !== Number(stored[key])) changes[key] = value
    return value
  }

  const fx = decimalField('fx_usd_xof', normalizeDecimal(form.fx_usd_xof), 'Taux')
  const margin = percentToFraction(form.margin_rate)
  if (margin === null) errors.margin_rate = 'Pourcentage à 2 décimales maximum.'
  else if (canonical(margin) !== storedCanonical(stored.margin_rate)) changes.margin_rate = margin
  const step = intField('rounding_step')
  const floor = intField('price_floor_xof')

  const tierParts = form.topup_tiers.split(',').map((p) => p.trim()).filter(Boolean)
  const tiers = tierParts.map(parseIntegerInput)
  if (tiers.length === 0 || tiers.some((t) => t === null)) {
    errors.topup_tiers = 'Liste de montants entiers séparés par des virgules.'
  } else {
    const sorted = [...new Set(tiers as number[])].sort((a, b) => a - b)
    if (sorted.length !== tiers.length) errors.topup_tiers = 'Chaque palier doit être unique.'
    else if (JSON.stringify(sorted) !== JSON.stringify(stored.topup_tiers)) changes.topup_tiers = sorted
  }

  intField('max_cancels_per_hour')
  intField('min_seconds_before_cancel')
  intField('max_active_orders')
  intField('cancel_ratio_window')
  const ratio = percentToFraction(form.cancel_ratio_alert_threshold)
  if (ratio === null) errors.cancel_ratio_alert_threshold = 'Pourcentage à 2 décimales maximum.'
  else if (canonical(ratio) !== storedCanonical(stored.cancel_ratio_alert_threshold)) {
    changes.cancel_ratio_alert_threshold = ratio
  }
  decimalField('fivesim_low_balance_threshold', normalizeDecimal(form.fivesim_low_balance_threshold), 'Seuil')
  if (form.report_timezone !== stored.report_timezone) changes.report_timezone = form.report_timezone

  const draftPricing =
    fx && margin !== null && step && step > 0 && floor !== null
      ? { fx_usd_xof: Number(fx), margin_rate: Number(margin), rounding_step: step, price_floor_xof: floor }
      : null

  return { changes, errors, draftPricing }
}

function safePrice(cost: number, override: number | null, settings: PricingSettings | null) {
  if (!settings) return null
  try {
    return computePriceXof(cost, { margin_override: override }, settings)
  } catch {
    return null
  }
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function PriceDelta({ before, after }: { before: number | null; after: number | null }) {
  if (before === null) return <span>—</span>
  if (after === null || after === before) return <span className="tabular-nums">{formatFCFA(before)}</span>
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="text-muted-foreground line-through">{formatFCFA(before)}</span>
      <ArrowRight className="h-3 w-3" aria-hidden />
      <span className={cn('font-semibold', after > before ? 'text-destructive' : 'text-primary')}>{formatFCFA(after)}</span>
    </span>
  )
}

export default function AdminSettings() {
  const [stored, setStored] = useState<Stored | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [examples, setExamples] = useState<Example[]>([])
  const [simCost, setSimCost] = useState('0,373')
  const [simService, setSimService] = useState('')

  async function load() {
    const [settingsRes, servicesRes, pricesRes] = await Promise.all([
      supabase.from('settings').select('key, value'),
      // Seuls les services avec une marge spécifique et ceux des exemples servent ici.
      supabase
        .from('services')
        .select('slug, name_fr, margin_override, is_active')
        .or(`margin_override.not.is.null,slug.in.(${EXAMPLE_SERVICES.join(',')})`)
        .order('name_fr'),
      supabase
        .from('price_cache')
        .select('service_slug, country_code, cost_usd, countries(name_fr)')
        .in('service_slug', EXAMPLE_SERVICES)
        .in('country_code', EXAMPLE_COUNTRIES)
        .gt('stock', 0),
    ])
    if (settingsRes.error) {
      toast.error(translateAdminError(settingsRes.error))
      return
    }
    const s = Object.fromEntries((settingsRes.data ?? []).map((r) => [r.key, r.value]))
    setStored(s)
    setForm(toForm(s))
    const serviceList = (servicesRes.data ?? []) as ServiceOption[]
    setServices(serviceList)

    // Offre la moins chère par service et par pays.
    const best = new Map<string, Example>()
    for (const row of (pricesRes.data ?? []) as unknown as Array<{
      service_slug: string
      country_code: string
      cost_usd: number
      countries: { name_fr: string } | null
    }>) {
      const key = `${row.service_slug}:${row.country_code}`
      const current = best.get(key)
      if (!current || row.cost_usd < current.cost) {
        const svc = serviceList.find((x) => x.slug === row.service_slug)
        best.set(key, {
          service: row.service_slug,
          serviceName: svc?.name_fr ?? row.service_slug,
          country: row.countries?.name_fr ?? row.country_code,
          cost: Number(row.cost_usd),
          marginOverride: svc?.margin_override ?? null,
        })
      }
    }
    setExamples([...best.values()].sort((a, b) => a.serviceName.localeCompare(b.serviceName, 'fr') || a.cost - b.cost))
  }

  useEffect(() => {
    void load()
  }, [])

  const parsed = useMemo(() => (form && stored ? parseForm(form, stored) : null), [form, stored])
  const currentPricing: PricingSettings | null = stored
    ? {
        fx_usd_xof: Number(stored.fx_usd_xof),
        margin_rate: Number(stored.margin_rate),
        rounding_step: Number(stored.rounding_step),
        price_floor_xof: Number(stored.price_floor_xof),
      }
    : null

  if (!form || !stored || !parsed) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }

  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value })
  const changeCount = Object.keys(parsed.changes).length
  const hasErrors = Object.keys(parsed.errors).length > 0
  const simCostValue = normalizeDecimal(simCost)
  const simOverride = services.find((s) => s.slug === simService)?.margin_override ?? null
  const simNow = simCostValue ? safePrice(Number(simCostValue), simOverride, currentPricing) : null
  const simNext = simCostValue ? safePrice(Number(simCostValue), simOverride, parsed.draftPricing) : null

  async function save() {
    if (!parsed || changeCount === 0 || hasErrors) return
    setSaving(true)
    const { error } = await supabase.rpc('admin_update_settings', { p_changes: parsed.changes, p_reason: reason || null })
    setSaving(false)
    if (error) {
      toast.error(translateAdminError(error))
      return
    }
    toast.success(changeCount > 1 ? `${changeCount} réglages enregistrés.` : 'Réglage enregistré.')
    setReason('')
    void load()
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarification</CardTitle>
          <CardDescription>Prix client = coût 5sim × taux × (1 + marge), arrondi au pas supérieur, jamais sous le plancher.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="fx" label="Taux USD → FCFA" error={parsed.errors.fx_usd_xof}>
            <Input id="fx" inputMode="decimal" value={form.fx_usd_xof} onChange={set('fx_usd_xof')} />
          </Field>
          <Field id="margin" label="Marge générale (%)" hint="Les services avec une marge spécifique ne sont pas concernés." error={parsed.errors.margin_rate}>
            <Input id="margin" inputMode="decimal" value={form.margin_rate} onChange={set('margin_rate')} />
          </Field>
          <Field id="step" label="Pas d'arrondi (FCFA)" error={parsed.errors.rounding_step}>
            <Input id="step" inputMode="numeric" value={form.rounding_step} onChange={set('rounding_step')} />
          </Field>
          <Field id="floor" label="Prix plancher (FCFA)" error={parsed.errors.price_floor_xof}>
            <Input id="floor" inputMode="numeric" value={form.price_floor_xof} onChange={set('price_floor_xof')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulateur de prix</CardTitle>
          <CardDescription>Comparez le prix client actuel et celui qu'appliqueraient vos modifications, avant d'enregistrer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sim-cost" label="Coût 5sim (USD)" error={simCostValue ? undefined : 'Nombre à 4 décimales maximum.'}>
              <Input id="sim-cost" inputMode="decimal" value={simCost} onChange={(e) => setSimCost(e.target.value)} />
            </Field>
            <Field id="sim-service" label="Service">
              <select
                id="sim-service"
                value={simService}
                onChange={(e) => setSimService(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Marge générale</option>
                {services
                  .filter((s) => s.margin_override !== null)
                  .map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name_fr} (marge {fractionToPercent(Number(s.margin_override))} %)
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Prix actuel</p>
              <p className="text-lg font-semibold tabular-nums">{simNow === null ? '—' : formatFCFA(simNow)}</p>
            </div>
            <div className={cn('rounded-lg border p-3', simNext !== null && simNow !== null && simNext !== simNow && 'border-primary')}>
              <p className="text-xs text-muted-foreground">Avec vos modifications</p>
              <p className="text-lg font-semibold tabular-nums">{simNext === null ? '—' : formatFCFA(simNext)}</p>
            </div>
          </div>
          {examples.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Sur le catalogue réel (offre la moins chère en stock)</p>
              <ul className="divide-y rounded-lg border text-sm">
                {examples.map((ex) => (
                  <li key={`${ex.service}:${ex.country}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">
                      {ex.serviceName} · {ex.country}
                    </span>
                    <PriceDelta
                      before={safePrice(ex.cost, ex.marginOverride, currentPricing)}
                      after={safePrice(ex.cost, ex.marginOverride, parsed.draftPricing)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recharges</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id="tiers" label="Paliers (FCFA)" hint="Séparés par des virgules, de 100 à 1 000 000, 12 au maximum." error={parsed.errors.topup_tiers}>
            <Input id="tiers" value={form.topup_tiers} onChange={set('topup_tiers')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anti-abus</CardTitle>
          <CardDescription>Appliqué par la base à chaque achat et chaque annulation par le client.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="active" label="Commandes en attente max." error={parsed.errors.max_active_orders}>
            <Input id="active" inputMode="numeric" value={form.max_active_orders} onChange={set('max_active_orders')} />
          </Field>
          <Field id="cancels" label="Annulations max. par heure" error={parsed.errors.max_cancels_per_hour}>
            <Input id="cancels" inputMode="numeric" value={form.max_cancels_per_hour} onChange={set('max_cancels_per_hour')} />
          </Field>
          <Field id="delay" label="Délai minimum avant annulation (secondes)" error={parsed.errors.min_seconds_before_cancel}>
            <Input id="delay" inputMode="numeric" value={form.min_seconds_before_cancel} onChange={set('min_seconds_before_cancel')} />
          </Field>
          <Field
            id="ratio"
            label="Alerte au-delà de (% d'annulations)"
            hint={`Sur les ${form.cancel_ratio_window} dernières commandes, dès ${Math.ceil(Number(form.cancel_ratio_window) / 2) || '…'} commandes.`}
            error={parsed.errors.cancel_ratio_alert_threshold}
          >
            <Input id="ratio" inputMode="decimal" value={form.cancel_ratio_alert_threshold} onChange={set('cancel_ratio_alert_threshold')} />
          </Field>
          <Field id="window" label="Fenêtre de calcul (commandes)" error={parsed.errors.cancel_ratio_window}>
            <Input id="window" inputMode="numeric" value={form.cancel_ratio_window} onChange={set('cancel_ratio_window')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertes et rapports</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="low" label="Seuil d'alerte du solde 5sim" hint="Dans la devise du compte 5sim." error={parsed.errors.fivesim_low_balance_threshold}>
            <Input id="low" inputMode="decimal" value={form.fivesim_low_balance_threshold} onChange={set('fivesim_low_balance_threshold')} />
          </Field>
          <Field id="tz" label="Fuseau des statistiques du jour">
            <select
              id="tz"
              value={form.report_timezone}
              onChange={set('report_timezone')}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[...TIMEZONES, ...(TIMEZONES.some((t) => t.value === form.report_timezone) ? [] : [{ value: form.report_timezone, label: form.report_timezone }])].map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1.5 p-4">
          <Label htmlFor="reason">Motif du changement (facultatif)</Label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. hausse du coût 5sim" />
          <p className="text-xs text-muted-foreground">Inscrit au journal d'audit avec les anciennes et nouvelles valeurs.</p>
        </CardContent>
      </Card>

      {changeCount > 0 || hasErrors ? (
        <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-lg border bg-background p-2 pl-4 shadow-md">
          <p className={cn('text-sm', hasErrors ? 'text-destructive' : 'text-muted-foreground')}>
            {hasErrors
              ? 'Corrigez les champs en rouge.'
              : `${changeCount} modification${changeCount > 1 ? 's' : ''} non enregistrée${changeCount > 1 ? 's' : ''}`}
          </p>
          <Button size="sm" onClick={() => void save()} disabled={saving || changeCount === 0 || hasErrors}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Enregistrer
          </Button>
        </div>
      ) : null}
    </div>
  )
}
