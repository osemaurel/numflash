import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Globe2, RefreshCw, Smartphone, Tag, Wallet, type LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { Img, Reveal, spring } from '../../glow/primitives'
import { PlanOption, SH_PILL } from '../../glow/sections/Feature1'
import { CharReveal } from '../../glow/sections/Feature4'
import type { LandingFacts } from '../facts'
import { NumberCard, NumberStack } from '../NumberCard'
import { ArrowLink, Pill, digits, signedFCFA } from '../ui'

function BlockText({ icon, pill, title, text, tone, nowrap = false }: { icon: LucideIcon; pill: string; title: string; text: string; tone?: 'blue' | 'gold'; nowrap?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 overflow-hidden">
      <Pill icon={icon} tone={tone}>
        {pill}
      </Pill>
      <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] text-black">{title}</h3>
      <p className={cn('text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90', nowrap && 'whitespace-nowrap')}>{text}</p>
    </div>
  )
}

function StackVisual() {
  return (
    <div className="relative h-[228px] w-[357px] max-w-full min-[810px]:h-[300px]">
      <div className="absolute left-[27px] top-0 origin-top-left scale-[0.6] min-[810px]:left-[-13px] min-[810px]:top-4 min-[810px]:scale-[0.7]">
        <Reveal from={{ scale: 0.5 }} transition={spring(0.2, 0.4, 0.1)} amount={0.5}>
          <NumberStack />
        </Reveal>
      </div>
    </div>
  )
}

function Coin({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <span className="flex h-[27px] w-[27px] items-center justify-center rounded-full" style={{ background: bg }}>
      {children}
    </span>
  )
}

function BalanceVisual() {
  const row = 'relative z-[1] flex w-[305px] items-center justify-between overflow-hidden rounded-[10px] bg-white px-4 py-2.5'
  const gray = 'font-glow-display text-[14px] font-semibold leading-[16.8px] text-[rgb(161,161,161)]'
  return (
    <figure className="flex h-[168px] w-full flex-col items-center justify-end gap-2 min-[810px]:max-[1199px]:justify-center">
      <Reveal replay amount={0} from={{ y: 150 }} transition={spring(0.2, 0.4)} className="relative z-[1] flex items-center gap-2 rounded-lg bg-[rgba(0,134,237,0.2)] px-3 py-[7px]">
        <span className="font-glow-display text-[13px] font-semibold leading-[15.6px] text-[var(--glow-blue-dark)]">Solde du compte</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--glow-blue-dark)]" strokeWidth={2.5} aria-hidden />
      </Reveal>
      <Reveal replay amount={0} from={{ y: 50, scale: 0.5 }} transition={spring(0.2, 0.4)} className={cn(row, 'h-[47px]')} style={{ boxShadow: SH_PILL }}>
        <span className="flex items-baseline gap-1">
          <span className="font-glow-display text-[20px] font-semibold leading-[24px] text-black">{digits(12500)}</span>
          <span className={gray}>FCFA</span>
        </span>
        <Coin bg="#13a538">
          <Wallet className="h-3.5 w-3.5 text-white" strokeWidth={2.4} aria-hidden />
        </Coin>
      </Reveal>
      <Reveal replay amount={0} from={{ y: 50, scale: 0.5 }} transition={spring(0.2, 0.4, 0.1)} className={cn(row, 'h-[46px]')} style={{ boxShadow: SH_PILL }}>
        <span className="flex items-baseline gap-2">
          <span className={gray}>Recharge</span>
          <span className="font-glow-display text-[14px] font-semibold leading-[16.8px] text-black">{signedFCFA(5000)}</span>
        </span>
        <Coin bg="#f39200">
          <Smartphone className="h-3.5 w-3.5 text-white" strokeWidth={2.4} aria-hidden />
        </Coin>
      </Reveal>
    </figure>
  )
}

/** Prix WhatsApp réels relevés dans le catalogue (14/11/2026). */
function PriceVisual() {
  const pop = (delay: number) => ({
    initial: { opacity: 0, scale: 0.5 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: false, amount: 0.5 },
    transition: spring(0.2, 0.4, delay),
  })
  return (
    <div className="relative h-[270px] w-[373px] max-w-full min-[810px]:h-[300px]">
      <motion.figure {...pop(0.1)} className="absolute left-[23px] top-[26px] h-40 w-[328px] overflow-hidden rounded-2xl max-[809px]:left-[15px] max-[809px]:top-[-4px]">
        <PlanOption label="Côte d’Ivoire" price={formatFCFA(400)} className="absolute left-0 top-[17px] w-[295px]" />
        <motion.div {...pop(0.25)} className="absolute left-[33px] top-[61px]">
          <PlanOption label="Nigeria" price={formatFCFA(300)} selected className="w-[295px]" />
        </motion.div>
        <motion.div {...pop(0.4)} className="absolute left-0 top-[105px]">
          <PlanOption label="Pays-Bas" price={formatFCFA(900)} className="w-[295px]" />
        </motion.div>
      </motion.figure>
      <div className="absolute z-[1] max-[809px]:hidden" style={{ left: 234 - 202, top: 231.5 - 114.5, transform: 'rotate(-9deg) scale(0.7)' }}>
        <NumberCard tone="gold" />
      </div>
      <div className="absolute z-[1] min-[810px]:hidden" style={{ left: 219.5 - 202, top: 187 - 114.5, transform: 'rotate(-9deg) scale(0.6)' }}>
        <NumberCard tone="gold" />
      </div>
    </div>
  )
}

