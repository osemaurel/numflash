import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Copy, Search, X, type LucideIcon } from 'lucide-react'
import { translateAdminError } from '@/lib/admin-errors'
import { supabase } from '@/lib/supabase'
import { cn, formatFCFA } from '@/lib/utils'

/*
 * Briques communes des écrans « Ventes » et « Recharges » : période, recherche, tableau paginé,
 * panneau de détail ouvert à droite (l'identifiant est dans l'URL : ?id=…).
 */

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const shortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const longFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : shortFmt.format(d)
}

export function longDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : longFmt.format(d)
}

/* ------------------------------------------------------------------ */
/* Période                                                             */
/* ------------------------------------------------------------------ */

export type PeriodKey = 'jour' | '7j' | '30j' | 'tout'

export const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'jour', label: 'Aujourd’hui' },
  { value: '7j', label: '7 jours' },
  { value: '30j', label: '30 jours' },
  { value: 'tout', label: 'Tout' },
]

export function periodRange(key: PeriodKey, now = new Date()): { from: string | null; to: string | null } {
  if (key === 'tout') return { from: null, to: null }
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  if (key === '7j') start.setDate(start.getDate() - 6)
  if (key === '30j') start.setDate(start.getDate() - 29)
  return { from: start.toISOString(), to: null }
}

/* ------------------------------------------------------------------ */
/* État de l'écran dans l'URL                                          */
/* ------------------------------------------------------------------ */

export function useListParams<G extends string>(groups: readonly G[], defaultGroup: G) {
  const [params, setParams] = useSearchParams()
  const rawGroup = params.get('statut') as G | null
  const group = rawGroup && groups.includes(rawGroup) ? rawGroup : defaultGroup
  const rawPeriod = params.get('periode') as PeriodKey | null
  const period: PeriodKey = rawPeriod && PERIODS.some((p) => p.value === rawPeriod) ? rawPeriod : '30j'
  const search = params.get('q') ?? ''
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0)
  const selected = params.get('id')

  const update = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '') next.delete(k)
            else next.set(k, v)
          }
          if (resetPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return { group, period, search, page, selected, update }
}

/* ------------------------------------------------------------------ */
/* Appels RPC                                                          */
/* ------------------------------------------------------------------ */

export function useRpc<T>(fn: string, args: Record<string, unknown> | null, reloadKey = 0) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(args)

  useEffect(() => {
    if (args === null) {
      setData(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    supabase.rpc(fn, args).then(({ data: d, error: e }) => {
      if (!active) return
      if (e) setError(translateAdminError(e))
      else setData(d as T)
      setLoading(false)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, key, reloadKey])

  return { data, loading, error }
}

/* ------------------------------------------------------------------ */
/* Recherche                                                           */
/* ------------------------------------------------------------------ */

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onChange(draft.trim()), 350)
    return () => clearTimeout(t)
  }, [draft, value, onChange])
  return (
    <label className="relative block w-full min-[810px]:max-w-[340px]">
      <span className="sr-only">Rechercher</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[rgb(150,150,150)]" strokeWidth={1.8} aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl bg-white pl-11 pr-3.5 text-[16px] tracking-[-0.3px] text-black outline-none ring-1 ring-inset ring-[rgb(222,222,222)] placeholder:text-[rgb(160,160,160)] hover:ring-[rgb(200,200,200)] focus:ring-2 focus:ring-[var(--glow-blue)] min-[810px]:text-[15px]"
      />
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Tableau                                                             */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  /** Masquée sur mobile (affichée à partir de 810 px). */
  wide?: boolean
  align?: 'left' | 'right'
  /** Largeur de la colonne sur mobile (tableau à largeur fixe), ex. « w-[64%] ». */
  mobileWidth?: string
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onOpen,
  selectedId,
  loading,
  empty,
  canOpen,
}: {
  rows: T[]
  columns: Column<T>[]
  onOpen: (row: T) => void
  selectedId: string | null
  loading: boolean
  empty: string
  /** Lignes sans détail à ouvrir (ni curseur, ni focus clavier). Toutes s'ouvrent par défaut. */
  canOpen?: (row: T) => boolean
}) {
  return (
    <div className="-mx-4 overflow-x-auto min-[810px]:mx-0">
      <table className="w-full table-fixed border-separate border-spacing-0 text-left min-[810px]:table-auto">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap border-b border-[var(--glow-line)] px-4 pb-3 text-[12px] font-semibold uppercase tracking-[0.4px] text-[var(--glow-gray)] min-[810px]:px-3',
                  c.wide && 'hidden min-[810px]:table-cell',
                  c.align === 'right' && 'text-right',
                  c.mobileWidth,
                  'min-[810px]:w-auto',
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={columns.length} className="border-b border-[var(--glow-line)] px-4 py-3 min-[810px]:px-3">
                    <div className="h-9 animate-pulse rounded-lg bg-[var(--glow-bg)]" />
                  </td>
                </tr>
              ))
            : rows.map((row) => {
                const openable = canOpen ? canOpen(row) : true
                return (
                <tr
                  key={row.id}
                  tabIndex={openable ? 0 : undefined}
                  onClick={openable ? () => onOpen(row) : undefined}
                  onKeyDown={
                    openable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onOpen(row)
                          }
                        }
                      : undefined
                  }
                  aria-selected={openable ? row.id === selectedId : undefined}
                  className={cn(
                    'outline-none transition-colors',
                    openable && 'cursor-pointer focus-visible:bg-[rgb(236,246,255)]',
                    row.id === selectedId ? 'bg-[rgb(236,246,255)]' : openable && 'hover:bg-[var(--glow-bg)]',
                    loading && 'opacity-60',
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'border-b border-[var(--glow-line)] px-4 py-3 align-middle text-[14px] text-[var(--glow-text)] min-[810px]:px-3',
                        c.wide && 'hidden min-[810px]:table-cell',
                        c.align === 'right' && 'text-right',
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
                )
              })}
        </tbody>
      </table>
      {!loading && rows.length === 0 ? <p className="px-4 py-10 text-center text-[14px] text-[var(--glow-gray)]">{empty}</p> : null}
    </div>
  )
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  if (total <= pageSize && page === 0) return null
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset ring-[rgb(222,222,222)] text-black transition-colors hover:bg-[var(--glow-bg)] disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-3 pt-1 text-[13px] text-[var(--glow-gray)]">
      <span>
        {from}–{to} sur {total}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Page précédente">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
        <span className="min-w-[56px] text-center font-medium text-black">
          {page + 1} / {pages}
        </span>
        <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page + 1 >= pages} aria-label="Page suivante">
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pastilles de statut                                                 */
/* ------------------------------------------------------------------ */

