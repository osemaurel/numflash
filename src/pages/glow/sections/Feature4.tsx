import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CardStack, GlowCard } from '../GlowCard'
import { Icon, Img, Reveal, SvgImg, spring } from '../primitives'
import type { GlowIconName } from '../glowIcons'
import { PlanOption, SH_PILL } from './Feature1'

/** Effet « texte par caractère » de Framer : chaque lettre monte de 10 px, décalée de 75 ms. */
export function CharReveal({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0.001, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 1 }}
          transition={spring(0, 0.4, i * 0.075)}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}

export function SmallPill({ icon, children, tone = 'blue' }: { icon: GlowIconName; children: ReactNode; tone?: 'blue' | 'gold' }) {
  return (
    <span className={cn('inline-flex w-max items-center gap-1.5 rounded-full py-[3px] pl-1.5 pr-2 text-[var(--glow-bg)]', tone === 'gold' ? 'bg-[var(--glow-gold)]' : 'bg-[var(--glow-blue)]')}>
      <Icon name={icon} className="h-[18px] w-[18px]" />
      <span className="font-glow-display text-[14px] font-medium leading-[14px]">{children}</span>
    </span>
  )
}

function BlockText({ icon, pill, title, text, tone, nowrap = false }: { icon: GlowIconName; pill: string; title: string; text: string; tone?: 'blue' | 'gold'; nowrap?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2 overflow-hidden">
      <SmallPill icon={icon} tone={tone}>
        {pill}
      </SmallPill>
      <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] text-black">{title}</h3>
      <p className={cn('text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90', nowrap && 'whitespace-nowrap')}>{text}</p>
    </div>
  )
}

function ArrowLink({ children, color }: { children: ReactNode; color: string }) {
  return (
    <a href="#pricing" className="group relative z-[2] inline-flex items-center gap-1.5 self-start" style={{ color }}>
      <span className="text-[15px] font-medium leading-[22.5px]">{children}</span>
      <span className="relative h-[22.5px] w-6 shrink-0 transition-transform duration-200 group-hover:translate-x-1">
        <Icon name="arrowRight" className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2" />
      </span>
    </a>
  )
}

/* ---------- Visuels ---------- */

function StackVisual() {
  return (
    <div className="relative h-[228px] w-[357px] max-w-full min-[810px]:h-[300px]">
      {/* Pile de cartes réduite : 0,6 sur mobile, 0,7 au-delà (valeurs du modèle) */}
      <div className="absolute left-[27px] top-0 origin-top-left scale-[0.6] min-[810px]:left-[-13px] min-[810px]:top-4 min-[810px]:scale-[0.7]">
        <Reveal from={{ scale: 0.5 }} transition={spring(0.2, 0.4, 0.1)} amount={0.5}>
          <CardStack />
        </Reveal>
      </div>
    </div>
  )
}

