import { useCallback, useEffect, useState } from 'react'
import { ArrowDownLeft, Clock, CreditCard, History, RefreshCw, Smartphone, UserRound, Users, Wallet, XCircle } from 'lucide-react'
import { flag, networkLabel } from '@/lib/payment'
import { formatFCFA } from '@/lib/utils'
import { NetworkLogo } from '../client/NetworkLogo'
import { Button, Card, Kpi, Notice, PageHeader, Segmented } from './ui'
import {
  DataTable,
  DetailRow,
  DetailSection,
  DossierLink,
  Drawer,
  DrawerState,
  PERIODS,
  Pager,
  SearchBox,
  StatusPill,
  Timeline,
  countryName,
  longDate,
  periodRange,
  shortDate,
  signedFCFA,
  useListParams,
  useRpc,
  type AuditEvent,
  type Column,
  type PeriodKey,
  type Tone,
} from './records'

const PAGE = 25
const GROUPS = ['all', 'succeeded', 'pending', 'failed'] as const
type Group = (typeof GROUPS)[number]

export type TopupStatus = 'pending' | 'succeeded' | 'failed' | 'expired'

export interface TopupRow {
  id: string
  created_at: string
  updated_at: string
  status: TopupStatus
  amount_xof: number
  channel: 'checkout' | 'direct'
  payer_country: string | null
  payer_network: string | null
  payer_phone: string | null
  saspay_payment_id: string | null
  user_id: string
  user_email: string
  user_name: string | null
  total_count: number
}

interface Summary {
  total: number
  succeeded: number
  succeeded_xof: number
  pending: number
  pending_xof: number
  failed: number
  payers: number
}

interface TopupDetail {
  topup: {
    id: string
    created_at: string
    updated_at: string
    status: TopupStatus
    amount_xof: number
    channel: 'checkout' | 'direct'
    payer_country: string | null
    payer_network: string | null
    payer_phone: string | null
    payer_name: string | null
    payer_email: string | null
    saspay_payment_id: string | null
    saspay_session_id: string | null
    idempotency_key: string
  }
  user: { id: string; email: string; full_name: string | null; phone: string | null; is_blocked: boolean; balance_xof: number } | null
  wallet: { id: string; type: string; amount_xof: number; note: string | null; created_at: string }[]
  events: AuditEvent[]
}

const STATUS: Record<TopupStatus, { label: string; tone: Tone }> = {
  succeeded: { label: 'Réussie', tone: 'green' },
  pending: { label: 'En attente', tone: 'amber' },
  failed: { label: 'Échouée', tone: 'red' },
  expired: { label: 'Expirée', tone: 'neutral' },
}

export function TopupStatusPill({ status }: { status: TopupStatus }) {
  return <StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill>
}

export function NetworkChip({ code }: { code: string | null }) {
  if (!code) return <span className="text-[var(--glow-gray)]">Page de paiement</span>
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <NetworkLogo code={code} name={networkLabel(code)} size={24} radius={6} />
      {networkLabel(code)}
    </span>
  )
}

const columns: Column<TopupRow>[] = [
  {
    key: 'client',
    header: 'Recharge',
    mobileWidth: 'w-[64%]',
    cell: (t) => (
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[rgb(232,246,234)] text-[rgb(28,120,28)]">
          <ArrowDownLeft className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-black">{t.user_name || t.user_email}</span>
          <span className="truncate text-[12px] text-[var(--glow-gray)]">
            {t.payer_country ? `${flag(t.payer_country)} ` : ''}
            {t.payer_network ? networkLabel(t.payer_network) : 'Page de paiement'}
            <span className="min-[810px]:hidden"> · {shortDate(t.created_at)}</span>
          </span>
        </span>
      </span>
    ),
  },
  { key: 'date', header: 'Date', wide: true, cell: (t) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{shortDate(t.created_at)}</span> },
  { key: 'network', header: 'Moyen', wide: true, cell: (t) => <NetworkChip code={t.payer_network} /> },
  { key: 'phone', header: 'Numéro', wide: true, cell: (t) => <span className="font-glow-mono whitespace-nowrap text-[13px]">{t.payer_phone ?? '—'}</span> },
  {
    key: 'amount',
    header: 'Montant',
    align: 'right',
    mobileWidth: 'w-[36%]',
    cell: (t) => (
      <span className="flex flex-col items-end gap-1">
        <span className="whitespace-nowrap font-semibold text-black">{formatFCFA(t.amount_xof)}</span>
        <span className="min-[810px]:hidden">
          <TopupStatusPill status={t.status} />
        </span>
      </span>
    ),
  },
  { key: 'status', header: 'Statut', wide: true, cell: (t) => <TopupStatusPill status={t.status} /> },
]

