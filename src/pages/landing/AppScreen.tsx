import type { ReactNode } from 'react'
import { cn, formatFCFA } from '@/lib/utils'
import { SvgImg } from '../glow/primitives'
import { ServiceTile, digits, signedFCFA } from './ui'

/*
 * Écrans de l'application Numflash dans le cadre iPhone (largeur de conception 385 px).
 * Données d'illustration : les numéros utilisent des plages réservées à la fiction
 * (+44 7700 900xxx, +1 202 555 01xx, +33 6 39 98 xx xx) et les prix sont des tarifs
 * réels relevés dans le catalogue.
 */

export type AppTab = 'Accueil' | 'Services' | 'SMS' | 'Solde' | 'Affiliation'
const TABS: AppTab[] = ['Accueil', 'Services', 'SMS', 'Solde', 'Affiliation']

const cardShadow = '0px 1px 4px 0px rgba(12, 12, 13, 0.05), 0px 1px 4px 0px rgba(12, 12, 13, 0.1)'
const GREEN = 'rgb(55, 158, 45)'
const MUTED = 'rgb(121, 121, 121)'

function AppCard({ title, children, chevron = true }: { title: string; children: ReactNode; chevron?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-5 rounded-[20px] bg-white px-5 py-4" style={{ boxShadow: cardShadow }}>
      <div className="flex items-center opacity-60">
        <span className="font-glow-manrope text-[14px] font-bold leading-[16.8px] text-[#050505]">{title}</span>
        {chevron ? <SvgImg name="headingChevron" className="h-3 w-3" /> : null}
      </div>
      {children}
    </div>
  )
}

const t18 = 'text-[18px] font-medium leading-[21.6px] tracking-[-0.36px] text-black'
const t16 = 'text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black'
const t14 = 'text-[14px] leading-[16.8px] tracking-[-0.28px] text-black/50'
const t13 = 'text-[13px] font-medium leading-[15.6px] tracking-[-0.26px]'

/* ---------- Cartes ---------- */

