import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareText } from 'lucide-react'
import '../glow/glow.css'
import { PhoneFrame } from '../glow/Phone'
import { Appear, Img } from '../glow/primitives'
import { AppScreen } from '../landing/AppScreen'
import { NumberCard } from '../landing/NumberCard'
import { SUPPORT_WHATSAPP_URL } from '../landing/facts'
import { Pill, ServiceTile, Wordmark } from '../landing/ui'

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

/** Notification « code reçu » posée sur le téléphone (données d'illustration). */
function CodeToast() {
  return (
    <div className="flex w-[292px] items-center gap-3 rounded-2xl bg-white/95 p-3 pr-4 backdrop-blur" style={{ boxShadow: '0 18px 40px -12px rgba(16, 35, 41, 0.35)' }}>
      <ServiceTile name="WhatsApp" size={40} radius={11} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-medium leading-[15.6px] text-[var(--glow-gray)]">Code WhatsApp reçu</span>
        <span className="font-glow-mono text-[20px] font-bold leading-[24px] tracking-[1px] text-black">482-913</span>
      </div>
      <span className="self-start text-[12px] font-medium leading-[15px] text-[rgb(55,158,45)]">à l’instant</span>
    </div>
  )
}

/** Panneau illustré des grands écrans. */
function AuthVisual() {
  return (
    <aside
      aria-hidden
      className="relative hidden w-[46%] max-w-[660px] shrink-0 overflow-hidden rounded-[40px] min-[1024px]:block"
      style={{ backgroundImage: PANEL_BG, boxShadow: PANEL_SHADOW }}
    >
      <Clouds />
      <div className="relative z-[2] flex flex-col items-start gap-4 p-12 min-[1200px]:p-14">
        <Appear y={20} delay={0.1}>
          <Pill icon={MessageSquareText} tone="white">
            Codes reçus en direct
          </Pill>
        </Appear>
        <Appear y={30} delay={0.15}>
          <h2 className="font-glow-display max-w-[440px] text-balance text-[38px] font-medium leading-[41.8px] tracking-[-1.52px] text-white min-[1200px]:text-[44px] min-[1200px]:leading-[48.4px] min-[1200px]:tracking-[-1.76px]">
            Vos codes SMS, payés en FCFA.
          </h2>
        </Appear>
        <Appear y={30} delay={0.2}>
          <p className="max-w-[400px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-white/85">
            Rechargez en Mobile Money, choisissez votre numéro et recevez votre code en direct, sur téléphone comme sur ordinateur.
          </p>
        </Appear>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 top-[330px] z-[1]"
        style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 70%, transparent 100%)' }}
      >
        {/* Le décalage est porté par un conteneur fixe : framer-motion réécrit le transform de Appear. */}
        <div className="absolute left-1/2 top-0 w-[340px] -translate-x-[38%] min-[1200px]:w-[380px]">
          <Appear y={120} delay={0.25} duration={0.7}>
            <PhoneFrame>
              <AppScreen tab="SMS" sections={['codes', 'numbers']} />
            </PhoneFrame>
          </Appear>
        </div>
      </div>

      <Appear y={40} delay={0.45} duration={0.6} className="absolute bottom-[-64px] left-[-34px] z-[2] [@media(max-height:820px)]:hidden">
        <div style={{ transform: 'rotate(-11deg) scale(0.62)', transformOrigin: 'left bottom' }}>
          <NumberCard tone="gold" />
        </div>
      </Appear>
      <Appear y={24} delay={0.7} duration={0.5} className="absolute left-[30px] top-[588px] z-[3] min-[1200px]:left-[44px]">
        <CodeToast />
      </Appear>
    </aside>
  )
}

/** Bandeau compact des petits écrans : la même ambiance, sans retarder l'accès au formulaire. */
function MobileBand() {
  return (
    <div aria-hidden className="relative mb-7 h-[140px] w-full overflow-hidden rounded-[28px] min-[1024px]:hidden" style={{ backgroundImage: PANEL_BG, boxShadow: PANEL_SHADOW }}>
      <Clouds />
      <div className="absolute left-5 top-5 z-[2] flex max-w-[170px] flex-col gap-2">
        <Pill icon={MessageSquareText} tone="white" className="scale-90 origin-left">
          En direct
        </Pill>
        <p className="font-glow-display text-[20px] font-medium leading-[22px] tracking-[-0.6px] text-white">Vos codes SMS, payés en FCFA.</p>
      </div>
      <div className="absolute left-[calc(100%-176px)] top-[2px] z-[1]" style={{ transform: 'rotate(-14deg) scale(0.48)', transformOrigin: 'left top' }}>
        <NumberCard tone="black" />
      </div>
      <div className="absolute left-[calc(100%-206px)] top-[34px] z-[1]" style={{ transform: 'rotate(-6deg) scale(0.5)', transformOrigin: 'left top' }}>
        <NumberCard tone="blue" />
      </div>
    </div>
  )
}

export function AuthShell({ children, switchTo }: { children: ReactNode; switchTo: { prompt: string; label: string; to: string } }) {
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
              <MobileBand />
              {children}
            </div>
          </main>
          <footer className="flex flex-col items-center gap-1.5 pb-2 text-[13px] leading-[19.5px] text-[var(--glow-gray)] min-[810px]:flex-row min-[810px]:justify-between">
            <span>© {new Date().getFullYear()} Numflash</span>
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--glow-text)]">
              Besoin d’aide ? <span className="font-medium text-[var(--glow-blue-dark)]">Assistance WhatsApp</span>
            </a>
          </footer>
        </div>
        <AuthVisual />
      </div>
    </div>
  )
}
