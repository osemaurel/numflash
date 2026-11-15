import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Check, ChevronRight, Copy, Gift, Hourglass, Loader2, RotateCcw, ShoppingBag, SlidersHorizontal, Wallet, X, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatFCFA } from '@/lib/utils'
import type { OrderRow } from '@/hooks/useOrders'
import { useOrderRules } from '@/hooks/useOrderRules'
import { orderAction } from '@/lib/order-api'
import type { WalletTransactionRow } from '@/hooks/useWalletTransactions'
import { ORDER_STATUS_LABEL, mmss, relativeTime } from '@/lib/orders'
import { Img } from '../glow/primitives'
import { NumberCard } from '../landing/NumberCard'
import { ServiceTile, signedFCFA } from '../landing/ui'

/* ------------------------------------------------------------------ */
/* Identité                                                            */
/* ------------------------------------------------------------------ */

export function displayName(fullName: string | null | undefined, email: string | null | undefined) {
  return fullName?.trim() || email?.split('@')[0] || 'Mon compte'
}

export function firstName(name: string) {
  return name.split(/\s+/)[0] ?? name
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[rgb(222,242,255)] font-semibold text-[var(--glow-blue-dark)]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Structure                                                           */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, accent, subtitle, aside }: { title: string; accent?: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 min-[810px]:flex-row min-[810px]:items-end min-[810px]:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-glow-display text-[28px] font-medium leading-[32px] tracking-[-1px] text-black min-[810px]:text-[36px] min-[810px]:leading-[40px] min-[810px]:tracking-[-1.44px]">
          {title}
          {accent ? <span className="text-[var(--glow-blue)]">{accent}</span> : null}
        </h1>
        {subtitle ? <p className="text-[15px] leading-[22px] text-[var(--glow-gray)] min-[810px]:text-[16px]">{subtitle}</p> : null}
      </div>
      {aside}
    </div>
  )
}

export function Card({ title, aside, children, className, id }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('flex flex-col gap-4 rounded-[28px] bg-white p-4 ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:p-6', className)}>
      {title ? (
        <div className="flex min-h-7 items-center justify-between gap-3">
          <h2 className="font-glow-display text-[19px] font-medium leading-[22px] tracking-[-0.5px] text-black">{title}</h2>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function SeeAll({ to, children = 'Tout voir' }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="group flex shrink-0 items-center gap-0.5 text-[14px] font-medium text-[var(--glow-blue-dark)]">
      {children}
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
    </Link>
  )
}

export function EmptyState({ icon: I, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[rgb(230,230,230)] px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--glow-bg)]">
        <I className="h-5 w-5 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-black">{title}</p>
        {text ? <p className="max-w-[340px] text-balance text-[14px] leading-[20px] text-[var(--glow-gray)]">{text}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function SkeletonRows({ count = 3, height = 52 }: { count?: number; height?: number }) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="animate-pulse rounded-2xl bg-[var(--glow-bg)]" style={{ height, opacity: 1 - i * 0.15 }} />
      ))}
    </ul>
  )
}

export function LoadError({ children = 'Impossible de charger ces informations. Vérifiez votre connexion.' }: { children?: ReactNode }) {
  return <p className="rounded-2xl bg-[var(--glow-bg)] px-4 py-5 text-center text-[14px] text-[var(--glow-gray)]">{children}</p>
}

export const primaryButton =
  'flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--glow-blue)] px-5 text-[16px] font-medium text-white shadow-[0_10px_24px_-10px_rgba(0,133,238,0.6)] transition-colors hover:bg-[var(--glow-blue-dark)] disabled:cursor-not-allowed disabled:opacity-60'
export const secondaryButton =
  'flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-medium text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(222,222,222)] transition-colors hover:bg-[rgb(252,252,252)] hover:ring-[rgb(200,200,200)]'

/* ------------------------------------------------------------------ */
/* Copier                                                              */
/* ------------------------------------------------------------------ */

