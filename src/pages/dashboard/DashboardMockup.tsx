import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, ChevronRight, Copy, Hourglass, Plus, RotateCcw, ShoppingBag, Wallet } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { Img } from '../glow/primitives'
import { NumberCard } from '../landing/NumberCard'
import { ServiceTile, signedFCFA } from '../landing/ui'
import { DashboardShell } from './DashboardShell'

/*
 * MAQUETTE de l'accueil de l'espace client (données fictives, rien n'est enregistré).
 * Numéros dans des plages réservées à la fiction ; prix de la grille (3 500 FCFA minimum).
 */

const USER = { name: 'Awa Koné', email: 'awa.kone@exemple.com', balance: 14500 }

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function Card({ title, aside, children, className }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-[28px] bg-white p-4 ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:p-6', className)}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <h2 className="font-glow-display text-[19px] font-medium leading-[22px] tracking-[-0.5px] text-black">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function SeeAll({ children = 'Tout voir' }: { children?: ReactNode }) {
  return (
    <a href="#" className="group flex items-center gap-0.5 text-[14px] font-medium text-[var(--glow-blue-dark)]">
      {children}
      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden />
    </a>
  )
}

function CopyButton({ value, label = 'Copier', dark = false }: { value: string; label?: string; dark?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value.replace(/\s/g, '')).catch(() => undefined)
        setDone(true)
        window.setTimeout(() => setDone(false), 1500)
      }}
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

function mmss(total: number) {
  const s = Math.max(0, total)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Compte à rebours de démonstration (une seconde = une seconde). */
function useCountdown(start: number) {
  const [left, setLeft] = useState(start)
  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [])
  return left
}

/* ------------------------------------------------------------------ */
/* 1. Carte solde                                                      */
/* ------------------------------------------------------------------ */

