import { PhoneFrame, PhoneScreen } from '../Phone'
import { Img, Reveal, SvgImg, spring } from '../primitives'
import { useBreakpoint } from '../useBreakpoint'

export default function Cta() {
  const bp = useBreakpoint()
  // Position du téléphone dans la colonne image (le modèle le décale à gauche sur mobile/tablette).
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
        {/* Nuages en fond (image retournée, floutée et désaturée) */}
        <div
          className="pointer-events-none absolute left-[-1px] top-0 h-[624px] w-full rotate-180 opacity-[0.39] [filter:brightness(1.6)_grayscale(1)_blur(10px)]"
          style={{ WebkitMaskImage: 'linear-gradient(180deg, transparent 59.009%, #000 100%)', maskImage: 'linear-gradient(180deg, transparent 59.009%, #000 100%)' }}
        >
          <Img src="clouds.webp" className="h-full w-full object-contain object-bottom" />
        </div>

        <div className="relative flex w-full flex-col items-start justify-center gap-5 overflow-hidden min-[810px]:w-[530px] min-[810px]:shrink-0 min-[810px]:p-[50px] min-[1200px]:w-[619px]">
          <div className="z-[1] flex items-center gap-3 overflow-hidden">
            <SvgImg name="appStoreGlyph" className="h-6 w-[26px]" />
            <SvgImg name="playStoreGlyph" className="h-6 w-[21px]" />
            <h2 className="text-[16px] leading-[24px] text-white/80">Download the app</h2>
          </div>
          <div className="z-[1] flex flex-col items-start gap-2.5 min-[810px]:max-[1199px]:max-w-[340px]">
            <h2 className="font-glow-display text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-[var(--glow-bg)] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
              Join now and take charge of your finances
            </h2>
            <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-bg)]">
              Open your account in minutes and take full control of your money. Spend, split, and save with total freedom.
            </p>
          </div>
          <div className="z-[1] flex flex-col items-start gap-16">
            <div className="flex flex-col items-start gap-1.5 overflow-hidden min-[810px]:flex-row min-[810px]:items-center">
              <a href="https://www.apple.com/app-store/" target="_blank" rel="noreferrer" aria-label="Download on the App Store" className="block h-[45px] w-[136px] overflow-hidden">
                <SvgImg name="badgeAppStore" className="h-full w-full" />
              </a>
              <a href="https://play.google.com/store/games?hl=en" target="_blank" rel="noreferrer" aria-label="Get it on Google Play" className="block h-[45px] w-[152px] overflow-hidden">
                <SvgImg name="badgeGooglePlay" className="h-full w-full" />
              </a>
            </div>
            <div className="hidden flex-col items-start gap-1.5 min-[1200px]:flex">
              <p className="text-[12px] leading-[18px] text-white">Or scan the QR code below</p>
              <SvgImg name="qrCode" alt="QR code" className="h-20 w-20" />
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
                <PhoneScreen tab="Overview" sections={['balance', 'cards', 'stocks']} />
              </PhoneFrame>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
