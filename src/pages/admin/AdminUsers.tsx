import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, Search, Unlock, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent, parseIntegerInput } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { cn, formatDateTime, formatFCFA } from '@/lib/utils'
import { Avatar, Badge, Button, Card, Empty, Field, PageHeader, Segmented, TextInput, inputClass } from './ui'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'user' | 'admin'
  is_blocked: boolean
  created_at: string
  balance_xof: number
  orders_total: number
  recent_sample: number
  recent_user_cancels: number
  cancel_ratio: number | null
  total_count: number
}

const PAGE = 25

function AdjustPanel({ user, onDone, onCancel }: { user: UserRow; onDone: (balance: number) => void; onCancel: () => void }) {
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const value = parseIntegerInput(amount)
  const signed = value === null ? null : direction === 'credit' ? value : -value
  const after = signed === null ? null : user.balance_xof + signed
  const invalid = !value || reason.trim().length < 5 || (after !== null && after < 0)

  async function submit() {
    if (invalid || signed === null) return
    setSaving(true)
    const { data, error } = await supabase.rpc('admin_adjust_balance', {
      p_user_id: user.id,
      p_amount_xof: signed,
      p_reason: reason.trim(),
    })
    setSaving(false)
    if (error) return void toast.error(translateAdminError(error))
    toast.success(`Solde ajusté : ${formatFCFA((data as { balance_after: number }).balance_after)}.`)
    onDone((data as { balance_after: number }).balance_after)
  }

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--glow-line)] pt-4">
      <Segmented
        label="Sens de l’ajustement"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'credit', label: 'Créditer' },
          { value: 'debit', label: 'Débiter' },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 min-[810px]:grid-cols-2">
        <Field
          id={`amount-${user.id}`}
          label="Montant (FCFA)"
          error={after !== null && after < 0 ? `Le solde deviendrait négatif (${formatFCFA(after)}).` : undefined}
          hint={after !== null ? `Nouveau solde : ${formatFCFA(after)}` : undefined}
        >
          <TextInput id={`amount-${user.id}`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={after !== null && after < 0} />
        </Field>
        <Field id={`reason-${user.id}`} label="Motif (obligatoire)" hint="Inscrit au journal d’audit. 5 caractères minimum.">
          <TextInput id={`reason-${user.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ex. remboursement commande non reçue" />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={saving} onClick={() => void submit()} disabled={invalid}>
          {value ? `${direction === 'credit' ? 'Créditer' : 'Débiter'} ${formatFCFA(value)}` : 'Valider'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

function BlockPanel({ user, onDone, onCancel }: { user: UserRow; onDone: (blocked: boolean) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const blocking = !user.is_blocked
  const invalid = blocking && reason.trim().length < 5

  async function submit() {
    setSaving(true)
    const { error } = await supabase.rpc('admin_set_user_blocked', {
      p_user_id: user.id,
      p_blocked: blocking,
      p_reason: reason.trim() || null,
    })
    setSaving(false)
    if (error) return void toast.error(translateAdminError(error))
    toast.success(blocking ? 'Utilisateur bloqué.' : 'Utilisateur débloqué.')
    onDone(blocking)
  }

  return (
    <div className="flex flex-col gap-4 border-t border-[var(--glow-line)] pt-4">
      <p className="text-[14px] leading-[20px] text-[var(--glow-gray)]">
        {blocking ? 'Un compte bloqué ne peut plus recharger ni acheter de numéro. Il reste consultable.' : 'Le compte pourra de nouveau recharger et acheter.'}
      </p>
      <Field id={`block-${user.id}`} label={blocking ? 'Motif (obligatoire)' : 'Motif (facultatif)'}>
        <TextInput id={`block-${user.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </Field>
      <div className="flex gap-2">
        <Button variant={blocking ? 'dark' : 'primary'} size="sm" loading={saving} onClick={() => void submit()} disabled={invalid}>
          {blocking ? 'Bloquer le compte' : 'Débloquer le compte'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [search, setSearch] = useState(query)
  const [rows, setRows] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [threshold, setThreshold] = useState(0.6)
  const [panel, setPanel] = useState<{ id: string; kind: 'adjust' | 'block' } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    void supabase
      .from('settings')
      .select('value')
      .eq('key', 'cancel_ratio_alert_threshold')
      .maybeSingle()
      .then(({ data }) => data && setThreshold(Number(data.value)))
  }, [])

  const fetchPage = useCallback(
    async (offset: number) => {
      const { data, error } = await supabase.rpc('admin_list_users', { p_search: search || null, p_limit: PAGE, p_offset: offset })
      if (error) {
        toast.error(translateAdminError(error))
        return null
      }
      return (data ?? []) as UserRow[]
    },
    [search],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    void fetchPage(0).then((list) => {
      if (!active) return
      setRows(list ?? [])
      setTotal(list?.[0]?.total_count ?? 0)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [fetchPage])

  async function loadMore() {
    setLoadingMore(true)
    const list = await fetchPage(rows.length)
    if (list) {
      setRows((r) => [...r, ...list])
      if (list[0]) setTotal(list[0].total_count)
    }
    setLoadingMore(false)
  }

  const update = (id: string, patch: Partial<UserRow>) => setRows((r) => r.map((u) => (u.id === id ? { ...u, ...patch } : u)))

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader title="Utilisateurs" subtitle="Recherchez un client, ajustez son solde ou bloquez son compte. Chaque action est inscrite au journal d’audit." />

      <label className="relative block">
        <span className="sr-only">Rechercher un utilisateur</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--glow-gray)]" aria-hidden />
        <input
          type="search"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="E-mail, nom, téléphone ou identifiant"
          className={`${inputClass} pl-10`}
        />
      </label>

      {loading ? (
        <div className="flex flex-col gap-3" aria-label="Chargement">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[28px] bg-white" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <Empty>Aucun utilisateur trouvé.</Empty>
        </Card>
      ) : (
        <>
          <p className="text-[13px] text-[var(--glow-gray)]">
            <span className="font-semibold text-black">{total}</span> utilisateur{total > 1 ? 's' : ''}
          </p>
          <ul className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-2 min-[1200px]:items-start">
            {rows.map((u) => {
              const flagged = u.cancel_ratio !== null && u.cancel_ratio > threshold
              const isMe = u.id === me?.id
              const name = u.full_name || 'Sans nom'
              return (
                <li key={u.id}>
                  <Card className="gap-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={name} size={44} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="flex flex-wrap items-center gap-1.5 text-[16px] font-medium text-black">
                          <span className="truncate">{name}</span>
                          {isMe ? <span className="text-[13px] font-normal text-[var(--glow-gray)]">(vous)</span> : null}
                          {u.role === 'admin' ? <Badge tone="blue">Admin</Badge> : null}
                          {u.is_blocked ? <Badge tone="red">Bloqué</Badge> : null}
                        </p>
                        <p className="truncate text-[13px] text-[var(--glow-gray)]">{u.email}</p>
                        {u.phone ? <p className="text-[13px] text-[var(--glow-gray)]">{u.phone}</p> : null}
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 min-[810px]:grid-cols-3">
                      <div className="flex flex-col gap-0.5 rounded-2xl bg-[var(--glow-bg)] px-3 py-2.5">
                        <dt className="text-[12px] text-[var(--glow-gray)]">Solde</dt>
                        <dd className="truncate text-[15px] font-semibold text-black">{formatFCFA(u.balance_xof)}</dd>
                      </div>
                      <div className="flex flex-col gap-0.5 rounded-2xl bg-[var(--glow-bg)] px-3 py-2.5">
                        <dt className="text-[12px] text-[var(--glow-gray)]">Commandes</dt>
                        <dd className="text-[15px] font-semibold text-black">{u.orders_total}</dd>
                      </div>
                      <div className={cn('col-span-2 flex flex-col gap-0.5 rounded-2xl px-3 py-2.5 min-[810px]:col-span-1', flagged ? 'bg-[rgb(254,242,242)]' : 'bg-[var(--glow-bg)]')}>
                        <dt className="text-[12px] text-[var(--glow-gray)]">Annulations</dt>
                        <dd className={cn('truncate text-[15px] font-semibold', flagged ? 'text-[rgb(185,28,28)]' : 'text-black')}>
                          {u.cancel_ratio === null ? '—' : `${fractionToPercent(u.cancel_ratio)} %`}
                          {u.cancel_ratio === null ? null : (
                            <span className="ml-1 text-[12px] font-medium text-[var(--glow-gray)]">
                              ({u.recent_user_cancels}/{u.recent_sample})
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] text-[var(--glow-gray)]">Inscrit le {formatDateTime(u.created_at)}</p>
                      {isMe ? null : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            icon={WalletCards}
                            aria-expanded={panel?.id === u.id && panel.kind === 'adjust'}
                            onClick={() => setPanel(panel?.id === u.id && panel.kind === 'adjust' ? null : { id: u.id, kind: 'adjust' })}
                          >
                            Ajuster le solde
                          </Button>
                          <Button
                            size="sm"
                            variant={u.is_blocked ? 'secondary' : 'danger'}
                            icon={u.is_blocked ? Unlock : Ban}
                            aria-expanded={panel?.id === u.id && panel.kind === 'block'}
                            onClick={() => setPanel(panel?.id === u.id && panel.kind === 'block' ? null : { id: u.id, kind: 'block' })}
                          >
                            {u.is_blocked ? 'Débloquer' : 'Bloquer'}
                          </Button>
                        </div>
                      )}
                    </div>
                    {panel?.id === u.id && panel.kind === 'adjust' ? (
                      <AdjustPanel
                        user={u}
                        onCancel={() => setPanel(null)}
                        onDone={(balance) => {
                          update(u.id, { balance_xof: balance })
                          setPanel(null)
                        }}
                      />
                    ) : null}
                    {panel?.id === u.id && panel.kind === 'block' ? (
                      <BlockPanel
                        user={u}
                        onCancel={() => setPanel(null)}
                        onDone={(blocked) => {
                          update(u.id, { is_blocked: blocked })
                          setPanel(null)
                        }}
                      />
                    ) : null}
                  </Card>
                </li>
              )
            })}
          </ul>
          {rows.length < total ? (
            <Button className="self-center" loading={loadingMore} onClick={() => void loadMore()}>
              Afficher plus
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
