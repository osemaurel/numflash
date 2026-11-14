import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Img, MaskIcon, Reveal, spring } from '../primitives'

const SH_SOFT =
  'rgba(0, 0, 0, 0.18) 0.301094px 0.602187px 0.673266px -1.25px, rgba(0, 0, 0, 0.16) 1.14427px 2.28853px 2.55866px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.1803px -3.75px'
export const SH_PILL =
  'rgba(0, 0, 0, 0.21) 0.120437px 0.602187px 1.1054px -1.5px, rgba(0, 0, 0, 0.18) 0.457707px 2.28853px 4.20094px -3px, rgba(0, 0, 0, 0.02) 2px 10px 18.3565px -4.5px'

/* ---------- Visuel 1 : échéancier ---------- */
function DueRow({ label, delay }: { label: string; delay: number }) {
  return (
    <Reveal
      replay
      from={{ x: 30 }}
      transition={spring(0, 0.5, delay)}
      className="flex h-[33px] w-[266px] items-center justify-between rounded-[10px] px-3 py-1.5 text-[14px] leading-[21px] tracking-[-0.28px] text-[rgb(88,89,89)]"
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold">$25</span>
    </Reveal>
  )
}

function Dot({ active = false }: { active?: boolean }) {
  return active ? (
    <span className="h-2 w-2 rounded-[5px] bg-[rgb(0,157,255)]" />
  ) : (
    <span className="h-2 w-2 rounded-md border-2 border-[rgb(219,219,219)] bg-white" />
  )
}

export function DueVisual() {
  return (
    <Reveal
      replay
      as="figure"
      from={{ scale: 0.5 }}
      transition={spring(0.2, 0.4)}
      className="relative flex h-[160px] w-[310px] flex-col items-start justify-center overflow-hidden rounded-2xl bg-white pl-7"
      style={{ boxShadow: SH_SOFT }}
    >
      <div className="flex h-10 w-[266px] items-center justify-between gap-2 rounded-lg border-2 border-dashed border-[rgb(232,232,232)] bg-[rgb(247,247,247)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold leading-[21px] tracking-[-0.28px] text-[rgb(48,48,48)]">Due today</span>
          <span className="flex items-center rounded-lg bg-white px-1.5 py-[3px] ring-1 ring-inset ring-[rgb(232,232,232)] text-[12px] font-semibold leading-[18px] tracking-[-0.24px] text-[rgb(99,99,99)]">
            Pending
          </span>
        </div>
        <span className="text-[14px] font-semibold leading-[21px] tracking-[-0.28px] text-[rgb(26,14,18)]">$25</span>
      </div>
      <DueRow label="In 1 month" delay={0.1} />
      <DueRow label="In 2 months" delay={0.2} />
      <DueRow label="In 3 months" delay={0.3} />
      <div className="absolute left-2.5 top-[25px] z-[1] flex h-28 w-3 flex-col items-center justify-between">
        <Dot active />
        <span className="h-5 w-1 rounded-md bg-[rgb(0,157,255)]" />
        <Dot />
        <span className="h-5 w-1 rounded-md bg-[rgb(219,219,219)]" />
        <Dot />
        <span className="h-5 w-1 rounded-md bg-[rgb(219,219,219)]" />
        <Dot />
      </div>
    </Reveal>
  )
}

/* ---------- Visuel 2 : choix de mensualités ---------- */
export function PlanOption({ label, price, selected = false, className, style }: { label: string; price: string; selected?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'flex h-[37px] w-[284px] items-center justify-between overflow-hidden rounded-[10px] border py-2 pl-2 pr-3',
        selected ? 'border-[rgb(0,157,255)] bg-[rgb(222,242,255)]' : 'border-[rgb(232,232,232)] bg-white',
        className,
      )}
      style={{ boxShadow: SH_PILL, ...style }}
    >
      <div className="flex items-center gap-2">
        {selected ? (
          <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(51,136,255)]">
            <MaskIcon name="checkTiny" className="h-4 w-4 bg-white" />
          </span>
        ) : (
          <span className="h-5 w-5 rounded-full border border-[rgb(214,214,214)] bg-white" />
        )}
        <span className={cn('text-[14px] leading-[21px] tracking-[-0.28px]', selected ? 'font-semibold text-[rgb(26,14,18)]' : 'font-medium text-[rgb(88,89,89)]')}>{label}</span>
      </div>
      <span className={cn('text-[14px] font-semibold leading-[21px] tracking-[-0.28px]', selected ? 'text-[rgb(26,14,18)]' : 'text-[rgb(88,89,89)]')}>{price}</span>
    </div>
  )
}

