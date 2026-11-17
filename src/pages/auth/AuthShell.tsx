import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareText, Smartphone, UserPlus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import '../glow/glow.css'
import { PhoneFrame } from '../glow/Phone'
import { Appear, Img } from '../glow/primitives'
import { AppScreen } from '../landing/AppScreen'
import { NumberCard, type CardTone } from '../landing/NumberCard'
import { SupportLink } from '@/components/Support'
import { Pill, ServiceTile, Wordmark, signedFCFA } from '../landing/ui'

/*
 * Habillage commun des pages d'authentification, dans le design de la landing :
 * formulaire à gauche, panneau bleu illustré à droite (grand écran), bandeau compact sur mobile.
 */

const PANEL_BG = 'linear-gradient(160deg, #0085ee 0%, rgb(114, 189, 247) 100%)'
const PANEL_SHADOW =
  'rgba(52, 217, 217, 0.01) 0px 0.602187px 3.01094px 0px inset, rgba(52, 217, 217, 0.03) 0px 2.28853px 11.4427px 0px inset, rgba(52, 217, 217, 0.14) 0px 10px 50px 0px inset'

function Clouds() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[640px] opacity-[0.39] [filter:brightness(1.6)_grayscale(1)_blur(10px)]"
      style={{ WebkitMaskImage: 'linear-gradient(180deg, transparent 40%, #000 100%)', maskImage: 'linear-gradient(180deg, transparent 40%, #000 100%)' }}
    >
      <Img src="clouds.webp" className="h-full w-full object-cover object-bottom" />
    </div>
  )
}

/** Cartes flottantes posées sur le téléphone (données d'illustration). */
function Toast({ icon, label, value, mono = false, status }: { icon: ReactNode; label: string; value: string; mono?: boolean; status: string }) {
  return (
    <div className="flex w-[292px] items-center gap-3 rounded-2xl bg-white/95 p-3 pr-4 backdrop-blur" style={{ boxShadow: '0 18px 40px -12px rgba(16, 35, 41, 0.35)' }}>
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium leading-[15.6px] text-[var(--glow-gray)]">{label}</span>
        <span className={cn('text-[20px] font-bold leading-[24px] text-black', mono ? 'font-glow-mono tracking-[1px]' : 'font-glow-display tracking-[-0.4px]')}>{value}</span>
      </div>
      <span className="self-start text-[12px] font-medium leading-[15px] text-[rgb(55,158,45)]">{status}</span>
    </div>
  )
}

export type AuthVariant = 'login' | 'signup'

interface VariantDef {
  pill: { icon: LucideIcon; label: string; short: string }
  title: string
  text: string
  screen: ReactNode
  toast: ReactNode
  card: CardTone
}

const VARIANTS: Record<AuthVariant, VariantDef> = {
  login: {
    pill: { icon: MessageSquareText, label: 'Codes reçus en direct', short: 'En direct' },
    title: 'Vos codes SMS, payés en FCFA.',
    text: 'Rechargez en Mobile Money, choisissez votre numéro et recevez votre code en direct, sur téléphone comme sur ordinateur.',
    screen: <AppScreen tab="SMS" sections={['codes', 'numbers']} />,
    toast: <Toast icon={<ServiceTile name="WhatsApp" size={40} radius={11} />} label="Code WhatsApp reçu" value="482-913" mono status="à l’instant" />,
    card: 'gold',
  },
  signup: {
    pill: { icon: UserPlus, label: 'Inscription gratuite', short: 'Gratuit' },
    title: 'Votre premier code en quelques minutes.',
    text: 'Créez votre compte, rechargez en Orange Money, MTN, Moov, Wave ou par carte, puis choisissez votre numéro.',
    screen: <AppScreen tab="Accueil" total={{ label: 'Solde disponible', amount: 14500 }} sections={['wallet', 'numbers']} />,
    toast: (
      <Toast
        icon={
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f39200]">
            <Smartphone className="h-5 w-5 text-white" strokeWidth={2.2} aria-hidden />
          </span>
        }
        label="Mobile Money"
        value={signedFCFA(20000)}
        status="Confirmée"
      />
    ),
    card: 'black',
  },
}