export type Tone = 'green' | 'amber' | 'blue' | 'red' | 'neutral'

const TONES: Record<Tone, string> = {
  green: 'bg-[rgb(232,246,234)] text-[rgb(28,120,28)]',
  amber: 'bg-[rgb(255,244,229)] text-[rgb(178,98,0)]',
  blue: 'bg-[rgb(222,242,255)] text-[var(--glow-blue-dark)]',
  red: 'bg-[rgb(254,242,242)] text-[rgb(185,28,28)]',
  neutral: 'bg-[var(--glow-bg)] text-[var(--glow-gray)]',
}

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold', TONES[tone])}>{children}</span>
}

/* ------------------------------------------------------------------ */
/* Panneau de détail (à droite)                                        */
/* ------------------------------------------------------------------ */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const id = requestAnimationFrame(() => setShown(true))
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className={cn('absolute inset-0 bg-[rgba(16,35,41,0.35)] backdrop-blur-[1px] transition-opacity duration-200', shown ? 'opacity-100' : 'opacity-0')}
      />
      <aside
        className={cn(
          'glow-root absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col bg-[var(--glow-bg)] shadow-[-24px_0_60px_-30px_rgba(16,35,41,0.45)] transition-transform duration-200 ease-out',
          shown ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-start gap-3 border-b border-[var(--glow-line)] bg-white px-4 py-4 min-[480px]:px-5">
          {icon}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="drawer-title" className="font-glow-display text-[20px] font-medium leading-[24px] tracking-[-0.5px] text-black">
              {title}
            </h2>
            {subtitle ? <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--glow-gray)]">{subtitle}</div> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer le détail"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[rgb(110,110,110)] hover:bg-[var(--glow-bg)] hover:text-black"
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 min-[480px]:px-5">
          <div className="flex flex-col gap-4">{children}</div>
        </div>
      </aside>
    </div>
  )
}

export function DetailSection({ title, icon: I, children }: { title: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-[var(--glow-line)]">
      <h3 className="flex items-center gap-2 pb-1 text-[13px] font-semibold uppercase tracking-[0.4px] text-[var(--glow-gray)]">
        {I ? <I className="h-4 w-4" strokeWidth={2} aria-hidden /> : null}
        {title}
      </h3>
      {children}
    </section>
  )
}

function CopyValue({ value }: { value: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(value)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          // Presse-papiers indisponible : rien à faire.
        }
      }}
      aria-label="Copier"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[rgb(140,140,140)] hover:bg-[var(--glow-bg)] hover:text-black"
    >
      {done ? <Check className="h-3.5 w-3.5 text-[rgb(28,120,28)]" strokeWidth={2.4} aria-hidden /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
    </button>
  )
}