export function TopupPanel({ id, reloadKey, inDossier = false }: { id: string; reloadKey: number; inDossier?: boolean }) {
  const { data, loading, error } = useRpc<TopupDetail>('admin_topup_detail', { p_topup_id: id }, reloadKey)
  if (!data) return <DrawerState loading={loading} error={error} />
  const t = data.topup
  const credit = data.wallet.find((w) => w.type === 'topup')
  return (
    <>
      <DetailSection title="Recharge" icon={Wallet}>
        <DetailRow label="Statut" value={<TopupStatusPill status={t.status} />} />
        <DetailRow label="Montant" value={<span className="font-semibold">{formatFCFA(t.amount_xof)}</span>} />
        <DetailRow label="Crédit du solde" value={credit ? `${signedFCFA(credit.amount_xof)} le ${longDate(credit.created_at)}` : 'Pas encore crédité'} />
        <DetailRow label="Créée le" value={longDate(t.created_at)} />
        <DetailRow label="Dernière mise à jour" value={longDate(t.updated_at)} />
      </DetailSection>

      <DetailSection title="Paiement" icon={Smartphone}>
        <DetailRow label="Canal" value={t.channel === 'direct' ? 'Paiement direct (page Numflash)' : 'Page de paiement du prestataire'} />
        <DetailRow label="Pays" value={t.payer_country ? `${flag(t.payer_country)} ${countryName(t.payer_country)}` : '—'} />
        <DetailRow label="Réseau" value={t.payer_network ? <NetworkChip code={t.payer_network} /> : '—'} />
        <DetailRow label="Numéro payeur" value={t.payer_phone ?? '—'} mono copy={t.payer_phone} />
        {t.payer_name ? <DetailRow label="Nom saisi" value={t.payer_name} /> : null}
        {t.payer_email ? <DetailRow label="E-mail saisi" value={t.payer_email} copy={t.payer_email} /> : null}
      </DetailSection>

      <DetailSection title="Client" icon={UserRound}>
        {data.user ? (
          <>
            <DetailRow label="Nom" value={data.user.full_name ?? '—'} />
            <DetailRow label="E-mail" value={data.user.email} copy={data.user.email} />
            <DetailRow label="Téléphone" value={data.user.phone ?? '—'} />
            <DetailRow label="Solde actuel" value={formatFCFA(data.user.balance_xof)} />
            {data.user.is_blocked ? <DetailRow label="Compte" value={<StatusPill tone="red">Bloqué</StatusPill>} /> : null}
            {inDossier ? null : <DossierLink userId={data.user.id} />}
          </>
        ) : (
          <p className="py-2 text-[14px] text-[var(--glow-gray)]">Client introuvable.</p>
        )}
      </DetailSection>

      <DetailSection title="Références" icon={CreditCard}>
        <DetailRow label="Paiement SasPay" value={t.saspay_payment_id ?? '—'} mono copy={t.saspay_payment_id} />
        {t.saspay_session_id ? <DetailRow label="Session SasPay" value={t.saspay_session_id} mono copy={t.saspay_session_id} /> : null}
        <DetailRow label="Référence Numflash" value={t.id} mono copy={t.id} />
        <DetailRow label="Clé d’idempotence" value={t.idempotency_key} mono />
      </DetailSection>

      <DetailSection title="Historique" icon={History}>
        <Timeline events={data.events} />
      </DetailSection>
    </>
  )
}

