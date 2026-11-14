import { Link } from 'react-router-dom'
import {
  CreditCard,
  Gift,
  Globe2,
  Headphones,
  History,
  Lock,
  MessageSquareText,
  MonitorSmartphone,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Tag,
  UserPlus,
  Wallet,
  Waves,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { Reveal, spring } from '../../glow/primitives'
import { useBreakpoint } from '../../glow/useBreakpoint'
import type { LandingFacts } from '../facts'
import { NumberCard } from '../NumberCard'
import { Chevron, digits } from '../ui'

interface Offer {
  name: string
  tagline: string
  bg: string
  price: { main: string; unit?: string; note: string }
  button: { label: string; bg: string; to: string }
  features: { icon: LucideIcon; label: string }[]
  popular?: boolean
}

function offers(facts: LandingFacts): Offer[] {
  return [
    {
      name: 'Inscription',
      tagline: 'Pour commencer',
      bg: 'bg-white',
      price: { main: 'Gratuit', note: 'Sans abonnement' },
      button: { label: 'Créer un compte', bg: 'var(--glow-blue)', to: '/inscription' },
      features: [
        { icon: UserPlus, label: 'Compte gratuit, sans engagement' },
        { icon: Globe2, label: `Accès aux ${facts.countries} pays du catalogue` },
        { icon: MessageSquareText, label: 'Codes affichés en temps réel' },
        { icon: History, label: 'Historique des numéros et des codes' },
        { icon: Headphones, label: 'Assistance sur WhatsApp' },
        { icon: Gift, label: 'Programme d’affiliation' },
      ],
    },
    {
      name: 'Numéro',
      tagline: 'Payé à l’unité',
      bg: 'bg-[var(--glow-bg)]',
      price: { main: formatFCFA(facts.minPrice), unit: '/numéro', note: 'Prix minimum, selon le service et le pays' },
      button: { label: 'Acheter un numéro', bg: 'var(--glow-gold)', to: '/inscription' },
      popular: true,
      features: [
        { icon: Tag, label: 'Prix affiché avant l’achat' },
        { icon: RotateCcw, label: 'Remboursé si le SMS n’arrive pas' },
        { icon: Lock, label: 'Numéro privé, à usage unique' },
        { icon: XCircle, label: 'Annulation possible sans SMS' },
        { icon: Wallet, label: 'Payé depuis votre solde' },
        { icon: MonitorSmartphone, label: 'Sur téléphone et ordinateur' },
      ],
    },
    {
      name: 'Recharge',
      tagline: 'Mobile Money, Wave ou carte',
      bg: 'bg-white',
      price: { main: formatFCFA(facts.topupTiers[0]), unit: '/minimum', note: 'Crédité après confirmation' },
      button: { label: 'Recharger mon solde', bg: 'var(--glow-black)', to: '/inscription' },
      features: [
        { icon: Wallet, label: `Montants : ${facts.topupTiers.map(digits).join(', ')} FCFA` },
        { icon: Smartphone, label: 'Orange Money, MTN Money, Moov Money' },
        { icon: Waves, label: 'Wave' },
        { icon: CreditCard, label: 'Carte bancaire' },
        { icon: ShieldCheck, label: 'Paiement vérifié auprès de l’opérateur' },
        { icon: Receipt, label: 'Historique de vos recharges' },
      ],
    },
  ]
}

function OfferCard({ o, delay }: { o: Offer; delay: number }) {
  return (
    <Reveal
      from={{ y: 150 }}
      transition={spring(0, 0.5, delay)}
      amount={0.5}
      className={cn(
        'relative flex w-full flex-col items-start gap-4 rounded-[32px] p-7 ring-2 ring-inset ring-[rgb(235,235,235)] min-[810px]:max-[1199px]:rounded-[20px] min-[810px]:max-[1199px]:p-5 min-[1200px]:flex-1',
        o.bg,
        !o.popular && 'overflow-hidden',
      )}
    >
      {o.popular ? (
        <span className="absolute left-1/2 top-[-11px] z-[1] flex h-[21px] -translate-x-1/2 items-center rounded-full bg-[var(--glow-gold)] px-3.5 text-[13px] font-medium leading-[15.6px] text-white">
          L’essentiel
        </span>
      ) : null}
      <div className="flex flex-col gap-1 overflow-hidden">
        <p className="font-glow-geist text-[20px] font-semibold leading-[24px] tracking-[-0.6px] text-black">{o.name}</p>
        <p className="text-[15px] font-medium leading-[22.5px] text-[var(--glow-gray)]">{o.tagline}</p>
      </div>
      <div className="flex h-[70px] flex-col items-start justify-center gap-3 overflow-hidden">
        <div className="flex items-center">
          <span className="font-glow-geist text-[28px] font-semibold leading-[33.6px] tracking-[-0.84px] text-black">{o.price.main}</span>
          {o.price.unit ? <span className="font-glow-geist text-[20px] font-semibold leading-[24px] tracking-[-0.6px] text-[var(--glow-gray)]">{o.price.unit}</span> : null}
        </div>
        <span className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-gray)]">{o.price.note}</span>
      </div>
      <Link
        to={o.button.to}
        className="group flex h-[41px] w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium leading-[16.8px] text-white transition-opacity hover:opacity-90"
        style={{ background: o.button.bg }}
      >
        {o.button.label}
        <span className="hidden min-[810px]:max-[1199px]:block">
          <Chevron />
        </span>
      </Link>
      <ul className="flex w-full flex-col gap-2.5 overflow-hidden">
        {o.features.map((f) => (
          <li key={f.label} className="flex items-center gap-1.5 overflow-hidden">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <f.icon className="h-5 w-5 text-[var(--glow-text)]" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="text-[14px] font-medium leading-[21px] tracking-[-0.28px] text-[var(--glow-text)] opacity-95">{f.label}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

export default function Pricing({ facts }: { facts: LandingFacts }) {
  const bp = useBreakpoint()
  const card = bp === 'desktop' ? { cx: 936.5, cy: 81.5, s: 1 } : bp === 'tablet' ? { cx: 822, cy: 82, s: 0.8 } : { cx: 221.5, cy: -59, s: 0.6 }
  return (
    <div id="tarifs" className="flex scroll-mt-16 flex-col items-center px-4 pb-12 pt-24 min-[1200px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="relative flex w-full flex-col items-start gap-3">
          <h3 className="font-glow-geist text-[16px] font-medium leading-[16px] tracking-[-0.48px] text-[var(--glow-blue)]">Tarifs</h3>
          <h2 className="font-glow-display max-w-[600px] text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:max-w-[400px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:max-w-[600px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Payez uniquement <span className="text-[var(--glow-blue)]">vos numéros</span>
          </h2>
          <div className="pointer-events-none absolute z-[1]" style={{ left: card.cx - 202, top: card.cy - 114.5, transform: `rotate(9deg) scale(${card.s})` }}>
            <Reveal from={{ scale: 0.5 }} transition={spring(0.2, 0.4)} amount={0.5}>
              <NumberCard tone="blue" />
            </Reveal>
          </div>
          <p className="max-w-[600px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-[1199px]:max-w-[400px]">
            Pas d’abonnement ni de frais cachés : vous rechargez votre solde quand vous le souhaitez, et chaque numéro est débité au prix affiché.
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-5 min-[810px]:flex-row min-[810px]:gap-4 min-[1200px]:gap-5">
          {offers(facts).map((o, i) => (
            <OfferCard key={o.name} o={o} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </div>
  )
}