export function DetailRow({ label, value, mono = false, copy }: { label: string; value: ReactNode; mono?: boolean; copy?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[var(--glow-line)] py-2.5 first-of-type:border-t-0">
      <span className="shrink-0 pt-px text-[14px] text-[var(--glow-gray)]">{label}</span>
      <span className={cn('flex min-w-0 items-center gap-1 text-right text-[14px] text-black', mono && 'font-glow-mono text-[13px]')}>
        <span className="min-w-0 [overflow-wrap:anywhere]">{value ?? '—'}</span>
        {copy ? <CopyValue value={copy} /> : null}
      </span>
    </div>
  )
}

/** Lien vers le dossier complet d'un client (depuis les panneaux Ventes et Recharges). */
export function DossierLink({ userId }: { userId: string }) {
  return (
    <Link
      to={`/admin/utilisateurs/${userId}`}
      className="mt-1 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--glow-bg)] text-[14px] font-medium text-[var(--glow-blue-dark)] transition-colors hover:bg-[rgb(236,246,255)]"
    >
      Ouvrir le dossier du client
      <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
    </Link>
  )
}

/** « 2.5000 » → « 2,5 » ; « 600.0000 » → « 600 » (affichage seulement, depuis la chaîne exacte). */
export function decimalText(value: string | null | undefined) {
  if (!value) return '—'
  const trimmed = value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value
  return trimmed.replace('.', ',')
}

