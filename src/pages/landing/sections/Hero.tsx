import { Globe2, Smartphone } from 'lucide-react'
import { formatFCFA } from '@/lib/utils'
import { PhoneFrame } from '../../glow/Phone'
import { Appear } from '../../glow/primitives'
import { AppScreen } from '../AppScreen'
import type { LandingFacts } from '../facts'
import { PrimaryLink, ServiceTile } from '../ui'

function Fact({ tile, strong, rest }: { tile: React.ReactNode; strong: string; rest: string }) {
  return (
    <figure className="flex items-center gap-2">
      {tile}
      <span className="flex items-center gap-1 text-[13px] leading-[13px] tracking-[-0.39px] text-[var(--glow-ink)] min-[1200px]:text-[14px] min-[1200px]:leading-[14px] min-[1200px]:tracking-[-0.42px]">
        <span className="font-semibold">{strong}</span>
        <span className="font-medium">{rest}</span>
      </span>
    </figure>
  )
}

function Reassurance({ facts, centered = false }: { facts: LandingFacts; centered?: boolean }) {
  return (
    <div className={centered ? 'flex flex-col items-center gap-2.5' : 'flex items-center gap-2.5'}>
      <div className="relative flex h-7 w-[62px] items-center">
        {['WhatsApp', 'Telegram', 'Google'].map((s, i) => (
          <span key={s} className="absolute rounded-full" style={{ left: i * 17, boxShadow: i ? '0 0 0 3px #f8f7f7' : undefined }}>
            <ServiceTile name={s} size={28} radius={999} />
          </span>
        ))}
      </div>
      <p className="text-[14px] leading-[22.4px] tracking-[-0.28px] text-[var(--glow-text)]">
        Numéros dès <span className="font-semibold">{formatFCFA(facts.minPrice)}</span>, sans abonnement
      </p>
    </div>
  )
}

export default function Hero({ facts }: { facts: LandingFacts }) {
  return (
    <section className="flex flex-col items-center bg-[var(--glow-bg)] pt-[100px] min-[810px]:px-8 min-[810px]:pt-16">
      <div className="flex w-full max-w-[1136px] flex-col items-center gap-5 overflow-hidden min-[810px]:h-[543px] min-[810px]:flex-row min-[810px]:gap-8 min-[1200px]:h-[643px]">
        <div className="flex w-full flex-col items-center gap-8 px-4 min-[810px]:flex-1 min-[810px]:items-start min-[810px]:gap-0 min-[810px]:self-stretch min-[810px]:px-0 min-[810px]:pb-10">
          <div className="flex w-full flex-col items-start gap-5 min-[810px]:flex-1 min-[810px]:justify-center min-[810px]:gap-[18px] min-[1200px]:gap-6">
            <Appear className="hidden flex-wrap items-center gap-x-4 min-[810px]:flex min-[1200px]:gap-x-6" delay={0.5} duration={0.6}>
              <Fact
                tile={
                  <span className="flex h-5 w-5 items-center justify-center rounded" style={{ background: 'linear-gradient(180deg, #17C9FB 0%, #1A74E8 100%)', boxShadow: '0px 2px 5px 0px rgba(16, 35, 41, 0.2)' }}>
                    <Globe2 className="h-3.5 w-3.5 text-white" strokeWidth={2.2} aria-hidden />
                  </span>
                }
                strong={String(facts.countries)}
                rest="pays disponibles"
              />
              <Fact
                tile={
                  <span className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-white" style={{ boxShadow: '0px 2px 5px 0px rgba(16, 35, 41, 0.2)' }}>
                    <Smartphone className="h-3.5 w-3.5 text-[#1fa855]" strokeWidth={2.2} aria-hidden />
                  </span>
                }
                strong="Mobile Money"
                rest="et carte bancaire"
              />
            </Appear>
            <Appear y={40} className="w-full">
              <h1 className="font-glow-display text-balance text-center text-[36px] font-medium leading-[36px] tracking-[-0.72px] text-[var(--glow-ink)] min-[810px]:text-left min-[810px]:text-[44px] min-[810px]:leading-[44px] min-[810px]:tracking-[-0.88px] min-[1200px]:text-[58px] min-[1200px]:leading-[58px] min-[1200px]:tracking-[-1.16px]">
                Recevez vos codes SMS,
                <br className="hidden min-[1200px]:block" /> payez en FCFA
              </h1>
            </Appear>
            <Appear y={40} delay={0.1} className="w-full">
              <p className="text-balance text-center text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:text-left min-[810px]:text-[20px] min-[810px]:leading-[30px] min-[810px]:tracking-normal">
                Des numéros virtuels dans {facts.countries} pays pour vérifier WhatsApp, Telegram, Google et bien d’autres. Payez en Mobile Money, recevez votre code en direct.
              </p>
            </Appear>
            <Appear y={40} delay={0.2} className="flex w-full flex-col items-stretch gap-2 min-[810px]:w-auto min-[810px]:flex-row min-[810px]:items-start">
              <PrimaryLink to="/inscription">Créer un compte</PrimaryLink>
              <a
                href="#tarifs"
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-3 text-[14px] font-medium leading-[16.8px] text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(217,217,217)] transition-colors hover:bg-[var(--glow-bg)]"
              >
                Voir les tarifs
              </a>
            </Appear>
          </div>
          <Appear y={40} delay={0.3} className="relative z-[3] w-full">
            <div className="min-[810px]:hidden">
              <Reassurance facts={facts} centered />
            </div>
            <div className="hidden min-[810px]:block">
              <Reassurance facts={facts} />
            </div>
          </Appear>
        </div>

        <div className="relative h-[460px] w-full shrink-0 overflow-clip min-[810px]:h-[536px] min-[810px]:w-[343px] min-[1200px]:h-[641px] min-[1200px]:w-[482px]">
          <div className="absolute left-1/2 top-[23px] w-[286px] -translate-x-1/2 min-[810px]:left-2 min-[810px]:top-[22px] min-[810px]:w-[324px] min-[810px]:translate-x-0 min-[1200px]:left-5 min-[1200px]:top-10 min-[1200px]:w-[409px]">
            <Appear y={60} duration={0.7}>
              <PhoneFrame>
                <AppScreen tab="Accueil" total={{ label: 'Solde disponible', amount: 12500 }} sections={['wallet', 'numbers', 'codes']} />
              </PhoneFrame>
            </Appear>
          </div>
        </div>
      </div>
    </section>
  )
}
