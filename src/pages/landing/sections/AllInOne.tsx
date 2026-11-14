import { motion } from 'framer-motion'
import { EyeOff, Globe2, ListChecks, MessageSquareText, Receipt, RotateCcw, type LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { PhoneFrame } from '../../glow/Phone'
import { Icon, Img } from '../../glow/primitives'
import { AppScreen } from '../AppScreen'
import type { LandingFacts } from '../facts'
import { Pill, ServiceTile } from '../ui'

const SH_SOFT =
  'rgba(0, 0, 0, 0.18) 0.301094px 0.602187px 0.673266px -1.25px, rgba(0, 0, 0, 0.16) 1.14427px 2.28853px 2.55866px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.1803px -3.75px'
const SH_APP = '0px 1px 4px 0px rgba(12, 12, 13, 0.05), 0px 1px 4px 0px rgba(12, 12, 13, 0.1)'
const GREEN = 'rgb(24, 128, 52)'

/* ---------- Visuels ---------- */

function SmsVisual() {
  const msgs = [
    { service: 'WhatsApp', text: 'Votre code WhatsApp : 482-913', when: '14:02' },
    { service: 'Telegram', text: 'Code Telegram : 58204', when: '14:07' },
  ]
  return (
    <figure className="flex h-[144px] w-full items-center justify-center overflow-hidden px-5 pb-2 pt-5">
      <div className="flex w-[315px] max-w-full flex-col gap-2.5">
        {msgs.map((m, i) => (
          <motion.div
            key={m.service}
            className={cn('flex items-center gap-2.5 rounded-2xl bg-white py-2 pl-2 pr-3', i === 1 && 'ml-6')}
            style={{ boxShadow: SH_APP }}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4, delay: 0.15 * i }}
          >
            <ServiceTile name={m.service} size={30} radius={999} />
            <span className="flex-1 text-[13px] font-medium leading-[17px] text-black">{m.text}</span>
            <span className="text-[11px] font-medium text-black/40">{m.when}</span>
          </motion.div>
        ))}
      </div>
    </figure>
  )
}

