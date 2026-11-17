import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import {
  ArrowDownLeft,
  ArrowLeft,
  Ban,
  Coins,
  History,
  IdCard,
  MessageSquarePlus,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  Unlock,
  Wallet,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { translateAdminError, type RpcError } from '@/lib/admin-errors'
import { fractionToPercent, parseIntegerInput } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { cn, formatFCFA } from '@/lib/utils'
import { MessageCard } from '../client/UserMessages'
import { ServiceTile } from '../landing/ui'
import { OrderPanel, OrderStatusPill, type OrderRow } from './AdminSales'
import { NetworkChip, TopupPanel, TopupStatusPill, type TopupRow } from './AdminTopups'
import { AccountPill, useCancelThreshold } from './AdminUsers'
import { Avatar, Button, Card, Field, Kpi, Notice, Segmented, TextInput, inputClass } from './ui'
import {
  DataTable,
  DetailRow,
  DetailSection,
  Drawer,
  Pager,
  StatusPill,
  Timeline,
  longDate,
  shortDate,
  signedFCFA,
  useRpc,
  type AuditEvent,
  type Column,
} from './records'

/*
 * Dossier d'un utilisateur : identité, solde, statistiques, numéros achetés, recharges,
 * mouvements de solde, messages, activité ; actions (ajuster le solde, envoyer un message,
 * bloquer, supprimer). Toutes les écritures passent par les RPC admin_* ou admin-user-delete.
 */

interface Dossier {
  user: {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    role: 'user' | 'admin'
    is_blocked: boolean
    deleted_at: string | null
    created_at: string
    last_sign_in_at: string | null
    email_confirmed_at: string | null
    balance_xof: number
    unread_messages: number
  }
  orders: { total: number; success: number; pending: number; canceled: number; failed: number; revenue_xof: number; margin_xof: number; last_order_at: string | null }
  money: { topped_up_xof: number; spent_xof: number; refunded_xof: number; adjusted_xof: number }
  topups: { total: number; succeeded: number; pending: number; failed: number }
  recent: { sample: number; user_cancels: number; window: number }
}

type DossierUser = Dossier['user']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TABS = ['numeros', 'recharges', 'solde', 'messages', 'activite'] as const
type Tab = (typeof TABS)[number]

type Panel =
  | { kind: 'order'; id: string }
  | { kind: 'topup'; id: string }
  | { kind: 'adjust'; preset?: { direction: 'credit' | 'debit'; amount: number; reason: string } }
  | { kind: 'message' }
  | { kind: 'block' }
  | { kind: 'delete' }

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

const textareaClass = cn(inputClass, 'h-auto min-h-[132px] resize-y py-3 leading-[22px]')

function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 pt-1">{children}</div>
}

function AdjustForm({ user, preset, onDone, onCancel }: { user: DossierUser; preset?: { direction: 'credit' | 'debit'; amount: number; reason: string }; onDone: () => void; onCancel: () => void }) {
  const [direction, setDirection] = useState<'credit' | 'debit'>(preset?.direction ?? 'credit')
  const [amount, setAmount] = useState(preset ? String(preset.amount) : '')
  const [reason, setReason] = useState(preset?.reason ?? '')
  const [saving, setSaving] = useState(false)
  const value = parseIntegerInput(amount)
  const signed = value === null ? null : direction === 'credit' ? value : -value
  const after = signed === null ? null : user.balance_xof + signed
  const negative = after !== null && after < 0
  const invalid = !value || reason.trim().length < 5 || negative

  async function submit() {
    if (invalid || signed === null) return
    setSaving(true)
    const { data, error } = await supabase.rpc('admin_adjust_balance', { p_user_id: user.id, p_amount_xof: signed, p_reason: reason.trim() })
    setSaving(false)
    if (error) return void toast.error(translateAdminError(error))
    toast.success(`Solde ajusté : ${formatFCFA((data as { balance_after: number }).balance_after)}.`)
    onDone()
  }

  return (
    <DetailSection title="Ajuster le solde" icon={WalletCards}>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-[14px] leading-[20px] text-[var(--glow-gray)]">
          Solde actuel : <span className="font-semibold text-black">{formatFCFA(user.balance_xof)}</span>. L’ajustement ajoute une ligne au registre du solde ; rien n’est modifié ni effacé.
        </p>
        <Segmented
          label="Sens de l’ajustement"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'credit', label: 'Créditer' },
            { value: 'debit', label: 'Débiter' },
          ]}
        />
        <Field
          id="adjust-amount"
          label="Montant (FCFA)"
          error={negative ? `Le solde deviendrait négatif (${formatFCFA(after)}).` : undefined}
          hint={after !== null ? `Nouveau solde : ${formatFCFA(after)}` : 'Nombre entier, sans décimale.'}
        >
          <TextInput id="adjust-amount" inputMode="numeric" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={negative} />
        </Field>
        <Field id="adjust-reason" label="Motif (obligatoire)" hint="Inscrit au journal d’audit. 5 caractères minimum.">
          <TextInput id="adjust-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ex. remboursement d’un code non reçu" />
        </Field>
        <FormActions>
          <Button variant="primary" loading={saving} onClick={() => void submit()} disabled={invalid}>
            {value ? `${direction === 'credit' ? 'Créditer' : 'Débiter'} ${formatFCFA(value)}` : 'Valider'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </FormActions>
      </div>
    </DetailSection>
  )
}