function BalanceCard() {
  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-5 text-white min-[810px]:p-7"
      style={{
        backgroundImage: 'linear-gradient(145deg, #0085ee 0%, rgb(114, 189, 247) 100%)',
        boxShadow: 'rgba(52, 217, 217, 0.14) 0px 10px 50px 0px inset',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.3] [filter:brightness(1.6)_grayscale(1)_blur(8px)]">
        <Img src="clouds.webp" className="h-full w-full object-cover object-bottom" />
      </div>
      <div className="pointer-events-none absolute right-[-36px] top-[34px] hidden min-[810px]:block" style={{ transform: 'rotate(-8deg) scale(0.58)', transformOrigin: 'right top' }}>
        <NumberCard tone="black" />
      </div>
      <div className="relative z-[1] flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 text-[14px] font-medium text-white/85">
            <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden />
            Solde disponible
          </span>
          <span className="flex items-end gap-2">
            <span className="font-glow-display text-[44px] font-semibold leading-[44px] tracking-[-1.76px] min-[810px]:text-[52px] min-[810px]:leading-[52px]">
              {formatFCFA(USER.balance).replace(/\s?FCFA$/, '')}
            </span>
            <span className="pb-1 text-[20px] font-medium leading-[24px] text-white/65">FCFA</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 min-[810px]:flex">
          {[
            { icon: ArrowDownLeft, label: 'Rechargé', value: signedFCFA(25000) },
            { icon: ArrowUpRight, label: 'Dépensé', value: signedFCFA(-10500) },
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
        <div className="grid grid-cols-2 gap-2 min-[810px]:flex">
          <a href="#" className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-semibold text-[var(--glow-blue-dark)] transition-opacity hover:opacity-90">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
            Recharger
          </a>
          <a href="#acheter" className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/15 px-4 text-[15px] font-semibold text-white ring-1 ring-inset ring-white/35 transition-colors hover:bg-white/25">
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            Acheter
          </a>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Numéros en cours                                                 */
/* ------------------------------------------------------------------ */

function NumberLine({ number }: { number: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--glow-bg)] py-1.5 pl-3.5 pr-1.5">
      <span className="font-glow-display truncate text-[18px] font-semibold tracking-[-0.2px] text-black">{number}</span>
      <CopyButton value={number} />
    </div>
  )
}

function OrderHead({ service, flag, country, status }: { service: string; flag: string; country: string; status: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <ServiceTile name={service} size={42} radius={12} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-medium leading-[20px] tracking-[-0.32px] text-black">{service}</span>
        <span className="truncate text-[13px] leading-[17px] text-[var(--glow-gray)]">
          {flag} {country}
        </span>
      </div>
      {status}
    </div>
  )
}

function ReceivedOrder() {
  return (
    <article className="grid grid-cols-1 gap-3 rounded-2xl p-3.5 ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:grid-cols-2 min-[810px]:grid-rows-[auto_auto_1fr] min-[810px]:gap-x-5 min-[810px]:gap-y-3 min-[810px]:p-4">
      <OrderHead
        service="WhatsApp"
        flag="🇬🇧"
        country="Royaume-Uni"
        status={
          <span className="flex items-center gap-1 rounded-full bg-[rgb(232,246,234)] px-2.5 py-1 text-[12px] font-semibold text-[rgb(28,120,28)]">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
            Code reçu
          </span>
        }
      />
      <NumberLine number="+44 7700 900123" />
      <div className="flex flex-col gap-2 rounded-xl bg-[rgb(240,250,241)] p-3.5 ring-1 ring-inset ring-[rgb(205,235,208)] min-[810px]:col-start-2 min-[810px]:row-span-3 min-[810px]:row-start-1 min-[810px]:justify-center">
        <span className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[rgb(28,120,28)]">Votre code · il y a 1 min</span>
        <div className="flex items-center justify-between gap-3">
          <span className="font-glow-mono whitespace-nowrap text-[28px] font-bold leading-[34px] tracking-[2px] text-black">482-913</span>
          <CopyButton value="482913" dark />
        </div>
        <p className="text-[13px] leading-[18px] text-[rgb(80,95,82)]">« Votre code WhatsApp : 482-913. Ne le communiquez à personne. »</p>
      </div>
      <div className="flex items-center justify-between gap-3 min-[810px]:self-end">
        <span className="text-[13px] text-[var(--glow-gray)]">Un autre SMS peut encore arriver sur ce numéro.</span>
        <button type="button" className="h-9 shrink-0 rounded-lg bg-black px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85">
          Terminer
        </button>
      </div>
    </article>
  )
}

function WaitingOrder() {
  const TOTAL = 20 * 60
  const left = useCountdown(17 * 60 + 42)
  const cancelIn = Math.max(0, left - (TOTAL - 120))
  return (
    <article className="grid grid-cols-1 gap-3 rounded-2xl p-3.5 ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:grid-cols-2 min-[810px]:grid-rows-[auto_auto_1fr] min-[810px]:gap-x-5 min-[810px]:gap-y-3 min-[810px]:p-4">
      <OrderHead
        service="Telegram"
        flag="🇺🇸"
        country="États-Unis"
        status={
          <span className="flex items-center gap-1.5 rounded-full bg-[rgb(255,244,229)] px-2.5 py-1 text-[12px] font-semibold text-[rgb(178,98,0)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(245,158,11)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(245,158,11)]" />
            </span>
            En attente
          </span>
        }
      />
      <NumberLine number="+1 202 555 0147" />
      <div className="flex flex-col gap-2.5 rounded-xl bg-[var(--glow-bg)] p-3.5 min-[810px]:col-start-2 min-[810px]:row-span-3 min-[810px]:row-start-1 min-[810px]:justify-center">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[14px] font-medium text-black">
            <Hourglass className="h-4 w-4 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
            En attente du SMS…
          </span>
          <span className="font-glow-mono text-[15px] font-bold text-black" aria-label="Temps restant">
            {mmss(left)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(228,228,228)]">
          <div className="h-full rounded-full bg-[var(--glow-blue)] transition-[width] duration-1000 ease-linear" style={{ width: `${(left / TOTAL) * 100}%` }} />
        </div>
        <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">Le code s’affichera ici dès sa réception. Sans SMS avant la fin du délai, vous êtes remboursé automatiquement.</p>
      </div>
      <div className="flex justify-end min-[810px]:self-end">
        <button
          type="button"
          disabled={cancelIn > 0}
          className="flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold text-[rgb(185,28,28)] ring-1 ring-inset ring-[rgb(254,202,202)] transition-colors hover:bg-[rgb(254,242,242)] disabled:cursor-not-allowed disabled:text-[rgb(170,170,170)] disabled:ring-[rgb(228,228,228)] disabled:hover:bg-transparent"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
          {cancelIn > 0 ? `Annuler dans ${mmss(cancelIn)}` : 'Annuler et rembourser'}
        </button>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Achat rapide                                                     */
/* ------------------------------------------------------------------ */

const QUICK_SERVICES = ['WhatsApp', 'Telegram', 'Google', 'Facebook', 'Instagram', 'TikTok', 'Discord', 'Twitter / X', 'Amazon', 'Microsoft', 'Uber', 'Tinder']
const QUICK_COUNTRIES = [
  { flag: '🇫🇷', name: 'France', price: 3500 },
  { flag: '🇺🇸', name: 'États-Unis', price: 3500 },
  { flag: '🇬🇧', name: 'Royaume-Uni', price: 3500 },
  { flag: '🇩🇪', name: 'Allemagne', price: 3900 },
]

function QuickBuy() {
  const [service, setService] = useState('WhatsApp')
  const [country, setCountry] = useState('France')
  const price = QUICK_COUNTRIES.find((c) => c.name === country)?.price ?? 3500
  const flag = QUICK_COUNTRIES.find((c) => c.name === country)?.flag
  return (
    <Card title="Acheter un numéro" aside={<SeeAll>Tous les services</SeeAll>} className="scroll-mt-20">
      <div id="acheter" className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--glow-gray)]">1. Application</span>
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] min-[810px]:mx-0 min-[810px]:flex-wrap min-[810px]:overflow-visible min-[810px]:px-0">
          {QUICK_SERVICES.map((s) => {
            const on = s === service
            return (
              <li key={s} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setService(s)}
                  className={cn(
                    'flex h-[78px] w-[78px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white transition-shadow',
                    on ? 'shadow-[0_8px_20px_-8px_rgba(0,133,238,0.45)] ring-2 ring-[var(--glow-blue)]' : 'ring-1 ring-inset ring-[rgb(232,232,232)] hover:ring-[rgb(205,205,205)]',
                  )}
                >
                  <ServiceTile name={s} size={34} radius={10} />
                  <span className="w-full truncate px-1 text-center text-[11px] font-medium leading-[13px] text-black">{s}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[var(--glow-gray)]">2. Pays</span>
          <SeeAll>Voir les 124 pays</SeeAll>
        </div>
        <ul className="grid grid-cols-1 gap-2 min-[810px]:grid-cols-2">
          {QUICK_COUNTRIES.map((c) => {
            const on = c.name === country
            return (
              <li key={c.name}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCountry(c.name)}
                  className={cn(
                    'flex h-11 w-full items-center justify-between gap-3 rounded-[10px] border py-2 pl-2.5 pr-3 transition-colors',
                    on ? 'border-[rgb(0,157,255)] bg-[rgb(222,242,255)]' : 'border-[rgb(232,232,232)] bg-white hover:border-[rgb(205,205,205)]',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {on ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(51,136,255)]">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-[rgb(214,214,214)] bg-white" />
                    )}
                    <span className="text-[20px] leading-none" aria-hidden>
                      {c.flag}
                    </span>
                    <span className={cn('text-[14px] tracking-[-0.28px]', on ? 'font-semibold text-black' : 'font-medium text-[rgb(48,48,48)]')}>{c.name}</span>
                  </span>
                  <span className={cn('text-[14px] font-semibold', on ? 'text-black' : 'text-[rgb(88,89,89)]')}>{formatFCFA(c.price)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--glow-line)] pt-4 min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-[15px] font-medium text-black">
            <ServiceTile name={service} size={22} radius={6} />
            {service} · {flag} {country}
          </span>
          <span className="text-[13px] text-[var(--glow-gray)]">Solde après l’achat : {formatFCFA(USER.balance - price)}</span>
        </div>
        <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--glow-blue)] px-5 text-[16px] font-medium text-white transition-colors hover:bg-[var(--glow-blue-dark)]" style={{ boxShadow: '0 10px 24px -10px rgba(0, 133, 238, 0.6)' }}>
          Acheter pour {formatFCFA(price)}
        </button>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 4. Derniers codes et historique                                     */
/* ------------------------------------------------------------------ */

const CODES = [
  { service: 'WhatsApp', country: '🇬🇧 Royaume-Uni', code: '482-913', when: 'il y a 1 min' },
  { service: 'Google', country: '🇫🇷 France', code: 'G-731906', when: 'hier, 18:42' },
  { service: 'Telegram', country: '🇨🇦 Canada', code: '58204', when: '12 nov., 09:15' },
]

function LastCodes() {
  return (
    <Card title="Derniers codes reçus" aside={<SeeAll />}>
      <ul className="flex flex-col divide-y divide-[var(--glow-line)]">
        {CODES.map((c) => (
          <li key={c.code} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <ServiceTile name={c.service} size={38} radius={10} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-medium leading-[19px] text-black">{c.service}</span>
              <span className="truncate text-[13px] leading-[17px] text-[var(--glow-gray)]">
                {c.country} · {c.when}
              </span>
            </div>
            <span className="font-glow-mono text-[16px] font-bold tracking-[0.5px] text-black">{c.code}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

const HISTORY = [
  { label: 'Recharge', sub: 'Mobile Money · 10:02', amount: 20000, kind: 'topup' },
  { label: 'WhatsApp', sub: 'Royaume-Uni · 10:05', amount: -3500, kind: 'purchase' },
  { label: 'Telegram', sub: 'États-Unis · 10:09', amount: -3500, kind: 'purchase' },
  { label: 'Remboursement', sub: 'SMS non reçu · hier', amount: 3500, kind: 'refund' },
] as const

function History() {
  return (
    <Card title="Historique" aside={<SeeAll />}>
      <ul className="flex flex-col divide-y divide-[var(--glow-line)]">
        {HISTORY.map((h) => (
          <li key={h.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={cn(
                'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full',
                h.kind === 'topup' ? 'bg-[rgb(232,246,234)] text-[rgb(28,120,28)]' : h.kind === 'refund' ? 'bg-[rgb(222,242,255)] text-[var(--glow-blue-dark)]' : 'bg-[var(--glow-bg)] text-[rgb(90,90,90)]',
              )}
            >
              {h.kind === 'topup' ? <ArrowDownLeft className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden /> : h.kind === 'refund' ? <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden /> : <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-medium leading-[19px] text-black">{h.label}</span>
              <span className="truncate text-[13px] leading-[17px] text-[var(--glow-gray)]">{h.sub}</span>
            </div>
            <span className={cn('shrink-0 text-[15px] font-semibold', h.amount > 0 ? 'text-[rgb(28,120,28)]' : 'text-black')}>{signedFCFA(h.amount)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardMockup() {
  useEffect(() => {
    const prev = document.title
    document.title = 'Maquette — Accueil de l’espace client — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <DashboardShell active="accueil" user={USER}>
      <div className="flex flex-col gap-5 min-[810px]:gap-6">
        <div className="flex flex-col gap-3 min-[810px]:flex-row min-[810px]:items-end min-[810px]:justify-between">
          <div className="flex flex-col gap-1">
            <span className="inline-flex w-max items-center rounded-full bg-[rgba(194,164,99,0.16)] px-2.5 py-0.5 text-[12px] font-semibold text-[rgb(135,108,50)]">Maquette · données fictives</span>
            <h1 className="font-glow-display text-[28px] font-medium leading-[32px] tracking-[-1px] text-black min-[810px]:text-[36px] min-[810px]:leading-[40px] min-[810px]:tracking-[-1.44px]">
              Bonjour, <span className="text-[var(--glow-blue)]">Awa</span>
            </h1>
            <p className="text-[15px] leading-[22px] text-[var(--glow-gray)] min-[810px]:text-[16px]">Voici l’essentiel de votre compte.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 min-[1200px]:grid-cols-[minmax(0,1fr)_380px] min-[1200px]:items-start min-[810px]:gap-6">
          <div className="flex min-w-0 flex-col gap-5 min-[810px]:gap-6">
            <BalanceCard />
            <Card
              title="Numéros en cours"
              aside={
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--glow-blue)] px-2 py-0.5 text-[12px] font-semibold text-white">2</span>
                  <SeeAll />
                </span>
              }
            >
              <div className="flex flex-col gap-3">
                <ReceivedOrder />
                <WaitingOrder />
              </div>
            </Card>
            <QuickBuy />
          </div>
          <div className="flex min-w-0 flex-col gap-5 min-[810px]:gap-6">
            <LastCodes />
            <History />
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