let regionNames: Intl.DisplayNames | null = null
/** Nom français d'un pays à partir de son code ISO (« BJ » → « Bénin »). */
export function countryName(code: string | null | undefined) {
  if (!code) return '—'
  try {
    regionNames ??= new Intl.DisplayNames(['fr'], { type: 'region' })
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

export function signedFCFA(n: number) {
  return `${n < 0 ? '−' : '+'}${formatFCFA(Math.abs(n))}`
}

/* ------------------------------------------------------------------ */
/* Historique (journal d'audit)                                        */
/* ------------------------------------------------------------------ */

export interface AuditEvent {
  created_at: string
  actor: string | null
  action: string
  payload: Record<string, unknown> | null
}

const EVENT_LABELS: Record<string, string> = {
  order_reserved: 'Commande créée, solde débité',
  order_number_assigned: 'Numéro attribué par 5sim',
  order_refunded_unassigned: 'Remboursée : aucun numéro attribué',
  order_status_changed: 'Statut mis à jour',
  order_sms_received: 'SMS reçu',
  order_refunded: 'Remboursée sur le solde',
  order_provider_status: 'Statut fournisseur mis à jour',
  order_sms_after_close: 'SMS reçu après clôture',
  order_cancel_refused: 'Annulation refusée',
  order_cancel_provider_refused: 'Annulation refusée par 5sim',
  order_cancel_provider_no_answer: '5sim n’a pas répondu à l’annulation',
  order_assign_failed: 'Numéro impossible à rattacher',
  order_refund_deferred: 'Remboursement différé',
  topup_pay_created: 'Demande de paiement envoyée',
  topup_created: 'Page de paiement créée',
  topup_pay_saspay_error: 'Paiement refusé par le prestataire',
  topup_pay_no_answer: 'Le prestataire n’a pas répondu',
  topup_pay_refused_by_operator: 'Paiement refusé par l’opérateur',
  topup_confirm_otp_attempt: 'Code SMS saisi',
  topup_confirm_otp_accepted: 'Code SMS accepté',
  topup_confirm_otp_refused: 'Code SMS refusé',
  webhook_received: 'Notification du prestataire reçue',
  webhook_not_final: 'Paiement encore en attente',
  topup_credited: 'Solde crédité',
  topup_credit_replay: 'Notification rejouée (déjà créditée)',
  topup_duplicate_payment: 'Second paiement sur une recharge déjà créditée',
  topup_failed: 'Paiement échoué',
  topup_fail_ignored: 'Échec ignoré (recharge déjà close)',
  topup_amount_mismatch: 'Montant incohérent : non crédité',
  webhook_verify_failed: 'Vérification du paiement impossible',
  // Activité d'un client (dossier utilisateur)
  order_create_refused: 'Achat refusé',
  order_create_error: 'Achat interrompu par une erreur',
  order_create_unconfigured: 'Achat impossible : service non configuré',
  topup_pay_refused: 'Paiement refusé',
  topup_pay_invalid_network: 'Réseau de paiement indisponible',
  topup_pay_invalid_tier: 'Montant de recharge refusé',
  topup_pay_rate_limited: 'Trop de demandes de paiement',
  topup_pay_error: 'Paiement interrompu par une erreur',
  topup_create_invalid_tier: 'Montant de recharge refusé',
  topup_create_unconfigured: 'Recharge impossible : paiement non configuré',
  topup_create_refused: 'Recharge refusée',
  topup_create_rate_limited: 'Trop de demandes de recharge',
  // Actions de l'administration sur un compte
  balance_adjusted: 'Solde ajusté par un administrateur',
  user_blocked: 'Compte bloqué',
  user_unblocked: 'Compte débloqué',
  user_message_sent: 'Message envoyé au client',
  user_deleted: 'Compte supprimé',
  user_auth_disabled: 'Connexion désactivée',
  user_delete_failed: 'Suppression échouée',
  admin_role_granted: 'Rôle administrateur attribué',
}

const STATUS_FR: Record<string, string> = {
  pending: 'en attente',
  received: 'code reçu',
  finished: 'terminée',
  canceled: 'annulée',
  timeout: 'expirée',
  banned: 'numéro refusé',
  refunded: 'remboursée',
}

function eventDetail(e: AuditEvent): string | null {
  const p = e.payload ?? {}
  const parts: string[] = []
  if (typeof p.service === 'string') parts.push(typeof p.country === 'string' ? `${p.service} · ${p.country}` : p.service)
  if (typeof p.title === 'string') parts.push(`« ${p.title} »`)
  if (typeof p.from === 'string' && typeof p.to === 'string') parts.push(`${STATUS_FR[p.from] ?? p.from} → ${STATUS_FR[p.to] ?? p.to}`)
  if (typeof p.provider_status === 'string') parts.push(`5sim : ${p.provider_status}`)
  if (typeof p.refund_amount_xof === 'number') parts.push(`remboursé ${formatFCFA(p.refund_amount_xof)}`)
  if (typeof p.amount_xof === 'number' && !('refund_amount_xof' in p)) parts.push(formatFCFA(p.amount_xof))
  if (typeof p.reason === 'string') parts.push(`motif : ${p.reason}`)
  if (typeof p.event === 'string') parts.push(p.event)
  if (typeof p.verified_status === 'string') parts.push(`vérifié : ${p.verified_status}`)
  if (typeof p.network === 'string') parts.push(p.network)
  if (typeof p.code === 'string') parts.push(`code ${p.code}`)
  if (typeof p.kind === 'string') parts.push(p.kind)
  if (typeof p.flow === 'string') parts.push(p.flow === 'redirect' ? 'redirection opérateur' : 'demande sur le téléphone')
  if (p.cancel_guard_race === true) parts.push('plafond atteint en même temps')
  return parts.length ? parts.join(' · ') : null
}

function actorLabel(actor: string | null) {
  if (!actor) return ''
  if (actor.startsWith('user:')) return 'client'
  if (actor.startsWith('admin:')) return 'admin'
  if (actor.startsWith('edge:orders-sync')) return 'synchro 5sim'
  if (actor.startsWith('webhook:')) return 'webhook'
  return actor.replace(/^edge:/, '')
}

export function Timeline({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="py-2 text-[14px] text-[var(--glow-gray)]">Aucun évènement enregistré.</p>
  return (
    <ol className="flex flex-col">
      {events.map((e, i) => {
        const detail = eventDetail(e)
        return (
          <li key={i} className="relative flex gap-3 pb-3 pl-1 last:pb-1">
            <span className="relative flex w-3 shrink-0 justify-center">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--glow-blue)] ring-4 ring-[rgb(236,246,255)]" />
              {i < events.length - 1 ? <span className="absolute top-4 h-[calc(100%-8px)] w-px bg-[var(--glow-line)]" /> : null}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[14px] font-medium leading-[19px] text-black">{EVENT_LABELS[e.action] ?? e.action}</span>
              {detail ? <span className="break-words text-[13px] leading-[18px] text-[var(--glow-text)]">{detail}</span> : null}
              <span className="text-[12px] text-[var(--glow-gray)]">
                {longDate(e.created_at)}
                {actorLabel(e.actor) ? ` · ${actorLabel(e.actor)}` : ''}
              </span>
              {e.payload && Object.keys(e.payload).length > 0 ? (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--glow-blue-dark)]">Données techniques</summary>
                  <pre className="font-glow-mono mt-1 max-h-48 overflow-auto rounded-lg bg-[var(--glow-bg)] p-2 text-[11px] leading-[15px] text-[var(--glow-text)]">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Panneau en cours de chargement ou en erreur. */
export function DrawerState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <p className="rounded-xl bg-[rgb(254,242,242)] px-3.5 py-3 text-[14px] text-[rgb(153,27,27)]">{error}</p>
  if (loading)
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        {[120, 180, 140].map((h) => (
          <div key={h} className="animate-pulse rounded-2xl bg-white" style={{ height: h }} />
        ))}
      </div>
    )
  return null
}