const block = 'overflow-hidden rounded-3xl bg-[var(--glow-bg)]'

export default function Benefits({ facts }: { facts: LandingFacts }) {
  const stats: { icon: LucideIcon; value: string; label: string }[] = [
    { icon: Globe2, value: String(facts.countries), label: 'Pays disponibles' },
    { icon: Tag, value: formatFCFA(facts.minPrice), label: 'Le numéro, au prix le plus bas' },
    { icon: RefreshCw, value: '10 min', label: 'Entre deux mises à jour des prix' },
  ]
  return (
    <section className="flex flex-col items-center overflow-hidden px-4 pb-12 pt-[90px] min-[810px]:overflow-visible min-[810px]:px-8 min-[810px]:pt-12">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="relative z-[1] flex w-full flex-col items-start gap-3.5 min-[1200px]:flex-row min-[1200px]:items-center">
          <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:max-w-[400px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:max-w-none min-[1200px]:flex-1 min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Simple, rapide
            <br />
            et <span className="text-[var(--glow-blue)]">sans abonnement</span>
          </h2>
          <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[490px] min-[1200px]:w-[490px] min-[1200px]:shrink-0">
            Un compte gratuit, un solde en FCFA et des numéros du monde entier. Vous ne payez que les numéros que vous achetez, au prix affiché.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 min-[810px]:grid-cols-2 min-[1200px]:grid-cols-3">
          <div className={cn(block, 'flex flex-col gap-[15px] overflow-visible min-[810px]:col-span-2 min-[810px]:h-[300px] min-[810px]:flex-row')}>
            <div className="z-[1] flex flex-col justify-between gap-2 p-6 min-[810px]:flex-1">
              <BlockText icon={Smartphone} pill="Numéros" title="Un numéro privé par vérification" text="Chaque achat vous attribue un numéro que personne d’autre ne peut utiliser en même temps que vous." />
              <ArrowLink href="#fonctionnement" color="#000">
                Voir le fonctionnement
              </ArrowLink>
            </div>
            <StackVisual />
          </div>

          <div className={cn(block, 'flex flex-col min-[810px]:h-[300px]')}>
            <div className="z-[1] p-6">
              <BlockText icon={Globe2} pill="International" title={`Des numéros dans ${facts.countries} pays`} text="Europe, Amériques, Asie et Afrique." nowrap />
            </div>
            <div className="relative h-[200px] w-full min-[810px]:h-[168px]">
              <Img src="globe-blue.webp" className="absolute inset-0 h-full w-full object-contain object-bottom" />
            </div>
          </div>

          <div className={cn(block, 'flex flex-col min-[810px]:h-[300px] min-[810px]:max-[1199px]:flex-col-reverse')}>
            <BalanceVisual />
            <div className="z-[1] p-6">
              <BlockText icon={Wallet} pill="Solde" title="Votre solde, toujours à jour" text="Suivez vos recharges et vos achats en FCFA." nowrap />
            </div>
          </div>

          <div className={cn(block, 'flex flex-col gap-[15px] overflow-visible min-[810px]:col-span-2 min-[810px]:h-[300px] min-[810px]:flex-row')}>
            <div className="z-[1] flex flex-col justify-between gap-2 p-6 min-[810px]:flex-1">
              <BlockText icon={Tag} pill="Prix" tone="gold" title="Le prix affiché est le prix payé" text="Comparez les tarifs de chaque pays avant d’acheter. Pas d’abonnement, pas de frais cachés." />
              <ArrowLink href="#tarifs" color="var(--glow-gold)">
                Voir les tarifs
              </ArrowLink>
            </div>
            <PriceVisual />
          </div>

          <div className={cn(block, 'flex flex-col items-center gap-8 p-6 min-[810px]:col-span-2 min-[810px]:gap-6 min-[1200px]:col-span-3 min-[1200px]:gap-8 min-[1200px]:p-8')}>
            <div className="z-[1] flex w-full flex-col gap-3.5 min-[1200px]:flex-row min-[1200px]:items-center">
              <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:flex-1 min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
                <span className="flex max-w-[420px] items-center min-[810px]:min-h-[105px]">
                  <span>
                    Numflash <span className="text-[var(--glow-blue)]">en chiffres</span>
                  </span>
                </span>
              </h2>
              <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[524px] min-[1200px]:w-[524px] min-[1200px]:shrink-0">
                Ces chiffres viennent directement de notre catalogue de numéros, synchronisé en permanence avec notre fournisseur.
              </p>
            </div>
            <div className="flex w-full flex-col gap-5 overflow-hidden min-[810px]:flex-row">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-1 flex-col items-start justify-center gap-2 rounded-[20px] bg-white px-[30px] py-6">
                  <s.icon className="h-9 w-9 text-[rgb(11,139,239)]" strokeWidth={1.5} aria-hidden />
                  <p className="text-[36px] font-semibold leading-[36px] tracking-[-1.08px] text-black">
                    <CharReveal key={s.value} text={s.value} />
                  </p>
                  <p className="text-[15px] font-medium leading-[22.5px] text-black opacity-90">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