function WalletCard() {
  return (
    <AppCard title="Solde">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <SvgImg name="cashCoin" className="h-10 w-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={t18}>Portefeuille</span>
              <span className={t16}>{formatFCFA(12500)}</span>
            </div>
            <div className={cn('flex flex-col gap-1.5', t13)} style={{ color: MUTED }}>
              <div className="flex justify-between">
                <span>Rechargé</span>
                <span>{signedFCFA(15000)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dépensé</span>
                <span>{signedFCFA(-2500)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <SvgImg name="stocksCoin" className="h-10 w-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={t18}>Commandes</span>
              <span className={t16}>{formatFCFA(1400)}</span>
            </div>
            <div className={cn('flex justify-between', t13)} style={{ color: MUTED }}>
              <span>3 numéros</span>
              <span style={{ color: GREEN }}>3 codes reçus</span>
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  )
}

const NUMBERS = [
  { service: 'WhatsApp', dial: '+44', number: '+44 7700 900123', price: 600 },
  { service: 'Telegram', dial: '+1', number: '+1 202 555 0147', price: 600 },
  { service: 'Google', dial: '+33', number: '+33 6 39 98 12 34', price: 200 },
]

function NumbersCard() {
  return (
    <AppCard title="Mes numéros">
      <div className="flex flex-col gap-4">
        {NUMBERS.map((n) => (
          <div key={n.number} className="flex gap-3">
            <span className="font-glow-display flex h-10 w-[63px] shrink-0 items-end justify-end rounded-lg p-1.5 text-[13px] font-semibold leading-none text-white" style={{ background: tileColor(n.service) }}>
              {n.dial}
            </span>
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className={t16}>{n.service}</span>
              <span className={t14}>{n.number}</span>
            </div>
            <span className={t16}>{formatFCFA(n.price)}</span>
          </div>
        ))}
      </div>
    </AppCard>
  )
}

const CODES = [
  { service: 'WhatsApp', country: 'Royaume-Uni', code: '482-913', when: 'il y a 1 min' },
  { service: 'Telegram', country: 'États-Unis', code: '58204', when: 'il y a 6 min' },
  { service: 'Google', country: 'France', code: 'G-731906', when: 'il y a 12 min' },
]

function CodesCard({ title = 'Codes reçus' }: { title?: string }) {
  return (
    <AppCard title={title}>
      <div className="flex flex-col gap-4">
        {CODES.map((c) => (
          <div key={c.code} className="flex gap-3">
            <ServiceTile name={c.service} />
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className={t16}>{c.service}</span>
              <span className={t14}>{c.country}</span>
            </div>
            <div className="flex flex-col items-end justify-center gap-0.5">
              <span className="font-glow-mono text-[16px] font-bold leading-[19.2px] tracking-[0.5px] text-black">{c.code}</span>
              <span className={t13} style={{ color: GREEN }}>
                {c.when}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppCard>
  )
}

/** Prix réels relevés pour le Royaume-Uni (catalogue du 14/11/2026). */
const UK_PRICES = [
  { service: 'WhatsApp', price: 600 },
  { service: 'Telegram', price: 700 },
  { service: 'Google', price: 200 },
  { service: 'Facebook', price: 150 },
  { service: 'Instagram', price: 150 },
]

function ServicesCard() {
  return (
    <AppCard title="Royaume-Uni">
      <div className="flex flex-col gap-4">
        {UK_PRICES.map((s) => (
          <div key={s.service} className="flex gap-3">
            <ServiceTile name={s.service} />
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className={t16}>{s.service}</span>
              <span className={t14}>Numéro +44</span>
            </div>
            <div className="flex flex-col items-end justify-center gap-0.5">
              <span className={t16}>{formatFCFA(s.price)}</span>
              <span className={t13} style={{ color: GREEN }}>
                En stock
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppCard>
  )
}

const HISTORY = [
  { label: 'Recharge Mobile Money', sub: 'Confirmée', amount: 10000 },
  { label: 'WhatsApp · Royaume-Uni', sub: 'Code reçu', amount: -600 },
  { label: 'Telegram · États-Unis', sub: 'Code reçu', amount: -600 },
  { label: 'Google · France', sub: 'Code reçu', amount: -200 },
]

function HistoryCard() {
  return (
    <AppCard title="Historique">
      <div className="flex flex-col gap-4">
        {HISTORY.map((h) => (
          <div key={h.label} className="flex items-center gap-3">
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className={t16}>{h.label}</span>
              <span className={t14}>{h.sub}</span>
            </div>
            <span className={t16} style={{ color: h.amount > 0 ? GREEN : undefined }}>
              {signedFCFA(h.amount)}
            </span>
          </div>
        ))}
      </div>
    </AppCard>
  )
}

const REFERRALS = [
  { name: 'Koffi A.', when: 'Achat WhatsApp' },
  { name: 'Mariam D.', when: 'Achat Telegram' },
  { name: 'Yao K.', when: 'Achat Google' },
]

function AffiliateCard({ reward }: { reward: number }) {
  return (
    <AppCard title="Mes filleuls">
      <div className="flex flex-col gap-4">
        {REFERRALS.map((r) => (
          <div key={r.name} className="flex gap-3">
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[rgb(222,242,255)] text-[13px] font-semibold text-[var(--glow-blue-dark)]">
              {r.name
                .split(' ')
                .map((p) => p.charAt(0))
                .join('')}
            </span>
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className={t16}>{r.name}</span>
              <span className={t14}>{r.when}</span>
            </div>
            <span className={cn(t16, 'self-center')} style={{ color: GREEN }}>
              {signedFCFA(reward)}
            </span>
          </div>
        ))}
      </div>
    </AppCard>
  )
}

function LinkCard() {
  return (
    <AppCard title="Votre lien de parrainage" chevron={false}>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--glow-bg)] px-3 py-2.5">
        <span className="font-glow-mono truncate text-[14px] font-bold text-black">numflash.com/r/awa</span>
        <span className="rounded-full bg-[var(--glow-blue)] px-3 py-1 text-[13px] font-semibold text-white">Copier</span>
      </div>
    </AppCard>
  )
}

/* ---------- Écran ---------- */

function tileColor(service: string) {
  return (
    {
      WhatsApp: '#25D366',
      Telegram: '#2AABEE',
      Google: '#4285F4',
    } as Record<string, string>
  )[service] ?? 'var(--glow-blue)'
}

function Navbar({ tab }: { tab: AppTab }) {
  return (
    <div className={cn('flex items-center gap-1', tab === 'Affiliation' && 'justify-end')}>
      {TABS.map((t) => (
        <div key={t} className={cn('flex h-[26px] shrink-0 items-center rounded-full px-3 py-0.5', t === tab && 'bg-white')} style={t === tab ? { boxShadow: cardShadow } : undefined}>
          <span className={cn('font-glow-manrope text-[14px] font-bold leading-[16.8px]', t === tab ? 'text-[#050505]' : 'text-white/70')}>{t}</span>
        </div>
      ))}
    </div>
  )
}

export type AppSection = 'wallet' | 'numbers' | 'codes' | 'services' | 'history' | 'referrals' | 'link'

export function AppScreen({
  tab = 'Accueil',
  sections,
  total,
  reward = 500,
}: {
  tab?: AppTab
  sections: AppSection[]
  /** Montant mis en avant en haut de l'écran (solde ou gains). Absent = en-tête compact. */
  total?: { label: string; amount: number }
  reward?: number
}) {
  const blocks: Record<AppSection, ReactNode> = {
    wallet: <WalletCard />,
    numbers: <NumbersCard />,
    codes: <CodesCard />,
    services: <ServicesCard />,
    history: <HistoryCard />,
    referrals: <AffiliateCard reward={reward} />,
    link: <LinkCard />,
  }
  return (
    <figure className="relative h-[820px] w-[385px] overflow-clip" aria-label="Aperçu de l'application Numflash">
      <SvgImg name="phoneScreenBg" className="absolute inset-0 h-full w-full" />
      <div className="absolute left-0 top-0 w-full" style={{ height: total ? 318 : 181, background: 'linear-gradient(180deg, #0085ee 0%, rgba(0, 134, 237, 0.7) 100%)' }} />
      <div className="absolute left-[15px] top-[55px] flex w-[355px] flex-col gap-4">
        <div className="flex h-[30px] items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[37px] bg-white text-[13px] font-medium leading-[15.6px] text-[#050505]">AK</span>
            <span className="font-glow-manrope text-[16px] font-semibold leading-[19.2px] text-white">Bonjour, Awa</span>
          </div>
          <div className="flex items-center gap-4">
            <SvgImg name="bell" className="h-6 w-6" />
            <SvgImg name="settings" className="h-6 w-6" />
          </div>
        </div>
        <Navbar tab={tab} />
        {total ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex items-center justify-center gap-1">
              <SvgImg name="selectorLeft" className="h-3 w-3 opacity-0" />
              <span className="font-glow-manrope text-[14px] font-bold leading-[16.8px] text-white">{total.label}</span>
              <SvgImg name="selectorDown" className="h-3 w-3" />
            </div>
            <div className="flex items-end justify-center gap-1.5">
              <span className="text-[44px] font-semibold leading-[44px] tracking-[-1.76px] text-white">{digits(total.amount)}</span>
              <span className="pb-1 text-[20px] font-medium leading-[24px] tracking-[-0.4px] text-white/60">FCFA</span>
            </div>
          </div>
        ) : null}
        {sections.map((s) => (
          <div key={s}>{blocks[s]}</div>
        ))}
      </div>
    </figure>
  )
}