function MessageForm({ user, onDone, onCancel }: { user: DossierUser; onDone: () => void; onCancel: () => void }) {
  const [level, setLevel] = useState<'info' | 'warning'>('info')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const invalid = title.trim().length === 0 || body.trim().length === 0

  async function submit() {
    if (invalid) return
    setSaving(true)
    const { error } = await supabase.rpc('admin_send_user_message', { p_user_id: user.id, p_title: title.trim(), p_body: body.trim(), p_level: level })
    setSaving(false)
    if (error) return void toast.error(translateAdminError(error))
    toast.success('Message envoyé. Le client le verra à sa prochaine visite.')
    onDone()
  }

  return (
    <>
      <DetailSection title="Envoyer un message" icon={MessageSquarePlus}>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-[14px] leading-[20px] text-[var(--glow-gray)]">
            Le message s’affiche en haut de l’espace client de {user.full_name || 'ce client'} dès sa prochaine connexion, jusqu’à ce que le client clique sur « J’ai compris ». Aucun e-mail n’est envoyé.
          </p>
          <Segmented
            label="Type de message"
            value={level}
            onChange={setLevel}
            options={[
              { value: 'info', label: 'Information' },
              { value: 'warning', label: 'Avertissement' },
            ]}
          />
          <Field id="msg-title" label="Titre" hint={`${title.trim().length}/120`}>
            <TextInput id="msg-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ex. Votre remboursement est arrivé" />
          </Field>
          <Field id="msg-body" label="Message" hint={`${body.trim().length}/2000`}>
            <textarea id="msg-body" className={textareaClass} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Rédigez votre message en vouvoyant le client." />
          </Field>
          <FormActions>
            <Button variant="primary" icon={MessageSquarePlus} loading={saving} onClick={() => void submit()} disabled={invalid}>
              Envoyer le message
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          </FormActions>
        </div>
      </DetailSection>
      <div className="flex flex-col gap-2">
        <span className="px-1 text-[13px] font-semibold uppercase tracking-[0.4px] text-[var(--glow-gray)]">Aperçu côté client</span>
        <MessageCard message={{ title: title.trim(), body: body.trim(), level }} preview />
      </div>
    </>
  )
}

function BlockForm({ user, onDone, onCancel }: { user: DossierUser; onDone: () => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const blocking = !user.is_blocked
  const invalid = blocking && reason.trim().length < 5

  async function submit() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_set_user_blocked', { p_user_id: user.id, p_blocked: blocking, p_reason: reason.trim() || null })
    setSaving(false)
    if (error) return void toast.error(translateAdminError(error))
    toast.success(blocking ? 'Compte suspendu.' : 'Compte réactivé.')
    onDone()
  }

  return (
    <DetailSection title={blocking ? 'Suspendre le compte' : 'Réactiver le compte'} icon={blocking ? Ban : Unlock}>
      <div className="flex flex-col gap-4 py-2">
        <p className="text-[14px] leading-[20px] text-[var(--glow-gray)]">
          {blocking
            ? 'Un compte suspendu ne peut plus recharger ni acheter de numéro. Son solde et son historique sont conservés ; vous pourrez le réactiver à tout moment.'
            : 'Le client pourra de nouveau recharger et acheter des numéros.'}
        </p>
        <Field id="block-reason" label={blocking ? 'Motif (obligatoire)' : 'Motif (facultatif)'} hint="Inscrit au journal d’audit.">
          <TextInput id="block-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder={blocking ? 'Ex. annulations abusives répétées' : ''} />
        </Field>
        <FormActions>
          <Button variant={blocking ? 'dark' : 'primary'} icon={blocking ? Ban : Unlock} loading={saving} onClick={() => void submit()} disabled={invalid}>
            {blocking ? 'Suspendre le compte' : 'Réactiver le compte'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </FormActions>
      </div>
    </DetailSection>
  )
}

async function deleteError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as { message?: unknown } | null
    if (typeof body?.message === 'string' && body.message) return body.message
  }
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) return 'Connexion impossible. Vérifiez votre connexion internet et réessayez.'
  return 'La suppression a échoué. Réessayez.'
}