function BalanceVisual() {
  return (
    <figure className="flex h-[168px] w-full flex-col items-center justify-end gap-2 min-[810px]:max-[1199px]:justify-center">
      <Reveal replay amount={0} from={{ y: 150 }} transition={spring(0.2, 0.4)} className="relative z-[1] flex items-center gap-2 rounded-lg bg-[rgba(0,134,237,0.2)] px-3 py-[7px]">
        <span className="font-glow-display text-[13px] font-semibold leading-[15.6px] text-[var(--glow-blue-dark)]">Account balance</span>
        <Icon name="dropdown" className="h-[5px] w-2 text-[var(--glow-blue-dark)]" />
      </Reveal>
      <Reveal
        replay
        amount={0}
        from={{ y: 50, scale: 0.5 }}
        transition={spring(0.2, 0.4)}
        className="relative z-[1] flex h-[47px] w-[305px] items-center justify-between overflow-hidden rounded-[10px] bg-white px-4 py-2.5"
        style={{ boxShadow: SH_PILL }}
      >
        <span className="flex items-center gap-0.5">
          <span className="font-glow-display w-2.5 text-center text-[14px] font-semibold leading-[16.8px] text-[rgb(161,161,161)]">$</span>
          <span className="font-glow-display text-[20px] font-semibold leading-[24px] text-black">1639,24</span>
        </span>
        <SvgImg name="dollarCoinGreen" className="h-[27px] w-[27px]" />
      </Reveal>
      <Reveal
        replay
        amount={0}
        from={{ y: 50, scale: 0.5 }}
        transition={spring(0.2, 0.4, 0.1)}
        className="relative z-[1] flex h-[46px] w-[305px] items-center justify-between overflow-hidden rounded-[10px] bg-white px-4 py-2.5"
        style={{ boxShadow: SH_PILL }}
      >
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <SvgImg name="btcSymbol" className="h-[11px] w-2.5 object-contain" />
            <span className="font-glow-display text-[20px] font-semibold leading-[24px] text-black">3.2</span>
          </span>
          <span className="font-glow-display w-2.5 text-center text-[14px] font-semibold leading-[16.8px] text-[rgb(161,161,161)]">=</span>
          <span className="flex items-center gap-0.5">
            <span className="font-glow-display w-2.5 text-center text-[14px] font-semibold leading-[16.8px] text-[rgb(161,161,161)]">$</span>
            <span className="font-glow-display text-[14px] font-semibold leading-[16.8px] text-black">117,333.80</span>
          </span>
        </span>
        <SvgImg name="bitcoinCoinSmall" className="h-[26px] w-[26px]" />
      </Reveal>
    </figure>
  )
}

function GoldVisual() {
  const pop = (delay: number) => ({
    initial: { opacity: 0, scale: 0.5 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: false, amount: 0.5 },
    transition: spring(0.2, 0.4, delay),
  })
  return (
    <div className="relative h-[270px] w-[373px] max-w-full min-[810px]:h-[300px]">
      <motion.figure {...pop(0.1)} className="absolute left-[23px] top-[26px] h-40 w-[328px] overflow-hidden rounded-2xl max-[809px]:left-[15px] max-[809px]:top-[-4px]">
        <PlanOption label="4 months" price="$25/m" className="absolute left-0 top-[17px] w-[295px]" />
        <motion.div {...pop(0.25)} className="absolute left-[33px] top-[61px]">
          <PlanOption label="6 months" price="$18/m" selected className="w-[295px]" />
        </motion.div>
        <motion.div {...pop(0.4)} className="absolute left-0 top-[105px]">
          <PlanOption label="9 months" price="$13/m" className="w-[295px]" />
        </motion.div>
      </motion.figure>
      {/* Carte Gold : centre et échelle relevés sur le modèle (mobile / tablette et bureau) */}
      <div className="absolute z-[1] max-[809px]:hidden" style={{ left: 234 - 202, top: 231.5 - 114.5, transform: 'rotate(-9deg) scale(0.7)' }}>
        <GlowCard tone="gold" />
      </div>
      <div className="absolute z-[1] min-[810px]:hidden" style={{ left: 219.5 - 202, top: 187 - 114.5, transform: 'rotate(-9deg) scale(0.6)' }}>
        <GlowCard tone="gold" />
      </div>
    </div>
  )
}

const STATS: { icon: GlowIconName; value: string; label: string }[] = [
  { icon: 'users', value: '200K+', label: 'Happy customers' },
  { icon: 'building', value: '2K+', label: 'Businesses chose us' },
  { icon: 'receipt', value: '35M+', label: 'Payments processed' },
]

const block = 'overflow-hidden rounded-3xl bg-[var(--glow-bg)]'

