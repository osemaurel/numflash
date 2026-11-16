import { useCallback, useEffect, useState } from 'react'
import { Coins, History, MessageSquareText, Phone, ReceiptText, RefreshCw, ShoppingBag, TrendingUp, UserRound, Wallet, XCircle } from 'lucide-react'
import { formatFCFA } from '@/lib/utils'
import { ServiceTile } from '../landing/ui'
import { Button, Card, Kpi, Notice, PageHeader, Segmented } from './ui'
import {
  DataTable,
  DetailRow,
  DetailSection,
  Drawer,
  DrawerState,
  PERIODS,
  Pager,
  SearchBox,
  StatusPill,
  Timeline,
  decimalText,
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
const GROUPS = ['all', 'pending', 'success', 'canceled', 'failed'] as const
type Group = (typeof GROUPS)[number]

type OrderStatus = 'pending' | 'received' | 'finished' | 'canceled' | 'timeout' | 'banned' | 'refunded'

interface OrderRow {
  id: string
  created_at: string
  status: OrderStatus
  canceled_by: string | null
  user_id: string
  user_email: string
  user_name: string | null
  service_slug: string
  service_name: string | null
  country_code: string
  country_name: string | null
  country_flag: string | null
  phone: string
  price_xof: number
  cost_xof: number
  margin_xof: number | null
  fivesim_order_id: number | null
  sms_count: number
  total_count: number
}

interface Summary {
  total: number
  pending: number
  success: number
  canceled: number
  failed: number
  revenue_xof: number
  cost_xof: number
  margin_xof: number
  refunded_xof: number
}

interface OrderDetail {
  order: {
    id: string
    created_at: string
    updated_at: string
    status: OrderStatus
    canceled_by: string | null
    canceled_at: string | null
    expires_at: string | null
    service_slug: string
    service_name: string | null
    country_code: string
    country_name: string | null
    country_flag: string | null
    phone: string
    operator: string | null
    price_xof: number
    cost_usd: string
    fx_usd_xof: string
    cost_xof: number
    margin_xof: number
    fivesim_order_id: number | null
    provider_status: string | null
    idempotency_key: string | null
  }
  user: { id: string; email: string; full_name: string | null; phone: string | null; is_blocked: boolean; balance_xof: number } | null
  sms: { sender: string | null; text: string | null; code: string | null; received_at: string }[]
  wallet: { id: string; type: string; amount_xof: number; note: string | null; created_at: string }[]
  events: AuditEvent[]
}

const STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending: { label: 'En attente', tone: 'amber' },
  received: { label: 'Code reçu', tone: 'green' },
  finished: { label: 'Terminée', tone: 'green' },
  canceled: { label: 'Annulée', tone: 'blue' },
  timeout: { label: 'Expirée', tone: 'blue' },
  banned: { label: 'Numéro refusé', tone: 'red' },
  refunded: { label: 'Échec, remboursée', tone: 'red' },
}

const CANCELED_BY: Record<string, string> = { user: 'le client', system: 'le système', admin: 'un administrateur' }

function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill>
}

const columns: Column<OrderRow>[] = [
  {
    key: 'service',
    header: 'Vente',
    mobileWidth: 'w-[64%]',
    cell: (o) => (
      <span className="flex min-w-0 items-center gap-3">
        <ServiceTile name={o.service_name ?? o.service_slug} slug={o.service_slug} size={34} radius={9} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-black">
            {o.service_name ?? o.service_slug} <span className="font-normal text-[var(--glow-gray)]">· {o.country_flag ?? '🌐'} {o.country_name ?? o.country_code}</span>
          </span>
          <span className="truncate text-[12px] text-[var(--glow-gray)]">
            {o.user_name || o.user_email} <span className="min-[810px]:hidden">· {shortDate(o.created_at)}</span>
          </span>
        </span>
      </span>
    ),
  },
  { key: 'date', header: 'Date', wide: true, cell: (o) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{shortDate(o.created_at)}</span> },
  { key: 'phone', header: 'Numéro', wide: true, cell: (o) => <span className="font-glow-mono whitespace-nowrap text-[13px]">{o.phone || '—'}</span> },
  {
    key: 'price',
    header: 'Prix',
    align: 'right',
    mobileWidth: 'w-[36%]',
    cell: (o) => (
      <span className="flex flex-col items-end gap-1">
        <span className="whitespace-nowrap font-semibold text-black">{formatFCFA(o.price_xof)}</span>
        <span className="min-[810px]:hidden">
          <OrderStatusPill status={o.status} />
        </span>
      </span>
    ),
  },
  {
    key: 'margin',
    header: 'Marge',
    wide: true,
    align: 'right',
    cell: (o) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{o.margin_xof == null ? '—' : formatFCFA(o.margin_xof)}</span>,
  },
  { key: 'status', header: 'Statut', wide: true, cell: (o) => <OrderStatusPill status={o.status} /> },
]