function DeleteForm({ dossier, onDone, onCancel, onZeroBalance }: { dossier: Dossier; onDone: () => void; onCancel: () => void; onZeroBalance: () => void }) {
  const { user } = dossier
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const balanceLeft = user.balance_xof !== 0
  const busyItems = dossier.orders.pending > 0 || dossier.topups.pending > 0
  const invalid = reason.trim().length < 5 || confirm.trim() !== 'SUPPRIMER' || balanceLeft

  async function submit() {
    if (invalid) return
    setSaving(true)
    const { error } = await supabase.functions.invoke('admin-user-delete', { body: { user_id: user.id, reason: reason.trim(), confirm: 'SUPPRIMER' } })
    setSaving(false)
    if (error) return void toast.error(await deleteError(error))
    toast.success('Compte supprimé. Les données personnelles ont été effacées.')
    onDone()
  }

  return (
    <DetailSection title="Supprimer le compte" icon={Trash2}>
      <div className="flex flex-col gap-4 py-2">
        <ul className="flex flex-col gap-1.5 text-[14px] leading-[20px] text-[var(--glow-text)]">
          <li>• Nom, téléphone et e-mail sont effacés ; le client ne peut plus se connecter.</li>
          <li>• Ses messages sont supprimés.</li>
          <li>• Les ventes, recharges et mouvements de solde sont conservés, sans données personnelles, pour la comptabilité.</li>
          <li className="font-medium text-[rgb(153,27,27)]">• Cette action est définitive.</li>
        </ul>
        {balanceLeft ? (
          <Notice tone="amber" icon={Wallet}>
            Le solde est de <strong>{formatFCFA(user.balance_xof)}</strong>. Remettez-le à 0 FCFA avant la suppression (après remboursement du client par un autre moyen, par exemple).
            <div className="pt-2">
              <Button size="sm" icon={WalletCards} onClick={onZeroBalance}>
                Remettre le solde à 0 FCFA
              </Button>
            </div>
          </Notice>
        ) : null}
        {busyItems ? (
          <Notice tone="amber" icon={ShieldAlert}>
            Un numéro ou une recharge est encore en cours pour ce compte : la suppression sera refusée tant qu’ils ne sont pas terminés.
          </Notice>
        ) : null}
        <Field id="delete-reason" label="Motif (obligatoire)" hint="Inscrit au journal d’audit. 5 caractères minimum.">
          <TextInput id="delete-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ex. demande de suppression du client" />
        </Field>
        <Field id="delete-confirm" label="Tapez SUPPRIMER pour confirmer">
          <TextInput id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="SUPPRIMER" />
        </Field>
        <FormActions>
          <Button variant="dark" icon={Trash2} loading={saving} onClick={() => void submit()} disabled={invalid}>
            Supprimer définitivement
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </FormActions>
      </div>
    </DetailSection>
  )
}

/* ------------------------------------------------------------------ */
/* Onglets                                                             */
/* ------------------------------------------------------------------ */

const LIST_PAGE = 10

const ORDER_GROUPS = [
  { value: 'all', label: 'Tous' },
  { value: 'success', label: 'Réussis' },
  { value: 'pending', label: 'En attente' },
  { value: 'canceled', label: 'Annulés' },
  { value: 'failed', label: 'Échecs' },
] as const
type OrderGroup = (typeof ORDER_GROUPS)[number]['value']

const orderColumns: Column<OrderRow>[] = [
  {
    key: 'service',
    header: 'Numéro',
    mobileWidth: 'w-[64%]',
    cell: (o) => (
      <span className="flex min-w-0 items-center gap-3">
        <ServiceTile name={o.service_name ?? o.service_slug} slug={o.service_slug} size={34} radius={9} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-black">
            {o.service_name ?? o.service_slug} <span className="font-normal text-[var(--glow-gray)]">· {o.country_flag ?? '🌐'} {o.country_name ?? o.country_code}</span>
          </span>
          <span className="truncate text-[12px] text-[var(--glow-gray)]">
            <span className="font-glow-mono">{o.phone || 'Non attribué'}</span>
            <span className="min-[810px]:hidden"> · {shortDate(o.created_at)}</span>
          </span>
        </span>
      </span>
    ),
  },
  { key: 'date', header: 'Date', wide: true, cell: (o) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{shortDate(o.created_at)}</span> },
  { key: 'sms', header: 'Code', wide: true, cell: (o) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{o.sms_count > 0 ? plural(o.sms_count, 'SMS', 'SMS') : '—'}</span> },
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
  { key: 'status', header: 'Résultat', wide: true, cell: (o) => <OrderStatusPill status={o.status} /> },
]

