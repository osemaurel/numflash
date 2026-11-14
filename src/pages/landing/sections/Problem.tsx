import { motion } from 'framer-motion'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { Img, Reveal, spring } from '../../glow/primitives'
import { PlanOption, SH_PILL } from '../../glow/sections/Feature1'
import type { LandingFacts } from '../facts'
import { signedFCFA } from '../ui'

const SH_SOFT =
  'rgba(0, 0, 0, 0.18) 0.301094px 0.602187px 0.673266px -1.25px, rgba(0, 0, 0, 0.16) 1.14427px 2.28853px 2.55866px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.1803px -3.75px'

/* ---------- Visuel 1 : mouvements du solde ---------- */
function LedgerRow({ label, amount, delay }: { label: string; amount: number; delay: number }) {
  return (
    <Reveal
      replay
      from={{ x: 30 }}
      transition={spring(0, 0.5, delay)}
      className="flex h-[33px] w-[266px] items-center justify-between rounded-[10px] px-3 py-1.5 text-[14px] leading-[21px] tracking-[-0.28px] text-[rgb(88,89,89)]"
    >
      <span className="font-medium">{label}</span>
      <span className="font-semibold">{signedFCFA(amount)}</span>
    </Reveal>
  )
}

function Dot({ active = false }: { active?: boolean }) {
  return active ? <span className="h-2 w-2 rounded-[5px] bg-[rgb(0,157,255)]" /> : <span className="h-2 w-2 rounded-md border-2 border-[rgb(219,219,219)] bg-white" />
}

function LedgerVisual() {
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
          <span className="text-[14px] font-semibold leading-[21px] tracking-[-0.28px] text-[rgb(48,48,48)]">Recharge</span>
          <span className="flex items-center rounded-lg bg-white px-1.5 py-[3px] text-[12px] font-semibold leading-[18px] tracking-[-0.24px] text-[rgb(24,128,52)] ring-1 ring-inset ring-[rgb(232,232,232)]">
            Confirmée
          </span>
        </div>
        <span className="text-[14px] font-semibold leading-[21px] tracking-[-0.28px] text-[rgb(26,14,18)]">{signedFCFA(5000)}</span>
      </div>
      <LedgerRow label="WhatsApp" amount={-600} delay={0.1} />
      <LedgerRow label="Telegram" amount={-700} delay={0.2} />
      <LedgerRow label="Google" amount={-200} delay={0.3} />
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

/* ---------- Visuel 2 : choix du pays (prix WhatsApp réels) ---------- */
function CountryVisual() {
  const pop = (delay: number) => ({
    initial: { opacity: 0, scale: 0.5 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: false, amount: 0.5 },
    transition: spring(0.2, 0.4, delay),
  })
  return (
    <motion.figure {...pop(0.1)} className="relative h-[160px] w-[315px] overflow-hidden rounded-2xl">
      <PlanOption label="Royaume-Uni" price={formatFCFA(600)} className="absolute left-0 top-[17px]" />
      <motion.div {...pop(0.25)} className="absolute left-8 top-[61px]">
        <PlanOption label="Sénégal" price={formatFCFA(400)} selected />
      </motion.div>
      <motion.div {...pop(0.4)} className="absolute left-0 top-[105px]">
        <PlanOption label="États-Unis" price={formatFCFA(700)} />
      </motion.div>
    </motion.figure>
  )
}

/* ---------- Visuel 3 : recharges vérifiées ---------- */
function VerifiedVisual() {
  const pop = (delay: number) => ({
    initial: { opacity: 0, scale: 0.5 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: false, amount: 0 },
    transition: spring(0.2, 0.4, delay),
  })
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
          backgroundPosition: 'center',
          backgroundSize: '54.5px auto',
        }}
      />
      <motion.div {...pop(0.1)} className="absolute flex h-[87px] w-[88px] items-center justify-center rounded-full border border-[rgb(232,232,232)] bg-white" style={{ left: 113, top: 34, boxShadow: SH_PILL }}>
        <Img src="face-id.webp" className="h-[52px] w-[53px] object-cover" />
      </motion.div>
      {[
        { left: 34, I: Smartphone, delay: 0 },
        { left: 233, I: ShieldCheck, delay: 0.2 },
      ].map(({ left, I, delay }) => (
        <motion.div
          key={left}
          {...pop(delay)}
          className="absolute flex h-[49px] w-[49px] items-center justify-center rounded-full border-2 border-white/20"
          style={{ left, top: 54, background: 'linear-gradient(180deg, #0a77c9 0%, #0085ee 100%)', boxShadow: SH_PILL }}
        >
          <I className="h-6 w-6 text-white" strokeWidth={2.2} aria-hidden />
        </motion.div>
      ))}
    </figure>
  )
}

function Details({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex w-full flex-col justify-center gap-2 overflow-hidden">
      <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] text-black">{title}</h3>
      <p className="text-[16px] leading-[24px] tracking-[-0.32px] text-[var(--glow-text)] opacity-90 min-[810px]:max-[1199px]:text-balance">{text}</p>
    </div>
  )
}

const card = 'flex flex-col items-start gap-6 rounded-2xl bg-[var(--glow-bg)] p-6'

export default function Problem({ facts }: { facts: LandingFacts }) {
  return (
    <section className="flex flex-col items-center px-4 pb-12 pt-24 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 overflow-hidden min-[810px]:gap-16">
        <div className="flex w-full flex-col items-start gap-4 min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:gap-16">
          <h2 className="font-glow-display w-full text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:flex-1 min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Pas de carte bancaire ?
            <br />
            <span className="text-[var(--glow-blue)]">Aucun problème.</span>
          </h2>
          <p className="w-full text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[600px] min-[810px]:max-[1199px]:text-balance min-[1200px]:max-w-none min-[1200px]:flex-1">
            Numflash se recharge en FCFA depuis votre téléphone. Vous choisissez ensuite le service et le pays, puis vous payez le numéro au prix affiché. Si le code n’arrive pas, vous êtes remboursé.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-6 min-[810px]:grid-cols-2 min-[1200px]:grid-cols-3">
          <div className={card}>
            <LedgerVisual />
            <Details title="Un solde en FCFA" text={`Rechargez dès ${formatFCFA(facts.topupTiers[0])}, puis payez vos numéros directement depuis votre solde.`} />
          </div>
          <div className={card}>
            <CountryVisual />
            <Details title="Le pays de votre choix" text="Comparez les prix par pays et choisissez le numéro qui vous convient." />
          </div>
          <div className={cn(card, 'items-center overflow-hidden min-[810px]:col-span-2 min-[810px]:w-[519px] min-[810px]:flex-row min-[810px]:justify-self-center min-[1200px]:col-span-1 min-[1200px]:w-auto min-[1200px]:flex-col')}>
            <VerifiedVisual />
            <Details title="Recharges vérifiées" text="Chaque paiement est confirmé par l’opérateur avant d’être crédité sur votre solde." />
          </div>
        </div>
      </div>
    </section>
  )
}
