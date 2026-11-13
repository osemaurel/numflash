import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { translateAdminError } from '@/lib/admin-errors'
import { fractionToPercent, parseIntegerInput } from '@/lib/decimal'
import { supabase } from '@/lib/supabase'
import { cn, formatDateTime, formatFCFA } from '@/lib/utils'

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
    <div className="space-y-3 border-t p-3">
      <div className="inline-flex rounded-lg border p-1">
        {(['credit', 'debit'] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={direction === d}
            onClick={() => setDirection(d)}
            className={cn(
              'h-8 rounded-md px-3 text-sm font-medium',
              direction === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
            )}
          >
            {d === 'credit' ? 'Créditer' : 'Débiter'}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`amount-${user.id}`}>Montant (FCFA)</Label>
          <Input id={`amount-${user.id}`} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {after !== null ? (
            <p className={cn('text-xs', after < 0 ? 'text-destructive' : 'text-muted-foreground')}>
              Nouveau solde : {formatFCFA(after)}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`reason-${user.id}`}>Motif (obligatoire)</Label>
          <Input
            id={`reason-${user.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="Ex. remboursement commande non reçue"
          />
          <p className="text-xs text-muted-foreground">Inscrit au journal d'audit. 5 caractères minimum.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void submit()} disabled={saving || invalid}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {value ? `${direction === 'credit' ? 'Créditer' : 'Débiter'} ${formatFCFA(value)}` : 'Valider'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
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
    <div className="space-y-3 border-t p-3">
      <p className="text-sm text-muted-foreground">
        {blocking
          ? "Un compte bloqué ne peut plus recharger ni acheter de numéro. Il reste consultable."
          : 'Le compte pourra de nouveau recharger et acheter.'}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`block-${user.id}`}>{blocking ? 'Motif (obligatoire)' : 'Motif (facultatif)'}</Label>
        <Input id={`block-${user.id}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant={blocking ? 'destructive' : 'default'} onClick={() => void submit()} disabled={saving || invalid}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {blocking ? 'Bloquer' : 'Débloquer'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
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
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="E-mail, nom, téléphone ou identifiant…"
          className="pl-9"
          aria-label="Rechercher un utilisateur"
          inputMode="search"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Aucun utilisateur trouvé.</Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {total} utilisateur{total > 1 ? 's' : ''}
          </p>
          <ul className="space-y-2">
            {rows.map((u) => {
              const flagged = u.cancel_ratio !== null && u.cancel_ratio > threshold
              const isMe = u.id === me?.id
              return (
                <li key={u.id}>
                  <Card>
                    <div className="space-y-3 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {u.full_name || 'Sans nom'}
                            {isMe ? <span className="text-muted-foreground"> (vous)</span> : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          {u.phone ? <p className="text-xs text-muted-foreground">{u.phone}</p> : null}
                        </div>
                        <div className="flex gap-1">
                          {u.role === 'admin' ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Admin</span>
                          ) : null}
                          {u.is_blocked ? (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Bloqué</span>
                          ) : null}
                        </div>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Solde</dt>
                          <dd className="font-semibold tabular-nums">{formatFCFA(u.balance_xof)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Commandes</dt>
                          <dd className="font-semibold tabular-nums">{u.orders_total}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Annulations</dt>
                          <dd className={cn('font-semibold tabular-nums', flagged && 'text-destructive')}>
                            {u.cancel_ratio === null
                              ? '—'
                              : `${fractionToPercent(u.cancel_ratio)} % (${u.recent_user_cancels}/${u.recent_sample})`}
                          </dd>
                        </div>
                      </dl>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">Inscrit le {formatDateTime(u.created_at)}</p>
                        {isMe ? null : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPanel(panel?.id === u.id && panel.kind === 'adjust' ? null : { id: u.id, kind: 'adjust' })}
                            >
                              Ajuster le solde
                            </Button>
                            <Button
                              size="sm"
                              variant={u.is_blocked ? 'outline' : 'ghost'}
                              className={u.is_blocked ? undefined : 'text-destructive'}
                              onClick={() => setPanel(panel?.id === u.id && panel.kind === 'block' ? null : { id: u.id, kind: 'block' })}
                            >
                              {u.is_blocked ? 'Débloquer' : 'Bloquer'}
                            </Button>
                          </div>
                        )}
                      </div>
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
            <Button variant="outline" className="w-full" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Afficher plus
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
