import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { cn, formatDateTime, formatFCFA } from '@/lib/utils'

interface DashboardStats {
  timezone: string
  orders_count: number
  success_count: number
  finalized_count: number
  success_rate: number | null
  revenue_xof: number
  cost_xof: number
  gross_margin_xof: number
  topups_xof: number
  abuse_alerts_24h: number
  last_reconcile: {
    at: string
    action: 'reconcile_report' | 'reconcile_failed' | 'reconcile_skipped'
    summary: Record<string, number | boolean | null> | null
  } | null
}

interface FivesimBalance {
  configured: boolean
  balance?: number
  frozen_balance?: number
  threshold?: number
  low?: boolean
  error?: string
}

interface AbuseAlert {
  id: string
  target: string
  created_at: string
  payload: { ratio: number; canceled: number; sample: number }
}

const RECONCILE_LABELS = {
  reconcile_report: 'Terminé',
  reconcile_failed: 'Échec',
  reconcile_skipped: 'Non exécuté : clé 5sim manquante',
} as const

async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null)
    if (typeof body?.message === 'string') return body.message
  }
  return 'Une erreur est survenue. Réessayez.'
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'danger' }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-xl font-semibold tabular-nums', tone === 'danger' && 'text-destructive')}>{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [balance, setBalance] = useState<FivesimBalance | null>(null)
  const [alerts, setAlerts] = useState<AbuseAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)

  const load = useCallback(async () => {
    const [statsRes, balanceRes, alertsRes] = await Promise.all([
      supabase.rpc('admin_dashboard_stats'),
      supabase.functions.invoke<FivesimBalance>('admin-fivesim-balance', { body: {} }),
      supabase
        .from('audit_log')
        .select('id, target, created_at, payload')
        .eq('action', 'abuse_cancel_ratio_alert')
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    if (statsRes.error) toast.error(translateAdminError(statsRes.error))
    else setStats(statsRes.data as DashboardStats)

    if (balanceRes.error) {
      setBalance({ configured: true, error: await functionErrorMessage(balanceRes.error) })
    } else {
      setBalance(balanceRes.data)
    }
    setAlerts((alertsRes.data ?? []) as AbuseAlert[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function runReconcile() {
    setReconciling(true)
    const { data, error } = await supabase.functions.invoke<{ summary: Record<string, number> }>('reconcile', {
      body: { trigger: 'manual' },
    })
    setReconciling(false)
    if (error) {
      toast.error(await functionErrorMessage(error))
    } else if (data) {
      const s = data.summary
      const issues = (s.only_in_fivesim ?? 0) + (s.only_in_db ?? 0) + (s.status_mismatches ?? 0)
      toast.success(issues === 0 ? 'Rapprochement terminé : aucun écart.' : `Rapprochement terminé : ${issues} écart(s).`)
    }
    void load()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  const rate = stats?.success_rate
  const last = stats?.last_reconcile

  return (
    <div className="space-y-6">
      {balance?.low ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>
            <span className="font-semibold">Solde 5sim bas.</span> Il reste {balance.balance?.toFixed(2).replace('.', ',')}, sous le seuil
            de {balance.threshold?.toFixed(2).replace('.', ',')}. Rechargez le compte 5sim pour éviter des échecs d'achat.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Aujourd'hui ({stats?.timezone})</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Chiffre d'affaires" value={formatFCFA(stats?.revenue_xof ?? 0)} hint="Numéros vendus avec SMS reçu" />
          <Kpi
            label="Marge brute"
            value={formatFCFA(stats?.gross_margin_xof ?? 0)}
            hint={`Coût 5sim : ${formatFCFA(stats?.cost_xof ?? 0)}`}
            tone={(stats?.gross_margin_xof ?? 0) < 0 ? 'danger' : undefined}
          />
          <Kpi label="Commandes" value={String(stats?.orders_count ?? 0)} hint={`${stats?.finalized_count ?? 0} terminées`} />
          <Kpi
            label="Taux de réussite"
            value={rate == null ? '—' : `${fractionToPercent(rate)} %`}
            hint={`${stats?.success_count ?? 0} avec SMS reçu`}
          />
          <Kpi label="Recharges créditées" value={formatFCFA(stats?.topups_xof ?? 0)} />
          <Kpi
            label="Solde 5sim"
            value={
              !balance?.configured
                ? 'Non configuré'
                : balance.error
                  ? 'Indisponible'
                  : (balance.balance ?? 0).toFixed(2).replace('.', ',')
            }
            hint={
              !balance?.configured
                ? 'Ajoutez FIVESIM_API_KEY dans les secrets Supabase.'
                : balance.error ?? `Seuil d'alerte : ${balance.threshold?.toFixed(2).replace('.', ',')}`
            }
            tone={balance?.low ? 'danger' : undefined}
          />
          <Kpi
            label="Alertes anti-abus (24 h)"
            value={String(stats?.abuse_alerts_24h ?? 0)}
            tone={(stats?.abuse_alerts_24h ?? 0) > 0 ? 'danger' : undefined}
          />
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Rapprochement 5sim</CardTitle>
          <Button size="sm" variant="outline" onClick={() => void runReconcile()} disabled={reconciling}>
            {reconciling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Lancer maintenant
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!last ? (
            <p className="text-muted-foreground">Aucun rapprochement pour l'instant. Il s'exécute chaque nuit à 3 h 17 (heure de Cotonou).</p>
          ) : (
            <>
              <p>
                <span className="font-medium">{RECONCILE_LABELS[last.action]}</span>
                <span className="text-muted-foreground"> · {formatDateTime(last.at)}</span>
              </p>
              {last.summary ? (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-4">
                  <li>Uniquement chez 5sim : {String(last.summary.only_in_fivesim ?? 0)}</li>
                  <li>Uniquement chez nous : {String(last.summary.only_in_db ?? 0)}</li>
                  <li>Écarts de statut : {String(last.summary.status_mismatches ?? 0)}</li>
                  <li>Sans n° 5sim : {String(last.summary.stuck_without_fivesim_id ?? 0)}</li>
                </ul>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Alertes d'annulation</h2>
        {alerts.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">Aucune alerte.</Card>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => {
              const userId = alert.target.replace(/^user:/, '')
              return (
                <li key={alert.id}>
                  <Card className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {fractionToPercent(alert.payload.ratio)} % d'annulations ({alert.payload.canceled}/{alert.payload.sample})
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{formatDateTime(alert.created_at)}</p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/utilisateurs?q=${userId}`}>Voir</Link>
                    </Button>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
