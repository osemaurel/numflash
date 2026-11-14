import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlowCard } from '../GlowCard'
import { Icon, Reveal, spring } from '../primitives'
import type { GlowIconName } from '../glowIcons'
import { useBreakpoint } from '../useBreakpoint'

interface Plan {
  name: string
  tagline: string
  bg: string
  button: { label: string; bg: string }
  monthly?: { price: string; yearly: string }
  features: { icon: GlowIconName; label: string }[]
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    tagline: 'For everyday shoppers',
    bg: 'bg-white',
    button: { label: 'Get started', bg: 'var(--glow-blue)' },
    features: [
      { icon: 'noMonthlyFees', label: 'No monthly fees' },
      { icon: 'globalPayments', label: 'Global payments' },
      { icon: 'currencyExchange', label: 'Currency exchange' },
      { icon: 'cashback', label: 'Cashback across 20+ brands' },
      { icon: 'cardSimple', label: '1 virtual card, 1 physical card' },
      { icon: 'cardPlus', label: '1 one-time card per month' },
    ],
  },
  {
    name: 'Gold',
    tagline: 'For advanced personal finance',
    bg: 'bg-[var(--glow-bg)]',
    button: { label: 'Subscribe', bg: 'var(--glow-gold)' },
    monthly: { price: '$49', yearly: '$499' },
    popular: true,
    features: [
      { icon: 'badgeCheck', label: 'Everything in Starter included' },
      { icon: 'integrations', label: 'Connect 10+ integrations' },
      { icon: 'coinsStack', label: 'Multi-currency support' },
      { icon: 'headphones', label: 'Priority customer support' },
      { icon: 'cardCheck', label: 'Unlimited virtual & physical cards' },
      { icon: 'cardSimple', label: 'Glow Gold card' },
    ],
  },
  {
    name: 'Business',
    tagline: 'For entrepreneurs and startups',
    bg: 'bg-white',
    button: { label: "Let's talk", bg: 'var(--glow-black)' },
    monthly: { price: '$99', yearly: '$999' },
    features: [
      { icon: 'reporting', label: 'Advanced reporting & analytics' },
      { icon: 'invoice', label: 'Invoice generation' },
      { icon: 'api', label: 'API access for integrations' },
      { icon: 'starCircle', label: 'Exclusive partner integrations' },
      { icon: 'payouts', label: 'Scheduled payouts' },
      { icon: 'cardSimple', label: 'Glow Black card' },
    ],
  },
]

/** Interrupteur Mensuel / Annuel propre à chaque offre (comme dans le modèle). */
function PriceToggle({ monthly }: { monthly: { price: string; yearly: string } }) {
  const [yearly, setYearly] = useState(false)
  return (
    <div className="flex h-[70px] flex-col items-start gap-3 overflow-hidden">
      <div className="flex items-center">
        <span className="font-glow-geist text-[28px] font-semibold leading-[33.6px] tracking-[-0.84px] text-black">{yearly ? monthly.yearly : monthly.price}</span>
        <span className="font-glow-geist text-[20px] font-semibold leading-[24px] tracking-[-0.6px] text-[var(--glow-gray)]">{yearly ? '/yearly' : '/month'}</span>
      </div>
      <button type="button" role="switch" aria-checked={yearly} onClick={() => setYearly((v) => !v)} className="flex items-center gap-2">
        <span className="relative h-6 w-[38px] overflow-hidden rounded-full border-2 border-[rgb(235,235,235)] bg-white">
          <motion.span
            className="absolute top-[2px] h-4 w-4 rounded-full"
            initial={false}
            animate={{ left: yearly ? 16 : 2, backgroundColor: yearly ? '#0085ee' : 'rgb(184, 184, 184)' }}
            transition={spring(0.2, 0.4)}
          />
        </span>
        <span className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-gray)]">{yearly ? 'Yearly' : 'Monthly'}</span>
      </button>
    </div>
  )
}

