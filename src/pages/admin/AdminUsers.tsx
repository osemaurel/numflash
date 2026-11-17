import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fractionToPercent } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { cn, formatFCFA } from '@/lib/utils'
import { Avatar, Button, Card, Notice, PageHeader, Segmented } from './ui'
import { DataTable, Pager, SearchBox, StatusPill, shortDate, useListParams, useRpc, type Column } from './records'

/*
 * Utilisateurs : tableau paginé (25 par page, côté serveur), recherche et filtres dans l'URL.
 * Un clic sur une ligne ouvre le dossier complet du client.
 */

const PAGE = 25
const GROUPS = ['all', 'active', 'blocked', 'admins', 'deleted'] as const
type Group = (typeof GROUPS)[number]

export interface UserRow {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'user' | 'admin'
  is_blocked: boolean
  deleted_at: string | null
  created_at: string
  last_sign_in_at: string | null
  balance_xof: number
  orders_total: number
  recent_sample: number
  recent_user_cancels: number
  cancel_ratio: number | null
  total_count: number
}

const FILTERS: { value: Group; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'blocked', label: 'Bloqués' },
  { value: 'admins', label: 'Admins' },
  { value: 'deleted', label: 'Supprimés' },
]

/** Seuil d'alerte du taux d'annulation (réglage admin). */
export function useCancelThreshold() {
  const [threshold, setThreshold] = useState(0.6)
  useEffect(() => {
    void supabase
      .from('settings')
      .select('value')
      .eq('key', 'cancel_ratio_alert_threshold')
      .maybeSingle()
      .then(({ data }) => {
        const n = Number(data?.value)
        if (Number.isFinite(n) && n > 0) setThreshold(n)
      })
  }, [])
  return threshold
}

export function AccountPill({ user }: { user: Pick<UserRow, 'is_blocked' | 'deleted_at'> }) {
  if (user.deleted_at) return <StatusPill tone="neutral">Supprimé</StatusPill>
  if (user.is_blocked) return <StatusPill tone="red">Bloqué</StatusPill>
  return <StatusPill tone="green">Actif</StatusPill>
}

function displayName(u: UserRow) {
  if (u.deleted_at) return 'Compte supprimé'
  return u.full_name || 'Sans nom'
}

function CancelCell({ u, threshold }: { u: UserRow; threshold: number }) {
  if (u.cancel_ratio === null) return <span className="text-[var(--glow-gray)]">—</span>
  const flagged = u.cancel_ratio > threshold
  return (
    <span className={cn('whitespace-nowrap', flagged ? 'font-semibold text-[rgb(185,28,28)]' : 'text-[var(--glow-text)]')}>
      {fractionToPercent(u.cancel_ratio)} %
      <span className="ml-1 text-[12px] font-normal text-[var(--glow-gray)]">
        ({u.recent_user_cancels}/{u.recent_sample})
      </span>
    </span>
  )
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const { group, search, page, update } = useListParams<Group>(GROUPS, 'all')
  const [reloadKey, setReloadKey] = useState(0)
  const threshold = useCancelThreshold()

  useEffect(() => {
    const prev = document.title
    document.title = 'Utilisateurs — Administration Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  const list = useRpc<UserRow[]>('admin_list_users', { p_search: search || null, p_filter: group, p_limit: PAGE, p_offset: page * PAGE }, reloadKey)
  const rows = list.data ?? []
  const total = rows[0]?.total_count ?? 0

  const columns: Column<UserRow>[] = [
    {
      key: 'user',
      header: 'Utilisateur',
      mobileWidth: 'w-[64%]',
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-3">
          <Avatar name={displayName(u)} size={36} />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={cn('truncate font-medium', u.deleted_at ? 'text-[var(--glow-gray)]' : 'text-black')}>{displayName(u)}</span>
              {u.id === me?.id ? <span className="shrink-0 text-[12px] text-[var(--glow-gray)]">(vous)</span> : null}
              {u.role === 'admin' ? <StatusPill tone="blue">Admin</StatusPill> : null}
            </span>
            <span className="truncate text-[12px] text-[var(--glow-gray)]">{u.deleted_at ? `Supprimé le ${shortDate(u.deleted_at)}` : u.email}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'seen',
      header: 'Connexion',
      wide: true,
      cell: (u) => (
        <span className="flex flex-col whitespace-nowrap">
          <span className="text-[var(--glow-text)]">{u.last_sign_in_at ? shortDate(u.last_sign_in_at) : 'Jamais connecté'}</span>
          <span className="text-[12px] text-[var(--glow-gray)]">Inscrit le {shortDate(u.created_at)}</span>
        </span>
      ),
    },
    { key: 'orders', header: 'Numéros', wide: true, align: 'right', cell: (u) => <span className="font-medium text-black">{u.orders_total}</span> },
    { key: 'cancels', header: 'Annulations', wide: true, cell: (u) => <CancelCell u={u} threshold={threshold} /> },
    {
      key: 'balance',
      header: 'Solde',
      align: 'right',
      mobileWidth: 'w-[36%]',
      cell: (u) => (
        <span className="flex flex-col items-end gap-1">
          <span className="whitespace-nowrap font-semibold text-black">{formatFCFA(u.balance_xof)}</span>
          <span className="min-[810px]:hidden">
            <AccountPill user={u} />
          </span>
        </span>
      ),
    },
    { key: 'status', header: 'Compte', wide: true, cell: (u) => <AccountPill user={u} /> },
  ]

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader
        title="Utilisateurs"
        subtitle="Cliquez sur un client pour ouvrir son dossier : solde, numéros, recharges, messages et actions."
        aside={
          <Button icon={RefreshCw} onClick={() => setReloadKey((k) => k + 1)} loading={list.loading && rows.length > 0}>
            Actualiser
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 min-[1024px]:flex-row min-[1024px]:items-center min-[1024px]:justify-between">
          <Segmented value={group} options={FILTERS} onChange={(v: Group) => update({ statut: v === 'all' ? null : v })} label="Filtrer les comptes" />
          <SearchBox value={search} onChange={(v) => update({ q: v || null })} placeholder="E-mail, nom, téléphone, identifiant…" />
        </div>
        {!list.loading && !list.error ? (
          <p className="text-[13px] text-[var(--glow-gray)]">
            <span className="font-semibold text-black">{total}</span> compte{total > 1 ? 's' : ''}
            {search ? ' pour cette recherche' : ''}
          </p>
        ) : null}
        {list.error ? <Notice icon={XCircle}>{list.error}</Notice> : null}
        <DataTable
          rows={rows}
          columns={columns}
          loading={list.loading}
          selectedId={null}
          onOpen={(u) => navigate(`/admin/utilisateurs/${u.id}`)}
          empty={search ? 'Aucun utilisateur ne correspond à cette recherche.' : 'Aucun utilisateur dans cette catégorie.'}
        />
        <Pager page={page} pageSize={PAGE} total={total} onPage={(p) => update({ page: p > 0 ? String(p) : null }, false)} />
      </Card>
    </div>
  )
}