function OrdersTab({ userId, reloadKey, selected, onOpen }: { userId: string; reloadKey: number; selected: string | null; onOpen: (id: string) => void }) {
  const [group, setGroup] = useState<OrderGroup>('all')
  const [page, setPage] = useState(0)
  const list = useRpc<OrderRow[]>('admin_list_orders', { p_group: group, p_user_id: userId, p_limit: LIST_PAGE, p_offset: page * LIST_PAGE }, reloadKey)
  const rows = list.data ?? []
  const total = rows[0]?.total_count ?? 0
  return (
    <>
      <Segmented
        value={group}
        options={[...ORDER_GROUPS]}
        onChange={(v: OrderGroup) => {
          setGroup(v)
          setPage(0)
        }}
        label="Résultat des numéros"
      />
      {list.error ? <Notice icon={XCircle}>{list.error}</Notice> : null}
      <DataTable rows={rows} columns={orderColumns} loading={list.loading} selectedId={selected} onOpen={(o) => onOpen(o.id)} empty="Aucun numéro dans cette catégorie." />
      <Pager page={page} pageSize={LIST_PAGE} total={total} onPage={setPage} />
    </>
  )
}

const topupColumns: Column<TopupRow>[] = [
  {
    key: 'network',
    header: 'Recharge',
    mobileWidth: 'w-[64%]',
    cell: (t) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <NetworkChip code={t.payer_network} />
        <span className="truncate text-[12px] text-[var(--glow-gray)]">
          <span className="font-glow-mono">{t.payer_phone ?? '—'}</span>
          <span className="min-[810px]:hidden"> · {shortDate(t.created_at)}</span>
        </span>
      </span>
    ),
  },
  { key: 'date', header: 'Date', wide: true, cell: (t) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{shortDate(t.created_at)}</span> },
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

function TopupsTab({ userId, reloadKey, selected, onOpen }: { userId: string; reloadKey: number; selected: string | null; onOpen: (id: string) => void }) {
  const [page, setPage] = useState(0)
  const list = useRpc<TopupRow[]>('admin_list_topups', { p_group: 'all', p_user_id: userId, p_limit: LIST_PAGE, p_offset: page * LIST_PAGE }, reloadKey)
  const rows = list.data ?? []
  const total = rows[0]?.total_count ?? 0
  return (
    <>
      {list.error ? <Notice icon={XCircle}>{list.error}</Notice> : null}
      <DataTable rows={rows} columns={topupColumns} loading={list.loading} selectedId={selected} onOpen={(t) => onOpen(t.id)} empty="Aucune recharge pour ce compte." />
      <Pager page={page} pageSize={LIST_PAGE} total={total} onPage={setPage} />
    </>
  )
}

/** Lecture paginée d'une table (les politiques RLS admin autorisent la lecture). */
function usePagedTable<T>(load: (from: number, to: number) => PromiseLike<{ data: unknown; error: RpcError | null; count: number | null }>, key: string, page: number, size: number, reloadKey: number) {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void load(page * size, page * size + size - 1).then(({ data, error: e, count }) => {
      if (!active) return
      if (e) setError(translateAdminError(e))
      else {
        setRows((data ?? []) as T[])
        setTotal(count ?? 0)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, size, reloadKey])
  return { rows, total, loading, error }
}

interface WalletRow {
  id: string
  type: 'topup' | 'purchase' | 'refund' | 'bonus' | 'adjustment'
  amount_xof: number
  note: string | null
  order_id: string | null
  topup_id: string | null
  created_at: string
}

const WALLET_LABELS: Record<WalletRow['type'], string> = {
  topup: 'Recharge',
  purchase: 'Achat d’un numéro',
  refund: 'Remboursement',
  bonus: 'Bonus',
  adjustment: 'Ajustement administrateur',
}

const walletColumns: Column<WalletRow>[] = [
  {
    key: 'type',
    header: 'Mouvement',
    mobileWidth: 'w-[62%]',
    cell: (w) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-black">{WALLET_LABELS[w.type] ?? w.type}</span>
        <span className="truncate text-[12px] text-[var(--glow-gray)]">
          {w.note || (w.order_id ? 'Voir la vente' : w.topup_id ? 'Voir la recharge' : '—')}
          <span className="min-[810px]:hidden"> · {shortDate(w.created_at)}</span>
        </span>
      </span>
    ),
  },
  { key: 'date', header: 'Date', wide: true, cell: (w) => <span className="whitespace-nowrap text-[var(--glow-gray)]">{shortDate(w.created_at)}</span> },
  {
    key: 'amount',
    header: 'Montant',
    align: 'right',
    mobileWidth: 'w-[38%]',
    cell: (w) => <span className={cn('whitespace-nowrap font-semibold', w.amount_xof > 0 ? 'text-[rgb(28,120,28)]' : 'text-black')}>{signedFCFA(w.amount_xof)}</span>,
  },
]