function PlanCard({ plan, delay }: { plan: Plan; delay: number }) {
  return (
    <Reveal
      from={{ y: 150 }}
      transition={spring(0, 0.5, delay)}
      amount={0.5}
      className={cn(
        'relative flex w-full flex-col items-start gap-4 rounded-[32px] p-7 ring-2 ring-inset ring-[rgb(235,235,235)] min-[810px]:max-[1199px]:rounded-[20px] min-[810px]:max-[1199px]:p-5 min-[1200px]:flex-1',
        plan.bg,
        plan.name !== 'Gold' && 'overflow-hidden',
      )}
    >
      {plan.popular ? (
        <span className="absolute left-1/2 top-[-11px] z-[1] flex h-[21px] -translate-x-1/2 items-center rounded-full bg-[var(--glow-gold)] px-3.5 text-[13px] font-medium leading-[15.6px] text-white">
          Popular
        </span>
      ) : null}
      <div className="flex flex-col gap-1 overflow-hidden">
        <p className="font-glow-geist text-[20px] font-semibold leading-[24px] tracking-[-0.6px] text-black">{plan.name}</p>
        <p className="text-[15px] font-medium leading-[22.5px] text-[var(--glow-gray)]">{plan.tagline}</p>
      </div>
      {plan.monthly ? (
        <PriceToggle monthly={plan.monthly} />
      ) : (
        <div className="flex h-[70px] flex-col justify-around overflow-hidden">
          <p className="font-glow-geist text-[28px] font-semibold leading-[28px] tracking-[-0.84px] text-black">Free</p>
          <p className="text-[15px] font-medium leading-[18px] tracking-[-0.15px] text-[var(--glow-gray)]">Always Free</p>
        </div>
      )}
      <a
        href="#"
        className="flex h-[41px] w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-medium leading-[16.8px] text-white transition-opacity hover:opacity-90"
        style={{ background: plan.button.bg }}
      >
        {plan.button.label}
        {/* Le modèle n'affiche le chevron qu'en tablette */}
        <span className="relative hidden h-[9px] w-1.5 shrink-0 min-[810px]:max-[1199px]:block">
          <Icon name="chevronRight" className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white opacity-60" />
        </span>
      </a>
      <ul className="flex w-full flex-col gap-2.5 overflow-hidden">
        {plan.features.map((f, i) => (
          <li key={f.label} className="flex items-center gap-1.5 overflow-hidden">
            {/* Les deux premières icônes de « Starter » sont un peu plus grandes dans le modèle (27 × 26) */}
            <span className={cn('flex shrink-0 items-center justify-center', plan.name === 'Starter' && i < 2 ? 'h-[26px] w-[27px]' : 'h-6 w-6')}>
              <Icon name={f.icon} className="h-5 w-5 text-[var(--glow-text)]" />
            </span>
            <span className="text-[14px] font-medium leading-[21px] tracking-[-0.28px] text-[var(--glow-text)] opacity-95">{f.label}</span>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}

export default function Pricing() {
  const bp = useBreakpoint()
  // Carte bleue inclinée de 9° derrière l'en-tête (centre, échelle) selon l'écran.
  const card = bp === 'desktop' ? { cx: 936.5, cy: 81.5, s: 1 } : bp === 'tablet' ? { cx: 822, cy: 82, s: 0.8 } : { cx: 221.5, cy: -59, s: 0.6 }
  return (
    <div id="pricing" className="flex scroll-mt-16 flex-col items-center px-4 pb-12 pt-24 min-[1200px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="relative flex w-full flex-col items-start gap-3">
          <h3 className="font-glow-geist text-[16px] font-medium leading-[16px] tracking-[-0.48px] text-[var(--glow-blue)]">Pricing</h3>
          <h2 className="font-glow-display max-w-[600px] text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:max-w-[400px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:max-w-[600px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Choose a plan that fits <span className="text-[var(--glow-blue)]">your lifestyle</span>
          </h2>
          <div className="pointer-events-none absolute z-[1]" style={{ left: card.cx - 202, top: card.cy - 114.5, transform: `rotate(9deg) scale(${card.s})` }}>
            <Reveal from={{ scale: 0.5 }} transition={spring(0.2, 0.4)} amount={0.5}>
              <GlowCard tone="blue" />
            </Reveal>
          </div>
          <p className="max-w-[600px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-[1199px]:max-w-[400px]">
            From everyday spending to premium perks, our transparent pricing puts you in control of your money with no hidden fees or surprises.
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-5 min-[810px]:flex-row min-[810px]:gap-4 min-[1200px]:gap-5">
          {PLANS.map((p, i) => (
            <PlanCard key={p.name} plan={p} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </div>
  )
}