function OrdersVisual() {
  const rows = [
    { service: 'WhatsApp', number: '+44 7700 900123', status: 'En attente', color: 'rgb(217, 137, 16)' },
    { service: 'Telegram', number: '+1 202 555 0147', status: 'Code reçu', color: 'rgb(55, 158, 45)' },
  ]
  return (
    <figure className="flex h-[152px] w-full items-center justify-center px-5 pb-2 pt-5">
      <div className="flex w-full flex-col gap-4 rounded-[20px] bg-white px-5 py-4" style={{ boxShadow: SH_APP }}>
        {rows.map((r) => (
          <div key={r.service} className="flex gap-3">
            <ServiceTile name={r.service} radius={999} />
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{r.service}</span>
              <span className="text-[14px] leading-[16.8px] tracking-[-0.28px] text-black/50">{r.number}</span>
            </div>
            <span className="self-center text-[13px] font-semibold leading-[15.6px]" style={{ color: r.color }}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}

const DIALS: { code: string; bg: string; left: number; top: number; rotate: number }[] = [
  { code: '+44', bg: '#0a3cad', left: 45, top: 16, rotate: -5 },
  { code: '+234', bg: '#d61c1c', left: 117, top: 70, rotate: 0 },
  { code: '+33', bg: '#13a39b', left: 188, top: 14, rotate: 0 },
  { code: '+1', bg: '#3c9d1b', left: 260, top: 70, rotate: 5 },
]

function DialVisual() {
  return (
    <figure className="relative h-[168px] w-full">
      <div className="absolute inset-0 mx-auto w-[366px]">
        <div
          className="absolute overflow-hidden opacity-[0.12]"
          style={{
            left: -9,
            top: -8,
            width: 384,
            height: 208,
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 100%)',
            maskImage: 'linear-gradient(180deg, transparent 0%, #000 100%)',
            backgroundImage: 'url(/glow/img/pattern-dots.svg)',
            backgroundSize: '28px auto',
            backgroundPosition: 'center',
          }}
        />
        <Img src="globe-white.webp" className="absolute left-0 top-0 h-[170px] w-[366px] object-cover" />
        {DIALS.map((d) => (
          <motion.div
            key={d.code}
            className="absolute flex h-20 w-20 cursor-pointer items-center justify-center rounded-[78px] bg-white"
            style={{ left: d.left, top: d.top, boxShadow: SH_SOFT }}
            whileHover={{ scale: 1.1, rotate: d.rotate, transition: { type: 'spring', bounce: 0.25, duration: 0.45 } }}
          >
            <span className="font-glow-display flex h-[45px] w-[45px] items-center justify-center rounded-full text-[15px] font-bold tracking-[-0.3px] text-white" style={{ background: d.bg }}>
              {d.code}
            </span>
          </motion.div>
        ))}
      </div>
    </figure>
  )
}

function CenteredText({ icon, pill, title, text, titleWidth = 270 }: { icon: LucideIcon; pill: string; title: string; text: string; titleWidth?: number }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 overflow-clip p-5 text-center">
      <Pill icon={icon}>{pill}</Pill>
      <h3 className="font-glow-display text-balance text-[18px] font-medium leading-[21.6px] text-black" style={{ maxWidth: titleWidth }}>
        {title}
      </h3>
      <p className="max-w-[326px] text-balance text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90">{text}</p>
    </div>
  )
}

function FeePill({ icon: I, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex h-[31px] items-center justify-center gap-2 rounded-lg bg-white py-1 pl-2.5 pr-1.5">
      <I className="h-4 w-4 text-black/20" strokeWidth={2} aria-hidden />
      <span className="font-glow-geist text-[14px] font-medium leading-[16.8px] text-black">{label}</span>
      <span className="flex items-center rounded px-[5px]" style={{ background: 'rgb(160, 250, 184)' }}>
        <span className="font-glow-geist text-[11px] font-semibold leading-[13.2px]" style={{ color: GREEN }}>
          {formatFCFA(0)}
        </span>
      </span>
    </div>
  )
}

const card = 'flex w-full flex-col items-center overflow-hidden rounded-[32px] bg-[var(--glow-bg)]'

export default function AllInOne({ facts }: { facts: LandingFacts }) {
  return (
    <section className="relative z-[1] flex flex-col items-center overflow-hidden px-4 py-12 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="flex w-full flex-col items-center gap-3 text-center">
          <h3 className="font-glow-geist text-[16px] font-medium leading-[16px] tracking-[-0.48px] text-[var(--glow-blue)]">Fonctionnalités</h3>
          <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Numéros et codes, <span className="text-[var(--glow-blue)]">au même endroit</span>
          </h2>
          <p className="max-w-[569px] text-balance text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)]">
            Du choix du numéro à la réception du code, tout se passe dans votre espace Numflash, sur téléphone comme sur ordinateur.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 bg-white min-[810px]:grid-cols-2 min-[1200px]:grid-cols-3">
          <div className="flex flex-col justify-center gap-6">
            <div className={cn(card, 'justify-center')}>
              <SmsVisual />
              <CenteredText icon={MessageSquareText} pill="SMS" title="Vos codes, en direct" text="Le message de vérification apparaît automatiquement, sans actualiser la page." />
            </div>
            <div className={cn(card, 'justify-center')}>
              <OrdersVisual />
              <CenteredText icon={ListChecks} pill="Commandes" title="Tous vos numéros au même endroit" text="Suivez chaque commande : en attente, code reçu ou remboursée." titleWidth={251} />
            </div>
          </div>

          <div className="relative flex h-[673px] items-start justify-center min-[810px]:max-[1199px]:hidden">
            <div className="absolute top-[-7px] w-[328px]">
              <PhoneFrame>
                <AppScreen tab="Accueil" total={{ label: 'Solde disponible', amount: 12500 }} sections={['wallet', 'numbers', 'codes']} />
              </PhoneFrame>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-6">
            <div className={cn(card, 'justify-center')}>
              <CenteredText icon={Globe2} pill="International" title="Des indicatifs du monde entier" text={`Royaume-Uni, Nigeria, France, États-Unis… ${facts.countries} pays au total.`} />
              <DialVisual />
            </div>
            <div className={cn(card, 'justify-center gap-3 p-5')}>
              <Pill icon={RotateCcw}>Remboursement</Pill>
              <h3 className="font-glow-display text-center text-[18px] font-medium leading-[21.6px] text-black">Pas de code, pas de frais</h3>
              <p className="w-full text-balance text-center text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90">
                Si le SMS n’arrive pas, votre solde est recrédité.
              </p>
              <div className="flex w-full items-center justify-center gap-5 overflow-hidden px-5 pb-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white"
                  style={{ boxShadow: 'rgba(0, 0, 0, 0.18) 0.3px 0.6px 0.67px -1.25px, rgba(0, 0, 0, 0.16) 1.14px 2.29px 2.56px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.18px -3.75px' }}
                >
                  <Icon name="checkBig" className="h-10 w-10 text-[#3da10b]" />
                </div>
                <div className="flex flex-col items-start gap-2.5">
                  <FeePill icon={Receipt} label="Abonnement" />
                  <FeePill icon={EyeOff} label="Frais cachés" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