export default function Feature4() {
  return (
    <section className="flex flex-col items-center overflow-hidden px-4 pb-12 pt-[90px] min-[810px]:overflow-visible min-[810px]:px-8 min-[810px]:pt-12">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="relative z-[1] flex w-full flex-col items-start gap-3.5 min-[1200px]:flex-row min-[1200px]:items-center">
          <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:max-w-[400px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:max-w-none min-[1200px]:flex-1 min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Discover the
            <br />
            <span className="text-[var(--glow-blue)]">unmatched</span> benefits
          </h2>
          <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[490px] min-[1200px]:w-[490px] min-[1200px]:shrink-0">
            Glow offers consumers unparalleled convenience with flexible payment options that fit any budget. Merchants benefit from increased sales and customer loyalty.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 min-[810px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {/* Cartes Glow */}
          <div className={cn(block, 'flex flex-col gap-[15px] overflow-visible min-[810px]:col-span-2 min-[810px]:h-[300px] min-[810px]:flex-row')}>
            <div className="z-[1] flex flex-col justify-between gap-2 p-6 min-[810px]:flex-1">
              <BlockText icon="creditCard" pill="Glow Card" title="Shop more, get more back" text="Three distinct plans that adapt to your lifestyle. From everyday banking to business growth, we scale with your ambitions." />
              <ArrowLink color="#000">Get your card</ArrowLink>
            </div>
            <StackVisual />
          </div>

          {/* Paiements internationaux */}
          <div className={cn(block, 'flex flex-col min-[810px]:h-[300px]')}>
            <div className="z-[1] p-6">
              <BlockText icon="globe" pill="Global Payments" title="Send money anywhere, anytime" text="Easily make secure payments across borders." nowrap />
            </div>
            <div className="relative h-[200px] w-full min-[810px]:h-[168px]">
              <Img src="globe-blue.webp" className="absolute inset-0 h-full w-full object-contain object-bottom" />
            </div>
          </div>

          {/* Solde */}
          <div className={cn(block, 'flex flex-col min-[810px]:h-[300px] min-[810px]:max-[1199px]:flex-col-reverse')}>
            <BalanceVisual />
            <div className="z-[1] p-6">
              <BlockText icon="dollarCircle" pill="Balance" title="See where you stand financially" text="Stay in control of your money, wherever you go." nowrap />
            </div>
          </div>

          {/* Carte Gold */}
          <div className={cn(block, 'flex flex-col gap-[15px] overflow-visible min-[810px]:col-span-2 min-[810px]:h-[300px] min-[810px]:flex-row')}>
            <div className="z-[1] flex flex-col justify-between gap-2 p-6 min-[810px]:flex-1">
              <BlockText
                icon="creditCard"
                pill="Glow Gold"
                tone="gold"
                title="Explore the Glow Gold Card"
                text="Generate unlimited virtual cards for secure online shopping, subscription management, and budget control. Plus, receive beautifully crafted physical cards."
              />
              <ArrowLink color="var(--glow-gold)">Subscribe</ArrowLink>
            </div>
            <GoldVisual />
          </div>

          {/* Chiffres */}
          <div className={cn(block, 'flex flex-col items-center gap-8 p-6 min-[810px]:col-span-2 min-[810px]:gap-6 min-[1200px]:col-span-3 min-[1200px]:gap-8 min-[1200px]:p-8')}>
            <div className="z-[1] flex w-full flex-col gap-3.5 min-[1200px]:flex-row min-[1200px]:items-center">
              <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:flex-1 min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
                <span className="flex max-w-[420px] items-center min-[810px]:min-h-[105px]">
                  <span>
                    Our <span className="text-[var(--glow-blue)]">impact</span> by the numbers
                  </span>
                </span>
              </h2>
              <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[524px] min-[1200px]:w-[524px] min-[1200px]:shrink-0">
                Discover the trust and success behind our platform. From delighted customers to thriving businesses, see how we’re powering seamless payments and driving growth, one transaction at a time.
              </p>
            </div>
            <div className="flex w-full flex-col gap-5 overflow-hidden min-[810px]:flex-row">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-1 flex-col items-start justify-center gap-2 rounded-[20px] bg-white px-[30px] py-6">
                  <Icon name={s.icon} className="h-9 w-9 text-[rgb(11,139,239)]" />
                  <p className="text-[36px] font-semibold leading-[36px] tracking-[-1.08px] text-black">
                    <CharReveal text={s.value} />
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