function OrderPanel({ id, reloadKey }: { id: string; reloadKey: number }) {
  const { data, loading, error } = useRpc<OrderDetail>('admin_order_detail', { p_order_id: id }, reloadKey)
  if (!data) return <DrawerState loading={loading} error={error} />
  const o = data.order
  const kept = o.status === 'received' || o.status === 'finished'
  return (
    <>
      <DetailSection title="Vente" icon={ShoppingBag}>
        <DetailRow label="Statut" value={<OrderStatusPill status={o.status} />} />
        <DetailRow label="Service" value={o.service_name ?? o.service_slug} />
        <DetailRow label="Pays" value={`${o.country_flag ?? '🌐'} ${o.country_name ?? o.country_code}`} />
        <DetailRow label="Numéro" value={o.phone || 'Non attribué'} mono copy={o.phone || null} />
        <DetailRow label="Opérateur" value={o.operator ?? '—'} />
        <DetailRow label="Créée le" value={longDate(o.created_at)} />
        {o.expires_at ? <DetailRow label="Expire le" value={longDate(o.expires_at)} /> : null}
        {o.canceled_at ? <DetailRow label="Annulée le" value={`${longDate(o.canceled_at)}${o.canceled_by ? ` par ${CANCELED_BY[o.canceled_by] ?? o.canceled_by}` : ''}`} /> : null}
      </DetailSection>

      <DetailSection title="Montants" icon={Coins}>
        <DetailRow label="Prix payé" value={<span className="font-semibold">{formatFCFA(o.price_xof)}</span>} />
        <DetailRow label="Coût 5sim" value={`${decimalText(o.cost_usd)} $ × ${decimalText(o.fx_usd_xof)} = ${formatFCFA(o.cost_xof)}`} />
        <DetailRow label="Marge" value={kept ? <span className="font-semibold text-[rgb(28,120,28)]">{formatFCFA(o.margin_xof)}</span> : 'Aucune (vente non conservée)'} />
      </DetailSection>

      <DetailSection title="Client" icon={UserRound}>
        {data.user ? (
          <>
            <DetailRow label="Nom" value={data.user.full_name ?? '—'} />
            <DetailRow label="E-mail" value={data.user.email} copy={data.user.email} />
            <DetailRow label="Téléphone" value={data.user.phone ?? '—'} />
            <DetailRow label="Solde actuel" value={formatFCFA(data.user.balance_xof)} />
            {data.user.is_blocked ? <DetailRow label="Compte" value={<StatusPill tone="red">Bloqué</StatusPill>} /> : null}
          </>
        ) : (
          <p className="py-2 text-[14px] text-[var(--glow-gray)]">Client introuvable.</p>
        )}
      </DetailSection>

      <DetailSection title={`SMS reçus (${data.sms.length})`} icon={MessageSquareText}>
        {data.sms.length === 0 ? (
          <p className="py-2 text-[14px] text-[var(--glow-gray)]">Aucun SMS reçu sur ce numéro.</p>
        ) : (
          data.sms.map((m, i) => (
            <div key={i} className="flex flex-col gap-1 border-t border-[var(--glow-line)] py-2.5 first-of-type:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-glow-mono text-[18px] font-bold tracking-[1px] text-black">{m.code ?? '—'}</span>
                <span className="text-[12px] text-[var(--glow-gray)]">{longDate(m.received_at)}</span>
              </div>
              {m.text ? <p className="text-[13px] leading-[18px] text-[var(--glow-text)]">« {m.text} »</p> : null}
              {m.sender ? <span className="text-[12px] text-[var(--glow-gray)]">De : {m.sender}</span> : null}
            </div>
          ))
        )}
      </DetailSection>

      <DetailSection title="Mouvements de solde" icon={Wallet}>
        {data.wallet.length === 0 ? (
          <p className="py-2 text-[14px] text-[var(--glow-gray)]">Aucun mouvement.</p>
        ) : (
          data.wallet.map((w) => (
            <DetailRow
              key={w.id}
              label={w.type === 'purchase' ? 'Débit (achat)' : w.type === 'refund' ? 'Remboursement' : w.type}
              value={
                <span className="flex flex-col items-end">
                  <span className={w.amount_xof > 0 ? 'font-semibold text-[rgb(28,120,28)]' : 'font-semibold'}>{signedFCFA(w.amount_xof)}</span>
                  <span className="text-[12px] text-[var(--glow-gray)]">{longDate(w.created_at)}</span>
                </span>
              }
            />
          ))
        )}
      </DetailSection>

      <DetailSection title="Fournisseur (5sim)" icon={Phone}>
        <DetailRow label="N° de commande" value={o.fivesim_order_id ?? '—'} mono copy={o.fivesim_order_id ? String(o.fivesim_order_id) : null} />
        <DetailRow label="Statut 5sim" value={o.provider_status ?? '—'} mono />
        <DetailRow label="Référence Numflash" value={o.id} mono copy={o.id} />
      </DetailSection>

      <DetailSection title="Historique" icon={History}>
        <Timeline events={data.events} />
      </DetailSection>
    </>
  )
}

