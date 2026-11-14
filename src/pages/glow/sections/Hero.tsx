import { useEffect, useState } from 'react'
import { animate } from 'framer-motion'
import { PhoneFrame, PhoneScreen } from '../Phone'
import { PrimaryButton } from '../GlowHeader'
import { Appear, Img, SvgImg } from '../primitives'

function StoreRating({ icon, label, radius }: { icon: string; label: string; radius: number }) {
  return (
    <figure className="flex items-center gap-2">
      <span className="h-5 w-5 overflow-hidden" style={{ borderRadius: radius, boxShadow: '0px 2px 5px 0px rgba(16, 35, 41, 0.2)' }}>
        <img src={`/glow/img/${icon}`} alt="" className="h-5 w-5" />
      </span>
      <span className="flex items-center gap-1 text-[13px] leading-[13px] tracking-[-0.39px] text-[var(--glow-ink)] min-[1200px]:text-[14px] min-[1200px]:leading-[14px] min-[1200px]:tracking-[-0.42px]">
        <span className="font-semibold">4.8</span>
        <SvgImg name="star" className="h-3 w-3" />
        <span className="font-medium">{label}</span>
      </span>
    </figure>
  )
}

/** Compteur « 400+ » : part de 100 et monte jusqu'à 400 au chargement. */
function CountUp({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from)
  useEffect(() => {
    const controls = animate(from, to, { duration: 2, ease: 'easeOut', onUpdate: (v) => setValue(Math.round(v)) })
    return () => controls.stop()
  }, [from, to])
  return <span className="text-[14px] font-semibold leading-[1.6] text-[var(--glow-text)]">{value}</span>
}

function Trusted({ centered = false }: { centered?: boolean }) {
  return (
    <div className={centered ? 'flex flex-col items-center gap-2.5' : 'flex items-center gap-2.5'}>
      <div className="relative flex h-7 w-[62px] items-center">
        <Img src="avatar-1.webp" eager className="absolute left-0 h-7 w-7 rounded-full object-cover" />
        <Img src="avatar-2.webp" eager className="absolute left-[17px] h-7 w-7 rounded-full object-cover shadow-[0_0_0_3px_#f8f7f7]" />
        <Img src="avatar-3.webp" eager className="absolute left-[34px] h-7 w-7 rounded-full object-cover shadow-[0_0_0_3px_#f8f7f7]" />
      </div>
      <p className="flex items-center gap-1 text-[14px] leading-[22.4px] tracking-[-0.28px] text-[var(--glow-text)]">
        <span>Trusted by</span>
        <span className="flex items-center">
          <CountUp from={100} to={400} />
          <span className="font-bold">+</span>
        </span>
        <span>individuals worldwide</span>
      </p>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="flex flex-col items-center bg-[var(--glow-bg)] pt-[100px] min-[810px]:px-8 min-[810px]:pt-16">
      <div className="flex w-full max-w-[1136px] flex-col items-center gap-5 overflow-hidden min-[810px]:h-[543px] min-[810px]:flex-row min-[810px]:gap-8 min-[1200px]:h-[643px]">
        {/* Colonne texte */}
        <div className="flex w-full flex-col items-center gap-8 px-4 min-[810px]:flex-1 min-[810px]:items-start min-[810px]:gap-0 min-[810px]:self-stretch min-[810px]:px-0 min-[810px]:pb-10">
          <div className="flex w-full flex-col items-start gap-5 min-[810px]:flex-1 min-[810px]:justify-center min-[810px]:gap-[18px] min-[1200px]:gap-6">
            <Appear className="hidden flex-wrap items-center gap-x-4 min-[810px]:flex min-[1200px]:gap-x-6" delay={0.5} duration={0.6}>
              <StoreRating icon="icon-app-store.svg" label="on App Store" radius={4} />
              <StoreRating icon="icon-google-play.svg" label="on Google Play" radius={5} />
            </Appear>
            <Appear y={40} className="w-full">
              <h1 className="font-glow-display text-balance text-center text-[36px] font-medium leading-[36px] tracking-[-0.72px] text-[var(--glow-ink)] min-[810px]:text-left min-[810px]:text-[44px] min-[810px]:leading-[44px] min-[810px]:tracking-[-0.88px] min-[1200px]:text-[58px] min-[1200px]:leading-[58px] min-[1200px]:tracking-[-1.16px]">
                Send, spend, and save smarter
              </h1>
            </Appear>
            <Appear y={40} delay={0.1} className="w-full">
              <p className="text-balance text-center text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:text-left min-[810px]:text-[20px] min-[810px]:leading-[30px] min-[810px]:tracking-normal">
                Experience a new way to shop online with innovative payment solutions. Explore our services and enjoy flexible payments tailored to your needs.
              </p>
            </Appear>
            <Appear y={40} delay={0.2} className="flex w-full flex-col items-stretch gap-2 min-[810px]:w-auto min-[810px]:flex-row min-[810px]:items-start">
              <PrimaryButton href="#">Download app</PrimaryButton>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-3 ring-1 ring-inset ring-[rgb(217,217,217)] text-[14px] font-medium leading-[16.8px] text-[var(--glow-text)] transition-colors hover:bg-[var(--glow-bg)]"
              >
                Pricing
              </a>
            </Appear>
          </div>
          <Appear y={40} delay={0.3} className="relative z-[3] w-full">
            <div className="min-[810px]:hidden">
              <Trusted centered />
            </div>
            <div className="hidden min-[810px]:block">
              <Trusted />
            </div>
          </Appear>
        </div>

        {/* Colonne téléphone */}
        <div className="relative h-[460px] w-full shrink-0 overflow-clip min-[810px]:h-[536px] min-[810px]:w-[343px] min-[1200px]:h-[641px] min-[1200px]:w-[482px]">
          <div className="absolute left-1/2 top-[23px] w-[286px] -translate-x-1/2 min-[810px]:left-2 min-[810px]:top-[22px] min-[810px]:w-[324px] min-[810px]:translate-x-0 min-[1200px]:left-5 min-[1200px]:top-10 min-[1200px]:w-[409px]">
            <Appear y={60} duration={0.7}>
              <PhoneFrame>
                <PhoneScreen tab="Overview" sections={['balance', 'cards', 'stocks']} />
              </PhoneFrame>
            </Appear>
          </div>
        </div>
      </div>
    </section>
  )
}