function WalletTab({ userId, reloadKey, onOrder, onTopup }: { userId: string; reloadKey: number; onOrder: (id: string) => void; onTopup: (id: string) => void }) {
  const [page, setPage] = useState(0)
  const load = useCallback(
    (from: number, to: number) =>
      supabase
        .from('wallet_transactions')
        .select('id, type, amount_xof, note, order_id, topup_id, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to),
    [userId],
  )
  const { rows, total, loading, error } = usePagedTable<WalletRow>(load, userId, page, LIST_PAGE, reloadKey)
  return (
    <>
      <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">Registre du solde : chaque ligne est définitive. Le solde est la somme de toutes les lignes.</p>
      {error ? <Notice icon={XCircle}>{error}</Notice> : null}
      <DataTable
        rows={rows}
        columns={walletColumns}
        loading={loading}
        selectedId={null}
        canOpen={(w) => Boolean(w.order_id || w.topup_id)}
        onOpen={(w) => (w.order_id ? onOrder(w.order_id) : w.topup_id ? onTopup(w.topup_id) : undefined)}
        empty="Aucun mouvement de solde."
      />
      <Pager page={page} pageSize={LIST_PAGE} total={total} onPage={setPage} />
    </>
  )
}

interface MessageRow {
  id: string
  title: string
  body: string
  level: 'info' | 'warning'
  created_at: string
  read_at: string | null
}

function MessagesTab({ userId, reloadKey, onWrite, canWrite }: { userId: string; reloadKey: number; onWrite: () => void; canWrite: boolean }) {
  const [page, setPage] = useState(0)
  const load = useCallback(
    (from: number, to: number) =>
      supabase
        .from('user_messages')
        .select('id, title, body, level, created_at, read_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to),
    [userId],
  )
  const { rows, total, loading, error } = usePagedTable<MessageRow>(load, userId, page, LIST_PAGE, reloadKey)
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">Messages affichés dans l’espace du client.</p>
        {canWrite ? (
          <Button size="sm" icon={MessageSquarePlus} onClick={onWrite}>
            Nouveau message
          </Button>
        ) : null}
      </div>
      {error ? <Notice icon={XCircle}>{error}</Notice> : null}
      {loading && rows.length === 0 ? (
        <div className="h-24 animate-pulse rounded-2xl bg-[var(--glow-bg)]" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-[var(--glow-gray)]">Aucun message envoyé à ce client.</p>
      ) : (
        <ul className={cn('flex flex-col gap-2', loading && 'opacity-60')}>
          {rows.map((m) => (
            <li key={m.id} className="flex flex-col gap-1.5 rounded-2xl bg-[var(--glow-bg)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={m.level === 'warning' ? 'amber' : 'blue'}>{m.level === 'warning' ? 'Avertissement' : 'Information'}</StatusPill>
                <StatusPill tone={m.read_at ? 'green' : 'neutral'}>{m.read_at ? `Lu le ${shortDate(m.read_at)}` : 'Pas encore lu'}</StatusPill>
                <span className="ml-auto text-[12px] text-[var(--glow-gray)]">Envoyé le {shortDate(m.created_at)}</span>
              </div>
              <span className="text-[15px] font-semibold text-black [overflow-wrap:anywhere]">{m.title}</span>
              <p className="whitespace-pre-line text-[14px] leading-[20px] text-[var(--glow-text)] [overflow-wrap:anywhere]">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pageSize={LIST_PAGE} total={total} onPage={setPage} />
    </>
  )
}

const ACTIVITY_PAGE = 20

function ActivityTab({ userId, reloadKey }: { userId: string; reloadKey: number }) {
  const [page, setPage] = useState(0)
  const ref = `"user:${userId}"`
  const load = useCallback(
    (from: number, to: number) =>
      supabase
        .from('audit_log')
        .select('id, created_at, actor, action, payload', { count: 'exact' })
        .or(`actor.eq.${ref},target.eq.${ref}`)
        .order('created_at', { ascending: false })
        .range(from, to),
    [ref],
  )
  const { rows, total, loading, error } = usePagedTable<AuditEvent & { id: string }>(load, userId, page, ACTIVITY_PAGE, reloadKey)
  return (
    <>
      <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">
        Achats tentés (service et pays demandés, y compris les refus), recharges lancées et actions de l’administration sur ce compte.
      </p>
      {error ? <Notice icon={XCircle}>{error}</Notice> : null}
      {loading && rows.length === 0 ? <div className="h-32 animate-pulse rounded-2xl bg-[var(--glow-bg)]" /> : <div className={cn(loading && 'opacity-60')}><Timeline events={rows} /></div>}
      <Pager page={page} pageSize={ACTIVITY_PAGE} total={total} onPage={setPage} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Header({
  dossier,
  isMe,
  onAction,
}: {
  dossier: Dossier
  isMe: boolean
  onAction: (p: Panel) => void
}) {
  const u = dossier.user
  const deleted = Boolean(u.deleted_at)
  const name = deleted ? 'Compte supprimé' : u.full_name || 'Sans nom'
  return (
    <Card>
      <div className="flex flex-col gap-4 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name} size={56} />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex flex-wrap items-center gap-2 font-glow-display text-[24px] font-medium leading-[28px] tracking-[-0.8px] text-black min-[810px]:text-[28px] min-[810px]:leading-[32px]">
              <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
              {isMe ? <span className="text-[14px] font-normal text-[var(--glow-gray)]">(vous)</span> : null}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <AccountPill user={u} />
              {u.role === 'admin' ? <StatusPill tone="blue">Administrateur</StatusPill> : null}
              {u.unread_messages > 0 ? <StatusPill tone="amber">{plural(u.unread_messages, 'message non lu', 'messages non lus')}</StatusPill> : null}
            </div>
            <p className="truncate text-[14px] text-[var(--glow-gray)]">
              {deleted ? `Supprimé le ${longDate(u.deleted_at)}` : [u.email, u.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {deleted || isMe ? null : (
          <div className="grid grid-cols-2 gap-2 min-[480px]:flex min-[480px]:flex-wrap [&>button]:whitespace-nowrap [&>button]:px-3 [&>button]:text-[14px] min-[810px]:[&>button]:px-4 min-[810px]:[&>button]:text-[15px]">
            <Button icon={WalletCards} onClick={() => onAction({ kind: 'adjust' })}>
              Ajuster le solde
            </Button>
            <Button icon={MessageSquarePlus} onClick={() => onAction({ kind: 'message' })}>
              Message
            </Button>
            <Button variant={u.is_blocked ? 'secondary' : 'danger'} icon={u.is_blocked ? Unlock : Ban} onClick={() => onAction({ kind: 'block' })}>
              {u.is_blocked ? 'Réactiver' : 'Suspendre'}
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => onAction({ kind: 'delete' })}
              disabled={u.role === 'admin'}
              title={u.role === 'admin' ? 'Un compte administrateur ne peut pas être supprimé.' : undefined}
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'numeros', label: 'Numéros' },
  { value: 'recharges', label: 'Recharges' },
  { value: 'solde', label: 'Solde' },
  { value: 'messages', label: 'Messages' },
  { value: 'activite', label: 'Activité' },
]

const PANEL_ICONS: Record<Panel['kind'], { icon: typeof Wallet; danger?: boolean }> = {
  order: { icon: MessageSquareText },
  topup: { icon: ArrowDownLeft },
  adjust: { icon: WalletCards },
  message: { icon: MessageSquarePlus },
  block: { icon: Ban, danger: true },
  delete: { icon: Trash2, danger: true },
}

function PanelIcon({ kind }: { kind: Panel['kind'] }) {
  const { icon: I, danger } = PANEL_ICONS[kind]
  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]',
        danger ? 'bg-[rgb(254,242,242)] text-[rgb(185,28,28)]' : 'bg-[rgb(222,242,255)] text-[var(--glow-blue-dark)]',
      )}
    >
      <I className="h-5 w-5" strokeWidth={2} aria-hidden />
    </span>
  )
}

const PANEL_TITLES: Record<Panel['kind'], string> = {
  order: 'Détail du numéro',
  topup: 'Détail de la recharge',
  adjust: 'Ajuster le solde',
  message: 'Envoyer un message',
  block: 'Statut du compte',
  delete: 'Supprimer le compte',
}

export default function AdminUserDossier() {
  const { userId = '' } = useParams()
  const { user: me } = useAuth()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('onglet') as Tab | null
  const tab: Tab = rawTab && TABS.includes(rawTab) ? rawTab : 'numeros'
  const [reloadKey, setReloadKey] = useState(0)
  const [panel, setPanel] = useState<Panel | null>(null)
  const threshold = useCancelThreshold()
  const valid = UUID.test(userId)

  const { data, loading, error } = useRpc<Dossier>('admin_user_dossier', valid ? { p_user_id: userId } : null, reloadKey)

  useEffect(() => {
    const prev = document.title
    const name = data?.user.deleted_at ? 'Compte supprimé' : data?.user.full_name || data?.user.email
    document.title = `${name ?? 'Dossier client'} — Administration Numflash`
    return () => {
      document.title = prev
    }
  }, [data])

  const close = useCallback(() => setPanel(null), [])
  const done = useCallback(() => {
    setPanel(null)
    setReloadKey((k) => k + 1)
  }, [])

  const setTab = (t: Tab) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (t === 'numeros') next.delete('onglet')
        else next.set('onglet', t)
        return next
      },
      { replace: true },
    )

  const back = (
    <Link to="/admin/utilisateurs" className="inline-flex w-max items-center gap-1.5 text-[14px] font-medium text-[var(--glow-gray)] hover:text-black">
      <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
      Utilisateurs
    </Link>
  )

  if (!valid || (error && !data)) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <Notice icon={XCircle}>{!valid ? 'Identifiant d’utilisateur invalide.' : error === 'Élément introuvable.' ? 'Utilisateur introuvable.' : error}</Notice>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-5" aria-busy={loading}>
        {back}
        <div className="h-[132px] animate-pulse rounded-[28px] bg-white" />
        <div className="grid grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-[28px] bg-white" />
      </div>
    )
  }

  const u = data.user
  const isMe = u.id === me?.id
  const deleted = Boolean(u.deleted_at)
  const cancelRatio = data.recent.sample > 0 ? data.recent.user_cancels / data.recent.sample : null
  const flagged = cancelRatio !== null && cancelRatio > threshold
  const netSpent = data.money.spent_xof - data.money.refunded_xof

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <div className="flex items-center justify-between gap-3">
        {back}
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)} loading={loading}>
          Actualiser
        </Button>
      </div>

      <Header dossier={data} isMe={isMe} onAction={setPanel} />

      {deleted ? (
        <Notice tone="blue" icon={Trash2}>
          Ce compte a été supprimé le {longDate(u.deleted_at)}. Ses données personnelles sont effacées et il ne peut plus se connecter ; l’historique financier reste consultable ci-dessous.
        </Notice>
      ) : u.is_blocked ? (
        <Notice icon={Ban}>Compte suspendu : ce client ne peut plus recharger ni acheter de numéro.</Notice>
      ) : null}
      {flagged && !deleted ? (
        <Notice tone="amber" icon={ShieldAlert}>
          Taux d’annulation élevé : {data.recent.user_cancels} annulation{data.recent.user_cancels > 1 ? 's' : ''} sur ses {data.recent.sample} dernières commandes.
        </Notice>
      ) : null}

      <div className="grid grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
        <Kpi tone="hero" icon={Wallet} label="Solde" value={formatFCFA(u.balance_xof)} hint={data.money.adjusted_xof !== 0 ? `Dont ajustements : ${signedFCFA(data.money.adjusted_xof)}` : undefined} />
        <Kpi
          icon={ShoppingBag}
          label="Numéros achetés"
          value={String(data.orders.total)}
          hint={`${data.orders.success} réussi${data.orders.success > 1 ? 's' : ''} · ${data.orders.canceled} annulé${data.orders.canceled > 1 ? 's' : ''} · ${data.orders.failed} échec${data.orders.failed > 1 ? 's' : ''}`}
        />
        <Kpi icon={Coins} label="Dépensé" value={formatFCFA(netSpent)} hint={data.money.refunded_xof > 0 ? `Remboursé : ${formatFCFA(data.money.refunded_xof)}` : 'Achats conservés'} />
        <Kpi icon={ArrowDownLeft} label="Rechargé" value={formatFCFA(data.money.topped_up_xof)} hint={`${plural(data.topups.succeeded, 'recharge réussie', 'recharges réussies')}${data.topups.failed ? ` · ${data.topups.failed} échouée${data.topups.failed > 1 ? 's' : ''}` : ''}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2 min-[1024px]:items-start">
        <DetailSection title="Informations" icon={IdCard}>
          <DetailRow label="Nom" value={u.full_name ?? '—'} />
          <DetailRow label="E-mail" value={deleted ? '—' : u.email} copy={deleted ? null : u.email} />
          <DetailRow label="Téléphone" value={u.phone ?? '—'} mono={Boolean(u.phone)} copy={u.phone} />
          <DetailRow label="Rôle" value={u.role === 'admin' ? 'Administrateur' : 'Client'} />
          <DetailRow label="Inscrit le" value={longDate(u.created_at)} />
          <DetailRow label="Dernière connexion" value={u.last_sign_in_at ? longDate(u.last_sign_in_at) : 'Jamais'} />
          <DetailRow label="E-mail confirmé" value={u.email_confirmed_at ? `Oui, le ${shortDate(u.email_confirmed_at)}` : 'Non'} />
          <DetailRow label="Identifiant" value={u.id} mono copy={u.id} />
        </DetailSection>

        <div className="flex flex-col gap-4">
          <DetailSection title="Argent" icon={Coins}>
            <DetailRow label="Recharges créditées" value={signedFCFA(data.money.topped_up_xof)} />
            <DetailRow label="Achats de numéros" value={signedFCFA(-data.money.spent_xof)} />
            <DetailRow label="Remboursements" value={signedFCFA(data.money.refunded_xof)} />
            <DetailRow label="Ajustements et bonus" value={signedFCFA(data.money.adjusted_xof)} />
            <DetailRow label="Solde actuel" value={<span className="font-semibold">{formatFCFA(u.balance_xof)}</span>} />
          </DetailSection>
          <DetailSection title="Comportement" icon={History}>
            <DetailRow label="Chiffre d’affaires généré" value={formatFCFA(data.orders.revenue_xof)} />
            <DetailRow label="Marge générée" value={formatFCFA(data.orders.margin_xof)} />
            <DetailRow label="Dernier achat" value={data.orders.last_order_at ? longDate(data.orders.last_order_at) : 'Aucun'} />
            <DetailRow
              label="Annulations récentes"
              value={
                cancelRatio === null ? (
                  '—'
                ) : (
                  <span className={flagged ? 'font-semibold text-[rgb(185,28,28)]' : undefined}>
                    {fractionToPercent(cancelRatio)} % ({data.recent.user_cancels}/{data.recent.sample})
                  </span>
                )
              }
            />
            <DetailRow label="Numéros en cours" value={String(data.orders.pending)} />
            <DetailRow label="Recharges en attente" value={String(data.topups.pending)} />
          </DetailSection>
        </div>
      </div>

      <Card>
        <Segmented value={tab} options={TAB_OPTIONS} onChange={setTab} label="Historique du client" />
        {tab === 'numeros' ? <OrdersTab userId={u.id} reloadKey={reloadKey} selected={panel?.kind === 'order' ? panel.id : null} onOpen={(id) => setPanel({ kind: 'order', id })} /> : null}
        {tab === 'recharges' ? <TopupsTab userId={u.id} reloadKey={reloadKey} selected={panel?.kind === 'topup' ? panel.id : null} onOpen={(id) => setPanel({ kind: 'topup', id })} /> : null}
        {tab === 'solde' ? <WalletTab userId={u.id} reloadKey={reloadKey} onOrder={(id) => setPanel({ kind: 'order', id })} onTopup={(id) => setPanel({ kind: 'topup', id })} /> : null}
        {tab === 'messages' ? <MessagesTab userId={u.id} reloadKey={reloadKey} canWrite={!deleted && !isMe} onWrite={() => setPanel({ kind: 'message' })} /> : null}
        {tab === 'activite' ? <ActivityTab userId={u.id} reloadKey={reloadKey} /> : null}
      </Card>

      <Drawer
        open={panel !== null}
        onClose={close}
        icon={panel ? <PanelIcon kind={panel.kind} /> : undefined}
        title={panel ? PANEL_TITLES[panel.kind] : ''}
        subtitle={deleted ? 'Compte supprimé' : u.full_name || u.email}
      >
        {panel?.kind === 'order' ? <OrderPanel id={panel.id} reloadKey={reloadKey} inDossier /> : null}
        {panel?.kind === 'topup' ? <TopupPanel id={panel.id} reloadKey={reloadKey} inDossier /> : null}
        {panel?.kind === 'adjust' ? <AdjustForm key={JSON.stringify(panel.preset ?? null)} user={u} preset={panel.preset} onDone={done} onCancel={close} /> : null}
        {panel?.kind === 'message' ? <MessageForm user={u} onDone={done} onCancel={close} /> : null}
        {panel?.kind === 'block' ? <BlockForm user={u} onDone={done} onCancel={close} /> : null}
        {panel?.kind === 'delete' ? (
          <DeleteForm
            dossier={data}
            onDone={done}
            onCancel={close}
            onZeroBalance={() =>
              setPanel({
                kind: 'adjust',
                preset: {
                  direction: u.balance_xof > 0 ? 'debit' : 'credit',
                  amount: Math.abs(u.balance_xof),
                  reason: 'Solde remis à zéro avant suppression du compte',
                },
              })
            }
          />
        ) : null}
      </Drawer>
    </div>
  )
}