export default function AdminSales() {
  const { group, period, search, page, selected, update } = useListParams<Group>(GROUPS, 'all')
  const [reloadKey, setReloadKey] = useState(0)
  const range = periodRange(period)

  useEffect(() => {
    const prev = document.title
    document.title = 'Ventes — Administration Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  const summary = useRpc<Summary>('admin_orders_summary', { p_from: range.from, p_to: range.to }, reloadKey)
  const list = useRpc<OrderRow[]>(
    'admin_list_orders',
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
    { value: 'success', label: `Réussies${s ? ` · ${s.success}` : ''}` },
    { value: 'pending', label: `En attente${s ? ` · ${s.pending}` : ''}` },
    { value: 'canceled', label: `Annulées${s ? ` · ${s.canceled}` : ''}` },
    { value: 'failed', label: `Expirées et échecs${s ? ` · ${s.failed}` : ''}` },
  ]

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader
        title="Suivi des "
        accent="ventes"
        subtitle="Tous les numéros vendus, réussis, annulés ou remboursés."
        aside={
          <Button icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)} loading={list.loading && rows.length > 0}>
            Actualiser
          </Button>
        }
      />

      <Segmented value={period} options={PERIODS} onChange={(v: PeriodKey) => update({ periode: v })} label="Période" />

      <div className="grid grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
        <Kpi tone="hero" icon={TrendingUp} label="Chiffre d’affaires" value={s ? formatFCFA(s.revenue_xof) : '…'} hint={s ? `${s.success} vente${s.success > 1 ? 's' : ''} conservée${s.success > 1 ? 's' : ''}` : undefined} />
        <Kpi icon={Coins} label="Marge brute" value={s ? formatFCFA(s.margin_xof) : '…'} hint={s ? `Coût 5sim : ${formatFCFA(s.cost_xof)}` : undefined} />
        <Kpi icon={ReceiptText} label="Ventes" value={s ? String(s.total) : '…'} hint={s ? `${s.pending} en attente` : undefined} />
        <Kpi icon={XCircle} label="Annulées et échecs" value={s ? String(s.canceled + s.failed) : '…'} hint={s ? `Remboursé : ${formatFCFA(s.refunded_xof)}` : undefined} />
      </div>

      {summary.error ? <Notice icon={XCircle}>{summary.error}</Notice> : null}

      <Card>
        <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
          <Segmented value={group} options={groupOptions} onChange={(v: Group) => update({ statut: v === 'all' ? null : v })} label="Statut des ventes" />
          <SearchBox value={search} onChange={(v) => update({ q: v || null })} placeholder="Client, numéro, service, n° 5sim…" />
        </div>
        {list.error ? <Notice icon={XCircle}>{list.error}</Notice> : null}
        <DataTable
          rows={rows}
          columns={columns}
          loading={list.loading}
          selectedId={selected}
          onOpen={(r) => update({ id: r.id }, false)}
          empty={search ? 'Aucune vente ne correspond à cette recherche.' : 'Aucune vente sur cette période.'}
        />
        <Pager page={page} pageSize={PAGE} total={total} onPage={(p) => update({ page: p > 0 ? String(p) : null }, false)} />
      </Card>

      <Drawer
        open={Boolean(selected)}
        onClose={close}
        icon={selectedRow ? <ServiceTile name={selectedRow.service_name ?? selectedRow.service_slug} slug={selectedRow.service_slug} size={40} radius={11} /> : undefined}
        title={selectedRow ? `${selectedRow.service_name ?? selectedRow.service_slug} · ${formatFCFA(selectedRow.price_xof)}` : 'Détail de la vente'}
        subtitle={selectedRow ? <>{shortDate(selectedRow.created_at)} · {selectedRow.user_name || selectedRow.user_email}</> : null}
      >
        {selected ? <OrderPanel id={selected} reloadKey={reloadKey} /> : null}
      </Drawer>
    </div>
  )
}