export function OptionsVisual({ once = false }: { once?: boolean }) {
  const pop = (delay: number) => ({
    initial: { opacity: 0, scale: 0.5 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once, amount: 0.5 },
    transition: spring(0.2, 0.4, delay),
  })
  return (
    <motion.figure {...pop(0.1)} className="relative h-[160px] w-[315px] overflow-hidden rounded-2xl">
      <PlanOption label="4 months" price="$25/m" className="absolute left-0 top-[17px]" />
      <motion.div {...pop(0.25)} className="absolute left-8 top-[61px]">
        <PlanOption label="6 months" price="$18/m" selected />
      </motion.div>
      <motion.div {...pop(0.4)} className="absolute left-0 top-[105px]">
        <PlanOption label="9 months" price="$13/m" />
      </motion.div>
    </motion.figure>
  )
}

/* ---------- Visuel 3 : paiements sécurisés ---------- */
function SecureVisual() {
  const pop = (delay: number) => ({
    initial: { opacity: 0, scale: 0.5 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: false, amount: 0 },
    transition: spring(0.2, 0.4, delay),
  })
  const bubble = 'absolute rounded-full'
  return (
    <figure className="relative h-[160px] w-[315px] shrink-0">
      <div
        className="absolute opacity-15"
        style={{
          left: -21,
          top: -11,
          width: 357,
          height: 181,
          WebkitMaskImage: 'radial-gradient(50% 50% at 50% 50%, transparent 22.973%, #000 63.5135%, transparent 100%)',
          maskImage: 'radial-gradient(50% 50% at 50% 50%, transparent 22.973%, #000 63.5135%, transparent 100%)',
          backgroundImage: 'url(/glow/img/pattern-dots.svg)',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          backgroundSize: '54.5px auto',
        }}
      />
      <motion.div {...pop(0.1)} className={cn(bubble, 'flex h-[87px] w-[88px] items-center justify-center border border-[rgb(232,232,232)] bg-white')} style={{ left: 113, top: 34, boxShadow: SH_PILL }}>
        <Img src="face-id.webp" className="h-[52px] w-[53px] object-cover" />
      </motion.div>
      {[
        { left: 34, icon: 'dollarMask', delay: 0 },
        { left: 233, icon: 'shieldMask', delay: 0.2 },
      ].map((b) => (
        <motion.div
          key={b.icon}
          {...pop(b.delay)}
          className={cn(bubble, 'flex h-[49px] w-[49px] items-center justify-center border-2 border-white/20')}
          style={{ left: b.left, top: 54, background: 'linear-gradient(180deg, #0a77c9 0%, #0085ee 100%)', boxShadow: SH_PILL }}
        >
          <MaskIcon name={b.icon} className="h-[26px] w-[26px] bg-white" />
        </motion.div>
      ))}
    </figure>
  )
}

function Details({ title, text, className }: { title: string; text: string; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col justify-center gap-2 overflow-hidden', className)}>
      <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] text-black">{title}</h3>
      <p className="text-[16px] leading-[24px] tracking-[-0.32px] text-[var(--glow-text)] opacity-90 min-[810px]:max-[1199px]:text-balance">{text}</p>
    </div>
  )
}

const card = 'flex flex-col items-start gap-6 rounded-2xl bg-[var(--glow-bg)] p-6'

export default function Feature1() {
  return (
    <section className="flex flex-col items-center px-4 pb-12 pt-24 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 overflow-hidden min-[810px]:gap-16">
        <div className="flex w-full flex-col items-start gap-4 min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:gap-16">
          <h2 className="font-glow-display w-full text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:flex-1 min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Tired of high bank fees?
            <br />
            <span className="text-[var(--glow-blue)]">We’re not a bank.</span>
          </h2>
          <p className="w-full text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[600px] min-[810px]:max-[1199px]:text-balance min-[1200px]:max-w-none min-[1200px]:flex-1">
            Glow's flexible payment plans that let you buy now and pay later in manageable installments, while our secure checkout technology protects your information every step of the way.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-6 min-[810px]:grid-cols-2 min-[1200px]:grid-cols-3">
          <div className={card}>
            <DueVisual />
            <Details title="Buy now, pay later" text="Enjoy instant access to the products you want, with the flexibility to pay later." />
          </div>
          <div className={card}>
            <OptionsVisual />
            <Details title="Flexible installment plans" text="Break up your purchase into smaller, manageable payments over time." />
          </div>
          <div className={cn(card, 'items-center overflow-hidden min-[810px]:col-span-2 min-[810px]:w-[519px] min-[810px]:flex-row min-[810px]:justify-self-center min-[1200px]:col-span-1 min-[1200px]:w-auto min-[1200px]:flex-col')}>
            <SecureVisual />
            <Details title="Secure online payments" text="Your financial information is safeguarded by advanced, secure technology." />
          </div>
        </div>
      </div>
    </section>
  )
}