export default function AdminTopups() {
  const { group, period, search, page, selected, update } = useListParams<Group>(GROUPS, 'all')
  const [reloadKey, setReloadKey] = useState(0)
  const range = periodRange(period)

  useEffect(() => {
    const prev = document.title
    document.title = 'Recharges — Administration Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  const summary = useRpc<Summary>('admin_topups_summary', { p_from: range.from, p_to: range.to }, reloadKey)
  const list = useRpc<TopupRow[]>(
    'admin_list_topups',
    { p_group: group, p_search: search || null, p_from: range.from, p_to: range.to, p_limit: PAGE, p_offset: page * PAGE },
    reloadKey,
  )
  const rows = list.data ?? []
  const total = rows[0]?.total_count ?? 0
  const s = summary.data
  const close = useCallback(() => update({ id: null }, false), [update])
  const selectedRow = rows.find((r) => r.id === selected)

  const groupOptions: { value: Group; label: string }[] = [
    { value: 'all', label: `Toutes${s ? ` · ${s.total}` : ''}` },
    { value: 'succeeded', label: `Réussies${s ? ` · ${s.succeeded}` : ''}` },
    { value: 'pending', label: `En attente${s ? ` · ${s.pending}` : ''}` },
    { value: 'failed', label: `Échouées${s ? ` · ${s.failed}` : ''}` },
  ]

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader
        title="Suivi des "
        accent="recharges"
        subtitle="Toutes les recharges Mobile Money effectuées par les clients."
        aside={
          <Button icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)} loading={list.loading && rows.length > 0}>
            Actualiser
          </Button>
        }
      />

      <Segmented value={period} options={PERIODS} onChange={(v: PeriodKey) => update({ periode: v })} label="Période" />

      <div className="grid grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
        <Kpi tone="hero" icon={ArrowDownLeft} label="Montant rechargé" value={s ? formatFCFA(s.succeeded_xof) : '…'} hint={s ? `${s.succeeded} recharge${s.succeeded > 1 ? 's' : ''} réussie${s.succeeded > 1 ? 's' : ''}` : undefined} />
        <Kpi icon={Users} label="Clients payeurs" value={s ? String(s.payers) : '…'} />
        <Kpi icon={Clock} label="En attente" value={s ? String(s.pending) : '…'} hint={s ? formatFCFA(s.pending_xof) : undefined} />
        <Kpi icon={XCircle} label="Échouées" value={s ? String(s.failed) : '…'} tone={s && s.failed > 0 ? 'danger' : 'default'} />
      </div>

      {summary.error ? <Notice icon={XCircle}>{summary.error}</Notice> : null}

      <Card>
        <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
          <Segmented value={group} options={groupOptions} onChange={(v: Group) => update({ statut: v === 'all' ? null : v })} label="Statut des recharges" />
          <SearchBox value={search} onChange={(v) => update({ q: v || null })} placeholder="Client, numéro, réseau, réf. SasPay…" />
        </div>
        {list.error ? <Notice icon={XCircle}>{list.error}</Notice> : null}
        <DataTable
          rows={rows}
          columns={columns}
          loading={list.loading}
          selectedId={selected}
          onOpen={(r) => update({ id: r.id }, false)}
          empty={search ? 'Aucune recharge ne correspond à cette recherche.' : 'Aucune recharge sur cette période.'}
        />
        <Pager page={page} pageSize={PAGE} total={total} onPage={(p) => update({ page: p > 0 ? String(p) : null }, false)} />
      </Card>

      <Drawer
        open={Boolean(selected)}
        onClose={close}
        icon={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[rgb(232,246,234)] text-[rgb(28,120,28)]">
            <ArrowDownLeft className="h-5 w-5" strokeWidth={2.1} aria-hidden />
          </span>
        }
        title={selectedRow ? `Recharge de ${formatFCFA(selectedRow.amount_xof)}` : 'Détail de la recharge'}
        subtitle={selectedRow ? <>{shortDate(selectedRow.created_at)} · {selectedRow.user_name || selectedRow.user_email}</> : null}
      >
        {selected ? <TopupPanel id={selected} reloadKey={reloadKey} /> : null}
      </Drawer>
    </div>
  )
}