export function CopyButton({ value, label = 'Copier', dark = false }: { value: string; label?: string; dark?: boolean }) {
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      window.setTimeout(() => setDone(false), 1500)
    } catch {
      /* presse-papiers indisponible (navigateur ancien, page non sécurisée) : rien à faire */
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        'flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors',
        dark ? 'bg-[rgb(34,139,34)] text-white hover:bg-[rgb(28,120,28)]' : 'bg-white text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(225,225,225)] hover:bg-[var(--glow-bg)]',
      )}
    >
      {done ? <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden /> : <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />}
      {done ? 'Copié' : label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Solde                                                               */
/* ------------------------------------------------------------------ */

export function BalanceCard({ balance, summary, actions = true }: { balance: number | null; summary: { toppedUp: number; spent: number } | null; actions?: boolean }) {
  const amount = balance === null ? '…' : formatFCFA(balance).replace(/\s?FCFA$/, '')
  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-5 text-white min-[810px]:p-7"
      style={{ backgroundImage: 'linear-gradient(145deg, #0085ee 0%, rgb(114, 189, 247) 100%)', boxShadow: 'rgba(52, 217, 217, 0.14) 0px 10px 50px 0px inset' }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.3] [filter:brightness(1.6)_grayscale(1)_blur(8px)]">
        <Img src="clouds.webp" className="h-full w-full object-cover object-bottom" />
      </div>
      <div className="pointer-events-none absolute right-[-36px] top-[34px] hidden min-[810px]:block" style={{ transform: 'rotate(-8deg) scale(0.58)', transformOrigin: 'right top' }} aria-hidden>
        <NumberCard tone="black" />
      </div>
      <div className="relative z-[1] flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-[14px] font-medium text-white/85">
            <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden />
            Solde disponible
          </span>
          <span className="flex items-end gap-2" aria-live="polite">
            <span className="font-glow-display text-[44px] font-semibold leading-[44px] tracking-[-1.76px] min-[810px]:text-[52px] min-[810px]:leading-[52px]">{amount}</span>
            <span className="pb-1 text-[20px] font-medium leading-[24px] text-white/65">FCFA</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 min-[810px]:flex">
          {[
            { icon: ArrowDownLeft, label: 'Rechargé', value: summary ? (summary.toppedUp > 0 ? signedFCFA(summary.toppedUp) : formatFCFA(0)) : '…' },
            { icon: ArrowUpRight, label: 'Dépensé', value: summary ? (summary.spent > 0 ? signedFCFA(-summary.spent) : formatFCFA(0)) : '…' },
          ].map((st) => (
            <span key={st.label} className="flex flex-col gap-0.5 rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm min-[810px]:min-w-[150px]">
              <span className="flex items-center gap-1 text-[12px] font-medium text-white/80">
                <st.icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                {st.label}
              </span>
              <span className="text-[15px] font-semibold tracking-[-0.3px]">{st.value}</span>
            </span>
          ))}
        </div>
        {actions ? (
          <div className="grid grid-cols-2 gap-2 min-[810px]:flex">
            <Link to="/wallet" className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-semibold text-[var(--glow-blue-dark)] transition-opacity hover:opacity-90">
              <span aria-hidden className="text-[18px] leading-none">+</span>
              Recharger
            </Link>
            <Link to="/acheter" className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/15 px-4 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/35 transition-colors hover:bg-white/25">
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
              Acheter
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

function txLabel(tx: WalletTransactionRow): { label: string; sub: string } {
  const when = relativeTime(tx.created_at)
  const service = tx.orders?.services?.name_fr
  const country = tx.orders?.countries?.name_fr
  switch (tx.type) {
    case 'topup':
      return { label: 'Recharge', sub: `Mobile Money · ${when}` }
    case 'purchase':
      return { label: service ?? 'Achat de numéro', sub: [country, when].filter(Boolean).join(' · ') }
    case 'refund':
      return { label: 'Remboursement', sub: [service, when].filter(Boolean).join(' · ') }
    case 'bonus':
      return { label: 'Bonus', sub: when }
    default:
      return { label: 'Ajustement', sub: when }
  }
}

const TX_ICON: Record<WalletTransactionRow['type'], { icon: LucideIcon; tone: string }> = {
  topup: { icon: ArrowDownLeft, tone: 'bg-[rgb(232,246,234)] text-[rgb(28,120,28)]' },
  purchase: { icon: ShoppingBag, tone: 'bg-[var(--glow-bg)] text-[rgb(90,90,90)]' },
  refund: { icon: RotateCcw, tone: 'bg-[rgb(222,242,255)] text-[var(--glow-blue-dark)]' },
  bonus: { icon: Gift, tone: 'bg-[rgba(194,164,99,0.16)] text-[rgb(135,108,50)]' },
  adjustment: { icon: SlidersHorizontal, tone: 'bg-[var(--glow-bg)] text-[rgb(90,90,90)]' },
}

export function TransactionList({ transactions }: { transactions: WalletTransactionRow[] }) {
  return (
    <ul className="flex flex-col divide-y divide-[var(--glow-line)]">
      {transactions.map((tx) => {
        const { label, sub } = txLabel(tx)
        const { icon: I, tone } = TX_ICON[tx.type]
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className={cn('flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full', tone)}>
              <I className="h-[18px] w-[18px]" strokeWidth={2.1} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-medium leading-[19px] text-black">{label}</span>
              <span className="truncate text-[13px] leading-[17px] text-[var(--glow-gray)]">{sub}</span>
            </div>
            <span className={cn('shrink-0 text-[15px] font-semibold', tx.amount_xof > 0 ? 'text-[rgb(28,120,28)]' : 'text-black')}>{signedFCFA(tx.amount_xof)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Commandes                                                           */
/* ------------------------------------------------------------------ */

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function StatusChip({ status }: { status: OrderRow['status'] }) {
  if (status === 'pending') {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[rgb(255,244,229)] px-2.5 py-1 text-[12px] font-semibold text-[rgb(178,98,0)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(245,158,11)] opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(245,158,11)]" />
        </span>
        {ORDER_STATUS_LABEL.pending}
      </span>
    )
  }
  const tone =
    status === 'received' || status === 'finished'
      ? 'bg-[rgb(232,246,234)] text-[rgb(28,120,28)]'
      : status === 'refunded' || status === 'timeout' || status === 'canceled'
        ? 'bg-[rgb(222,242,255)] text-[var(--glow-blue-dark)]'
        : 'bg-[rgb(254,242,242)] text-[rgb(185,28,28)]'
  return (
    <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', tone)}>
      {status === 'received' || status === 'finished' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

/**
 * Un numéro acheté : numéro à copier, compte à rebours, code reçu (en direct via Realtime).
 * Avec `actions`, propose « Annuler et rembourser » (après le délai minimum) et « Terminer ».
 */
export function OrderCard({ order, actions = false }: { order: OrderRow; actions?: boolean }) {
  const live = order.status === 'pending'
  const now = useNow(live)
  const rules = useOrderRules()
  const [busy, setBusy] = useState<null | 'cancel' | 'finish'>(null)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const service = order.services?.name_fr ?? order.service_slug
  const country = order.countries?.name_fr ?? order.country_code
  const sms = [...order.order_sms].sort((a, b) => b.received_at.localeCompare(a.received_at))
  const last = sms[0]
  const created = new Date(order.created_at).getTime()
  const expires = order.expires_at ? new Date(order.expires_at).getTime() : null
  const left = expires ? Math.max(0, Math.round((expires - now) / 1000)) : null
  const total = expires ? Math.max(1, (expires - created) / 1000) : null
  const cancelIn = Math.max(0, Math.ceil(rules.minSecondsBeforeCancel - (now - created) / 1000))
  const closed = order.status !== 'pending' && order.status !== 'received'

  async function run(action: 'cancel' | 'finish') {
    setBusy(action)
    setMessage(null)
    const res = await orderAction(order.id, action)
    setBusy(null)
    setConfirming(false)
    if (!res.ok) {
      setMessage(res.message)
      return
    }
    if (action === 'cancel') {
      toast.success(res.refunded ? `Commande annulée : ${formatFCFA(order.price_xof)} recrédités sur votre solde.` : 'Commande annulée.')
    } else {
      toast.success('Commande terminée.')
    }
  }

  const panelPlacement = 'min-[810px]:col-start-2 min-[810px]:row-span-3 min-[810px]:row-start-1 min-[810px]:justify-center'

  return (
    <article className="grid grid-cols-1 gap-3 rounded-2xl p-3.5 ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:grid-cols-2 min-[810px]:grid-rows-[auto_auto_1fr] min-[810px]:gap-x-5 min-[810px]:gap-y-3 min-[810px]:p-4">
      <div className="flex items-start gap-3">
        <ServiceTile name={service} size={42} radius={12} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[16px] font-medium leading-[20px] tracking-[-0.32px] text-black">{service}</span>
          <span className="truncate text-[13px] leading-[17px] text-[var(--glow-gray)]">
            {order.countries?.flag_emoji ?? '🌐'} {country}
            {closed ? ` · ${relativeTime(order.created_at, now)}` : ''}
          </span>
        </div>
        <StatusChip status={order.status} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--glow-bg)] py-1.5 pl-3.5 pr-1.5">
        <span className="font-glow-display truncate text-[18px] font-semibold tracking-[-0.2px] text-black">{order.phone || '—'}</span>
        {order.phone && !closed ? <CopyButton value={order.phone.replace(/\s/g, '')} /> : <span className="pr-2 text-[14px] font-semibold text-[var(--glow-gray)]">{formatFCFA(order.price_xof)}</span>}
      </div>

      {last ? (
        <div className={cn('flex flex-col gap-2 rounded-xl bg-[rgb(240,250,241)] p-3.5 ring-1 ring-inset ring-[rgb(205,235,208)]', panelPlacement)}>
          <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[rgb(28,120,28)]">
            {sms.length > 1 ? `${sms.length} SMS reçus · ` : 'Votre code · '}
            {relativeTime(last.received_at, now)}
          </span>
          {last.code ? (
            <div className="flex items-center justify-between gap-3">
              <span className="font-glow-mono whitespace-nowrap text-[28px] font-bold leading-[34px] tracking-[2px] text-black">{last.code}</span>
              <CopyButton value={last.code} dark />
            </div>
          ) : null}
          {last.text ? <p className="text-[13px] leading-[18px] text-[rgb(80,95,82)]">« {last.text} »</p> : null}
        </div>
      ) : live ? (
        <div className={cn('flex flex-col gap-2.5 rounded-xl bg-[var(--glow-bg)] p-3.5', panelPlacement)}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[14px] font-medium text-black">
              <Hourglass className="h-4 w-4 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
              En attente du SMS…
            </span>
            {left !== null ? (
              <span className="font-glow-mono text-[15px] font-bold text-black" aria-label="Temps restant">
                {mmss(left)}
              </span>
            ) : null}
          </div>
          {left !== null && total !== null ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(228,228,228)]">
              <div className="h-full rounded-full bg-[var(--glow-blue)] transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, (left / total) * 100)}%` }} />
            </div>
          ) : null}
          <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">
            {left === 0
              ? 'Délai écoulé sans SMS : le remboursement sur votre solde est en cours.'
              : 'Le code s’affichera ici dès sa réception. Sans SMS avant la fin du délai, vous êtes remboursé automatiquement.'}
          </p>
        </div>
      ) : (
        <div className={cn('flex flex-col gap-1 rounded-xl bg-[var(--glow-bg)] p-3.5 text-[13px] leading-[18px] text-[var(--glow-gray)]', panelPlacement)}>
          {order.status === 'finished' ? 'Commande terminée.' : 'Aucun SMS reçu sur ce numéro.'}
          {order.status === 'refunded' || order.status === 'timeout' || order.status === 'canceled' ? ' Le montant a été remboursé sur votre solde.' : null}
        </div>
      )}

      {actions && order.status === 'received' ? (
        <div className="flex items-center justify-between gap-3 min-[810px]:self-end">
          <span className="text-[13px] text-[var(--glow-gray)]">Un autre SMS peut encore arriver sur ce numéro.</span>
          <button
            type="button"
            onClick={() => void run('finish')}
            disabled={busy !== null}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-black px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {busy === 'finish' ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} aria-hidden /> : null}
            Terminer
          </button>
        </div>
      ) : actions && order.status === 'pending' ? (
        confirming ? (
          <div className="flex flex-wrap items-center justify-end gap-2 min-[810px]:self-end">
            <span className="mr-auto text-[13px] font-medium text-black min-[810px]:mr-0">Annuler et être remboursé de {formatFCFA(order.price_xof)} ?</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy !== null}
              className="h-9 rounded-lg px-3 text-[13px] font-semibold text-[var(--glow-gray)] hover:text-black"
            >
              Non
            </button>
            <button
              type="button"
              onClick={() => void run('cancel')}
              disabled={busy !== null}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-[rgb(185,28,28)] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[rgb(160,24,24)] disabled:opacity-60"
            >
              {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} aria-hidden /> : null}
              Oui, annuler
            </button>
          </div>
        ) : (
          <div className="flex justify-end min-[810px]:self-end">
            <button
              type="button"
              disabled={cancelIn > 0 || busy !== null}
              onClick={() => {
                setMessage(null)
                setConfirming(true)
              }}
              className="flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold text-[rgb(185,28,28)] ring-1 ring-inset ring-[rgb(254,202,202)] transition-colors hover:bg-[rgb(254,242,242)] disabled:cursor-not-allowed disabled:text-[rgb(170,170,170)] disabled:ring-[rgb(228,228,228)] disabled:hover:bg-transparent"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
              {cancelIn > 0 ? `Annuler dans ${mmss(cancelIn)}` : 'Annuler et rembourser'}
            </button>
          </div>
        )
      ) : null}

      {message ? (
        <p role="alert" className="rounded-xl bg-[rgb(254,242,242)] px-3.5 py-2.5 text-[13px] leading-[18px] text-[rgb(153,27,27)] ring-1 ring-inset ring-[rgb(254,202,202)] min-[810px]:col-span-2">
          {message}
        </p>
      ) : null}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Confirmation d'achat                                                */
/* ------------------------------------------------------------------ */

export function ConfirmPurchase({
  open,
  onClose,
  onConfirm,
  service,
  country,
  flag,
  price,
  balance,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<string | null>
  service: string
  country: string
  flag: string
  price: number
  balance: number
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (!open) return null

  async function confirm() {
    setBusy(true)
    setError(null)
    const message = await onConfirm()
    setBusy(false)
    if (message) setError(message)
  }

  const short = balance < price
  const rows: [string, ReactNode][] = [
    ['Service', service],
    ['Pays', `${flag} ${country}`],
    ['Prix du numéro', <span className="font-semibold text-black">{formatFCFA(price)}</span>],
    ['Solde actuel', formatFCFA(balance)],
    short
      ? ['Il vous manque', <span className="font-semibold text-[rgb(185,28,28)]">{formatFCFA(price - balance)}</span>]
      : ['Solde après l’achat', <span className="font-semibold text-black">{formatFCFA(balance - price)}</span>],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center min-[810px]:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-[rgba(16,35,41,0.45)] backdrop-blur-[2px]" />
      <div className="glow-root relative z-[1] flex w-full max-w-[440px] flex-col gap-5 rounded-t-[28px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] min-[810px]:rounded-[28px] min-[810px]:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ServiceTile name={service} size={44} radius={12} />
            <div className="flex flex-col">
              <h2 id="confirm-title" className="font-glow-display text-[22px] font-medium leading-[26px] tracking-[-0.6px] text-black">
                Confirmer l’achat
              </h2>
              <span className="text-[14px] text-[var(--glow-gray)]">Payé avec votre solde Numflash</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(130,130,130)] hover:bg-[var(--glow-bg)]">
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <dl className="flex flex-col divide-y divide-[var(--glow-line)] rounded-2xl bg-[var(--glow-bg)] px-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 py-3 text-[15px]">
              <dt className="text-[var(--glow-gray)]">{k}</dt>
              <dd className="text-right text-[var(--glow-text)]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[13px] leading-[19px] text-[var(--glow-gray)]">Le numéro est à usage unique. Si aucun SMS n’arrive dans le délai, vous êtes remboursé automatiquement.</p>
        {error ? (
          <p role="alert" className="rounded-xl bg-[rgb(254,242,242)] px-3.5 py-3 text-[14px] leading-[20px] text-[rgb(153,27,27)] ring-1 ring-inset ring-[rgb(254,202,202)]">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {short ? (
            <Link to="/wallet" onClick={onClose} className={primaryButton}>
              Recharger mon solde
            </Link>
          ) : (
            <button ref={confirmRef} type="button" onClick={() => void confirm()} disabled={busy} className={primaryButton}>
              {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.2} aria-hidden /> : null}
              {busy ? 'Achat en cours…' : `Payer ${formatFCFA(price)}`}
            </button>
          )}
          <button type="button" onClick={onClose} className="h-11 rounded-xl text-[15px] font-medium text-[var(--glow-gray)] hover:text-black">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
