import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, MessageSquareText, Smartphone, UserPlus } from 'lucide-react'
import { PhoneFrame } from '../../glow/Phone'
import { Img, Reveal, SvgImg, spring } from '../../glow/primitives'
import { useBreakpoint } from '../../glow/useBreakpoint'
import { AppScreen } from '../AppScreen'

/** Bouton au format « badge de store » du modèle (fond noir, deux lignes). */
function Badge({ to, icon, small, big }: { to: string; icon: ReactNode; small: string; big: string }) {
  return (
    <Link to={to} className="flex h-[45px] items-center gap-2 rounded-[7px] bg-black pl-2.5 pr-3.5 text-white ring-1 ring-inset ring-[#a6a6a6] transition-opacity hover:opacity-85">
      {icon}
      <span className="flex flex-col leading-none">
        <span className="text-[9px] font-medium tracking-[0.2px]">{small}</span>
        <span className="text-[17px] font-semibold tracking-[-0.3px]">{big}</span>
      </span>
    </Link>
  )
}

export default function Cta() {
  const bp = useBreakpoint()
  const phone = bp === 'desktop' ? { left: 55, top: 50 } : bp === 'tablet' ? { left: -34, top: 50 } : { left: -170, top: 50 }
  return (
    <section className="flex flex-col items-center px-4 py-12 min-[810px]:flex-row min-[810px]:justify-center min-[810px]:px-8">
      <div
        className="relative flex w-full max-w-[1138px] flex-col items-center gap-[31px] overflow-hidden rounded-[32px] px-8 pt-8 min-[810px]:h-[414px] min-[810px]:flex-row min-[810px]:items-stretch min-[810px]:gap-0 min-[810px]:rounded-[48px] min-[810px]:p-0 min-[1200px]:h-[544px]"
        style={{
          backgroundImage: 'linear-gradient(145deg, #0085ee 0%, rgb(114, 189, 247) 100%)',
          boxShadow:
            'rgba(52, 217, 217, 0.01) 0px 0.602187px 3.01094px 0px inset, rgba(52, 217, 217, 0.03) 0px 2.28853px 11.4427px 0px inset, rgba(52, 217, 217, 0.14) 0px 10px 50px 0px inset',
        }}
      >
        <div
          className="pointer-events-none absolute left-[-1px] top-0 h-[624px] w-full rotate-180 opacity-[0.39] [filter:brightness(1.6)_grayscale(1)_blur(10px)]"
          style={{ WebkitMaskImage: 'linear-gradient(180deg, transparent 59.009%, #000 100%)', maskImage: 'linear-gradient(180deg, transparent 59.009%, #000 100%)' }}
        >
          <Img src="clouds.webp" className="h-full w-full object-contain object-bottom" />
        </div>

        <div className="relative flex w-full flex-col items-start justify-center gap-5 overflow-hidden min-[810px]:w-[530px] min-[810px]:shrink-0 min-[810px]:p-[50px] min-[1200px]:w-[619px]">
          <div className="z-[1] flex items-center gap-3 overflow-hidden">
            <Smartphone className="h-6 w-6 text-white" strokeWidth={1.8} aria-hidden />
            <MessageSquareText className="h-6 w-6 text-white" strokeWidth={1.8} aria-hidden />
            <p className="text-[16px] leading-[24px] text-white/80">Inscription gratuite</p>
          </div>
          <div className="z-[1] flex flex-col items-start gap-2.5 min-[810px]:max-[1199px]:max-w-[340px]">
            <h2 className="font-glow-display text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-[var(--glow-bg)] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
              Prêt à recevoir votre premier code ?
            </h2>
            <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-bg)]">
              Créez votre compte en quelques instants, rechargez en Mobile Money et obtenez votre numéro virtuel.
            </p>
          </div>
          <div className="z-[1] flex flex-col items-start gap-16">
            <div className="flex flex-col items-start gap-1.5 overflow-hidden min-[810px]:flex-row min-[810px]:items-center">
              <Badge to="/inscription" icon={<UserPlus className="h-6 w-6" strokeWidth={1.8} aria-hidden />} small="C’EST GRATUIT" big="Créer un compte" />
              <Badge to="/connexion" icon={<LogIn className="h-6 w-6" strokeWidth={1.8} aria-hidden />} small="DÉJÀ INSCRIT ?" big="Se connecter" />
            </div>
            <div className="hidden flex-col items-start gap-1.5 min-[1200px]:flex">
              <p className="text-[12px] leading-[18px] text-white">Ou scannez pour ouvrir Numflash sur votre téléphone</p>
              <SvgImg name="qrNumflash" alt="QR code vers numflash.com" className="h-20 w-20" />
            </div>
          </div>
        </div>

        <div
          className="relative z-[1] h-[400px] w-full shrink-0 overflow-hidden rounded-3xl min-[810px]:h-auto min-[810px]:flex-1"
          style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 74.3243%, transparent 97.7478%)', maskImage: 'linear-gradient(180deg, #000 74.3243%, transparent 97.7478%)' }}
        >
          <div className="absolute w-[410px]" style={{ left: phone.left, top: phone.top }}>
            <Reveal replay amount={0} from={{ y: 150 }} transition={spring(0, 0.8)}>
              <PhoneFrame>
                <AppScreen tab="Accueil" total={{ label: 'Solde disponible', amount: 12500 }} sections={['wallet', 'numbers', 'codes']} />
              </PhoneFrame>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
