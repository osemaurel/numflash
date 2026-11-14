import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownLeft, ChevronRight, Coins, Gauge, RefreshCw, ShieldAlert, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatFCFA } from '@/lib/utils'
import { Badge, Button, Card, Empty, Kpi, Notice, PageHeader } from './ui'

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

  const header = (
    <PageHeader
      title="Tableau de "
      accent="bord"
      subtitle={stats ? `Activité d’aujourd’hui · fuseau ${stats.timezone}` : 'Activité d’aujourd’hui'}
      aside={
        <Button icon={RefreshCw} onClick={() => void load()} className="w-full min-[810px]:w-auto">
          Actualiser
        </Button>
      }
    />
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-5 min-[810px]:gap-6">
        {header}
        <div className="grid grid-cols-2 gap-3 min-[810px]:gap-4 min-[1200px]:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      </div>
    )
  }

  const rate = stats?.success_rate
  const last = stats?.last_reconcile
  const fivesimValue = !balance?.configured ? 'Non configuré' : balance.error ? 'Indisponible' : (balance.balance ?? 0).toFixed(2).replace('.', ',')
  const fivesimHint = !balance?.configured
    ? 'Ajoutez FIVESIM_API_KEY dans les secrets Supabase.'
    : balance.error ?? `Seuil d’alerte : ${balance.threshold?.toFixed(2).replace('.', ',')}`
  const reconcileTone = last?.action === 'reconcile_report' ? 'green' : last?.action === 'reconcile_failed' ? 'red' : 'amber'

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      {header}

      {balance?.low ? (
        <Notice icon={AlertTriangle}>
          <span className="font-semibold">Solde 5sim bas.</span> Il reste {balance.balance?.toFixed(2).replace('.', ',')}, sous le seuil de{' '}
          {balance.threshold?.toFixed(2).replace('.', ',')}. Rechargez le compte 5sim pour éviter des échecs d’achat.
        </Notice>
      ) : null}

      <section className="grid grid-cols-2 gap-3 min-[810px]:gap-4 min-[1200px]:grid-cols-4" aria-label="Indicateurs du jour">
        <div className="col-span-2">
          <Kpi tone="hero" icon={TrendingUp} label="Chiffre d’affaires du jour" value={formatFCFA(stats?.revenue_xof ?? 0)} hint="Numéros vendus avec SMS reçu" />
        </div>
        <Kpi
          icon={Coins}
          label="Marge brute"
          value={formatFCFA(stats?.gross_margin_xof ?? 0)}
          hint={`Coût 5sim : ${formatFCFA(stats?.cost_xof ?? 0)}`}
          tone={(stats?.gross_margin_xof ?? 0) < 0 ? 'danger' : 'default'}
        />
        <Kpi icon={ShoppingBag} label="Commandes" value={String(stats?.orders_count ?? 0)} hint={`${stats?.finalized_count ?? 0} terminées`} />
        <Kpi icon={Gauge} label="Taux de réussite" value={rate == null ? '—' : `${fractionToPercent(rate)} %`} hint={`${stats?.success_count ?? 0} avec SMS reçu`} />
        <Kpi icon={ArrowDownLeft} label="Recharges créditées" value={formatFCFA(stats?.topups_xof ?? 0)} />
        <Kpi icon={Wallet} label="Solde 5sim" value={fivesimValue} hint={fivesimHint} tone={balance?.low ? 'danger' : 'default'} />
        <Kpi
          icon={ShieldAlert}
          label="Alertes anti-abus (24 h)"
          value={String(stats?.abuse_alerts_24h ?? 0)}
          tone={(stats?.abuse_alerts_24h ?? 0) > 0 ? 'danger' : 'default'}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 min-[810px]:gap-6 min-[1200px]:grid-cols-2 min-[1200px]:items-start">
        <Card
          title="Rapprochement 5sim"
          aside={
            <Button size="sm" icon={RefreshCw} loading={reconciling} onClick={() => void runReconcile()}>
              Lancer maintenant
            </Button>
          }
        >
          {!last ? (
            <Empty>Aucun rapprochement pour l’instant. Il s’exécute chaque nuit à 3 h 17 (heure de Cotonou).</Empty>
          ) : (
            <>
              <p className="flex flex-wrap items-center gap-2 text-[14px] text-[var(--glow-gray)]">
                <Badge tone={reconcileTone}>{RECONCILE_LABELS[last.action]}</Badge>
                {formatDateTime(last.at)}
              </p>
              {last.summary ? (
                <dl className="grid grid-cols-2 gap-2">
                  {[
                    ['Uniquement chez 5sim', last.summary.only_in_fivesim],
                    ['Uniquement chez nous', last.summary.only_in_db],
                    ['Écarts de statut', last.summary.status_mismatches],
                    ['Sans n° 5sim', last.summary.stuck_without_fivesim_id],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex flex-col gap-0.5 rounded-2xl bg-[var(--glow-bg)] px-3.5 py-3">
                      <dt className="text-[12px] text-[var(--glow-gray)]">{label}</dt>
                      <dd className="font-glow-display text-[20px] font-semibold text-black">{String(value ?? 0)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Alertes d’annulation" aside={alerts.length > 0 ? <Badge tone="red">{alerts.length}</Badge> : undefined}>
          {alerts.length === 0 ? (
            <Empty>Aucune alerte.</Empty>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--glow-line)]">
              {alerts.map((alert) => {
                const userId = alert.target.replace(/^user:/, '')
                return (
                  <li key={alert.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(254,242,242)]">
                        <ShieldAlert className="h-4 w-4 text-[rgb(185,28,28)]" strokeWidth={2} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-black">
                          {fractionToPercent(alert.payload.ratio)} % d’annulations ({alert.payload.canceled}/{alert.payload.sample})
                        </p>
                        <p className="truncate text-[13px] text-[var(--glow-gray)]">{formatDateTime(alert.created_at)}</p>
                      </div>
                    </div>
                    <Link to={`/admin/utilisateurs?q=${userId}`} className="group flex shrink-0 items-center gap-0.5 text-[14px] font-medium text-[var(--glow-blue-dark)]">
                      Voir
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