/** Panneau illustré des grands écrans. */
function AuthVisual({ v }: { v: VariantDef }) {
  return (
    <aside
      aria-hidden
      className="relative hidden w-[46%] max-w-[660px] shrink-0 overflow-hidden rounded-[40px] min-[1024px]:block"
      style={{ backgroundImage: PANEL_BG, boxShadow: PANEL_SHADOW }}
    >
      <Clouds />
      <div className="relative z-[2] flex flex-col items-start gap-4 p-12 min-[1200px]:p-14">
        <Appear y={20} delay={0.1}>
          <Pill icon={v.pill.icon} tone="white">
            {v.pill.label}
          </Pill>
        </Appear>
        <Appear y={30} delay={0.15}>
          <h2 className="font-glow-display max-w-[440px] text-balance text-[38px] font-medium leading-[41.8px] tracking-[-1.52px] text-white min-[1200px]:text-[44px] min-[1200px]:leading-[48.4px] min-[1200px]:tracking-[-1.76px]">
            {v.title}
          </h2>
        </Appear>
        <Appear y={30} delay={0.2}>
          <p className="max-w-[400px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-white/85">{v.text}</p>
        </Appear>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 top-[330px] z-[1]"
        style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)' }}
      >
        {/* Le décalage est porté par un conteneur fixe : framer-motion réécrit le transform de Appear. */}
        <div className="absolute left-1/2 top-0 w-[340px] -translate-x-[38%] min-[1200px]:w-[380px]">
          <Appear y={120} delay={0.25} duration={0.7}>
            <PhoneFrame>{v.screen}</PhoneFrame>
          </Appear>
        </div>
      </div>

      <Appear y={40} delay={0.45} duration={0.6} className="absolute bottom-[-64px] left-[-34px] z-[2] [@media(max-height:820px)]:hidden">
        <div style={{ transform: 'rotate(-11deg) scale(0.62)', transformOrigin: 'left bottom' }}>
          <NumberCard tone={v.card} />
        </div>
      </Appear>
      <Appear y={24} delay={0.7} duration={0.5} className="absolute left-[30px] top-[588px] z-[3] min-[1200px]:left-[44px]">
        {v.toast}
      </Appear>
    </aside>
  )
}

/** Bandeau compact des petits écrans : la même ambiance, sans retarder l'accès au formulaire. */
function MobileBand({ v }: { v: VariantDef }) {
  return (
    <div aria-hidden className="relative mb-7 h-[140px] w-full overflow-hidden rounded-[28px] min-[1024px]:hidden" style={{ backgroundImage: PANEL_BG, boxShadow: PANEL_SHADOW }}>
      <Clouds />
      <div className="absolute left-5 top-5 z-[2] flex max-w-[170px] flex-col gap-2">
        <Pill icon={v.pill.icon} tone="white" className="origin-left scale-90">
          {v.pill.short}
        </Pill>
        <p className="font-glow-display text-[20px] font-medium leading-[22px] tracking-[-0.6px] text-white">{v.title}</p>
      </div>
      <div className="absolute left-[calc(100%-176px)] top-[2px] z-[1]" style={{ transform: 'rotate(-14deg) scale(0.48)', transformOrigin: 'left top' }}>
        <NumberCard tone={v.card === 'black' ? 'gold' : 'black'} />
      </div>
      <div className="absolute left-[calc(100%-206px)] top-[34px] z-[1]" style={{ transform: 'rotate(-6deg) scale(0.5)', transformOrigin: 'left top' }}>
        <NumberCard tone="blue" />
      </div>
    </div>
  )
}

export function AuthShell({
  children,
  switchTo,
  variant = 'login',
}: {
  children: ReactNode
  switchTo: { prompt: string; label: string; to: string }
  variant?: AuthVariant
}) {
  const v = VARIANTS[variant]
  return (
    <div className="glow-root min-h-[100svh] bg-[var(--glow-bg)]">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1440px] gap-4 p-3 min-[1024px]:p-4">
        <div className="flex min-w-0 flex-1 flex-col px-1 pt-1 min-[810px]:px-8 min-[1024px]:px-10 min-[1024px]:pt-3">
          <header className="flex h-[52px] items-center justify-between gap-3">
            <Wordmark />
            <p className="flex items-center gap-3 text-[14px] leading-[16.8px] text-[var(--glow-gray)]">
              <span className="hidden min-[810px]:inline">{switchTo.prompt}</span>
              <Link
                to={switchTo.to}
                className="rounded-lg bg-white px-3.5 py-2.5 text-[14px] font-medium leading-[16.8px] text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(217,217,217)] transition-colors hover:bg-[var(--glow-bg)]"
              >
                {switchTo.label}
              </Link>
            </p>
          </header>
          <main className="flex flex-1 flex-col items-center justify-center pb-10 pt-6 min-[810px]:py-12">
            <div className="w-full max-w-[420px]">
              <MobileBand v={v} />
              {children}
            </div>
          </main>
          <footer className="flex flex-col items-center gap-1.5 pb-2 text-[13px] leading-[19.5px] text-[var(--glow-gray)] min-[810px]:flex-row min-[810px]:justify-between">
            <span>© {new Date().getFullYear()} Numflash</span>
            <SupportLink where="auth" className="transition-colors hover:text-[var(--glow-text)]">
              Besoin d’aide ? <span className="font-medium text-[var(--glow-blue-dark)]">Assistance WhatsApp</span>
            </SupportLink>
          </footer>
        </div>
        <AuthVisual v={v} />
      </div>
    </div>
  )
}
