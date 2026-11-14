import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CryptoRows, PhoneFrame, PhoneScreen } from '../Phone'
import { Icon, Img, SvgImg } from '../primitives'
import type { GlowIconName } from '../glowIcons'
import { SmallPill } from './Feature4'

const SH_SOFT =
  'rgba(0, 0, 0, 0.18) 0.301094px 0.602187px 0.673266px -1.25px, rgba(0, 0, 0, 0.16) 1.14427px 2.28853px 2.55866px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.1803px -3.75px'
const SH_APP = '0px 1px 4px 0px rgba(12, 12, 13, 0.05), 0px 1px 4px 0px rgba(12, 12, 13, 0.1)'
const GREEN = 'rgb(24, 128, 52)'
const RED = 'rgb(209, 56, 56)'

/** Bougies du graphique boursier : position de la mèche et du corps (en px dans le graphique 315 × 116). */
const CANDLES: { x: number; wickY: number; wickH: number; bodyY: number; bodyH: number; up: boolean }[] = [
  { x: 5, wickY: 28, wickH: 70, bodyY: 34, bodyH: 56, up: true },
  { x: 18, wickY: 41, wickH: 60, bodyY: 46, bodyH: 40, up: false },
  { x: 31, wickY: 36, wickH: 35, bodyY: 36, bodyH: 25, up: true },
  { x: 44, wickY: 24, wickH: 60, bodyY: 28, bodyH: 40, up: true },
  { x: 57, wickY: 12, wickH: 50, bodyY: 16, bodyH: 40, up: true },
  { x: 71, wickY: 36, wickH: 47, bodyY: 38, bodyH: 40, up: false },
  { x: 83, wickY: 48, wickH: 40, bodyY: 59, bodyH: 27, up: false },
  { x: 96, wickY: 52, wickH: 60, bodyY: 57, bodyH: 38, up: false },
  { x: 110, wickY: 40, wickH: 41, bodyY: 47, bodyH: 25, up: true },
  { x: 123, wickY: 35, wickH: 60, bodyY: 39, bodyH: 40, up: true },
  { x: 136, wickY: 23, wickH: 50, bodyY: 27, bodyH: 40, up: true },
  { x: 150, wickY: 47, wickH: 47, bodyY: 49, bodyH: 40, up: false },
]

function Ticker({ logo, label, pct, up, top }: { logo: ReactNode; label: string; pct: string; up: boolean; top: number }) {
  return (
    <div className="absolute flex h-[31px] w-[144px] items-center justify-center gap-2 overflow-hidden rounded-lg bg-white py-1 pl-2.5 pr-3" style={{ left: 171, top }}>
      {logo}
      <span className="font-glow-geist w-[43px] text-[14px] font-medium leading-[14px] text-black">{label}</span>
      <span className="flex h-[17px] items-center gap-1 rounded px-1" style={{ background: up ? 'rgb(160, 250, 184)' : 'rgb(250, 160, 160)' }}>
        <SvgImg name={up ? 'arrowUpGreen' : 'arrowDownRed'} className={cn('h-2 w-2', !up && 'rotate-180')} />
        <span className="text-[10px] font-semibold leading-[10px] tracking-[-0.3px]" style={{ color: up ? 'rgb(26, 43, 31)' : 'rgb(43, 26, 26)' }}>
          {pct}
        </span>
      </span>
    </div>
  )
}

function ChartVisual() {
  return (
    <figure className="flex h-[144px] w-full items-center justify-center overflow-hidden px-5 pb-2 pt-5">
      <div className="relative h-[116px] w-[315px] shrink-0 overflow-hidden">
        {CANDLES.map((c, i) => (
          <div key={i}>
            <span className="absolute w-px" style={{ left: c.x, top: c.wickY, height: c.wickH, background: c.up ? GREEN : RED }} />
            <span className="absolute w-1.5" style={{ left: c.x - 2, top: c.bodyY, height: c.bodyH, background: c.up ? GREEN : RED }} />
          </div>
        ))}
        <Ticker top={17} label="AAPL" pct="1.54%" up logo={<SvgImg name="appleGray" className="h-[17px] w-[14px]" />} />
        <Ticker top={58} label="GME" pct="0.51%" up={false} logo={<SvgImg name="gmeLogo" className="h-[17px] w-[15px]" />} />
      </div>
    </figure>
  )
}

function CenteredText({ icon, pill, title, text, titleWidth = 270 }: { icon: GlowIconName; pill: string; title: string; text: string; titleWidth?: number }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 overflow-clip p-5 text-center">
      <SmallPill icon={icon}>{pill}</SmallPill>
      <h3 className="font-glow-display text-balance text-[18px] font-medium leading-[21.6px] text-black" style={{ maxWidth: titleWidth }}>
        {title}
      </h3>
      <p className="max-w-[326px] text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90">{text}</p>
    </div>
  )
}

const COINS: { name: string; left: number; top: number; hover: { rotate: number } }[] = [
  { name: 'coinEuro', left: 45, top: 16, hover: { rotate: -5 } },
  { name: 'coinLira', left: 117, top: 70, hover: { rotate: 0 } },
  { name: 'coinPound', left: 188, top: 14, hover: { rotate: 0 } },
  { name: 'coinDollar', left: 260, top: 70, hover: { rotate: 5 } },
]

function CurrencyVisual() {
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
        {COINS.map((c) => (
          <motion.div
            key={c.name}
            className="absolute flex h-20 w-20 cursor-pointer items-center justify-center rounded-[78px] bg-white"
            style={{ left: c.left, top: c.top, boxShadow: SH_SOFT }}
            whileHover={{ scale: 1.1, rotate: c.hover.rotate, transition: { type: 'spring', bounce: 0.25, duration: 0.45 } }}
          >
            <SvgImg name={c.name} className="h-[45px] w-[45px]" />
          </motion.div>
        ))}
      </div>
    </figure>
  )
}

function FeePill({ icon, label }: { icon: GlowIconName; label: string }) {
  return (
    <div className="flex h-[31px] items-center justify-center gap-2 rounded-lg bg-white py-1 pl-2.5 pr-1.5">
      <Icon name={icon} className="h-4 w-4 text-black/20" />
      <span className="font-glow-geist text-[14px] font-medium leading-[16.8px] text-black">{label}</span>
      <span className="flex items-center rounded px-[5px]" style={{ background: 'rgb(160, 250, 184)' }}>
        <span className="font-glow-geist text-[11px] font-semibold leading-[13.2px]" style={{ color: GREEN }}>
          $0.00
        </span>
      </span>
    </div>
  )
}

const card = 'flex w-full flex-col items-center overflow-hidden rounded-[32px] bg-[var(--glow-bg)]'

export default function Feature5() {
  return (
    <section className="relative z-[1] flex flex-col items-center overflow-hidden px-4 py-12 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="flex w-full flex-col items-center gap-3 text-center">
          <h3 className="font-glow-geist text-[16px] font-medium leading-[16px] tracking-[-0.48px] text-[var(--glow-blue)]">Features</h3>
          <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Meet <span className="text-[var(--glow-blue)]">All-in-One</span> Financing
          </h2>
          <p className="max-w-[569px] text-balance text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)]">
            From startups to global teams, our plans are designed to scale with you. Get access to payments, cards, and financial tools.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 bg-white min-[810px]:grid-cols-2 min-[1200px]:grid-cols-3">
          {/* Colonne gauche */}
          <div className="flex flex-col justify-center gap-6">
            <div className={cn(card, 'justify-center')}>
              <ChartVisual />
              <CenteredText icon="chartLineAlt" pill="Stocks" title="Your portfolio, without the broker fees" text="Easily buy, sell, and manage your stock portfolio with real-time data and intuitive tools." />
            </div>
            <div className={cn(card, 'justify-center')}>
              <figure className="flex h-[152px] w-full items-center justify-center px-5 pb-2 pt-5">
                <div className="w-full rounded-[20px] bg-white px-5 py-4" style={{ boxShadow: SH_APP }}>
                  <CryptoRows compact />
                </div>
              </figure>
              <CenteredText icon="bitcoinBadge" pill="Crypto" title="Crypto and cash, finally in one app" text="Buy, sell, and swap your favorite cryptocurrencies with just a few taps." titleWidth={251} />
            </div>
          </div>

          {/* Téléphone central */}
          <div className="relative flex h-[673px] items-start justify-center min-[810px]:max-[1199px]:hidden">
            <div className="absolute top-[-7px] w-[328px]">
              <PhoneFrame>
                <PhoneScreen tab="Overview" sections={['balance', 'cards', 'stocks']} />
              </PhoneFrame>
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col justify-center gap-6">
            <div className={cn(card, 'justify-center')}>
              <CenteredText icon="globe" pill="Global Payments" title="Multi-Currency support for global payments" text="Manage payments and conversions in your preferred currencies for global transactions." />
              <CurrencyVisual />
            </div>
            <div className={cn(card, 'justify-center gap-3 p-5')}>
              <SmallPill icon="noCharges">No surprise charges</SmallPill>
              <h3 className="font-glow-display text-center text-[18px] font-medium leading-[21.6px] text-black">Say goodbye to surprise charges</h3>
              <p className="w-full text-balance text-center text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90">
                Pay only what you see upfront. No hidden costs.
              </p>
              <div className="flex w-full items-center justify-center gap-5 overflow-hidden px-5 pb-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white"
                  style={{ boxShadow: 'rgba(0, 0, 0, 0.18) 0.3px 0.6px 0.67px -1.25px, rgba(0, 0, 0, 0.16) 1.14px 2.29px 2.56px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.18px -3.75px' }}
                >
                  <Icon name="checkBig" className="h-10 w-10 text-[#3da10b]" />
                </div>
                <div className="flex flex-col items-start gap-2.5">
                  <FeePill icon="serviceFee" label="Service fee" />
                  <FeePill icon="eyeOff" label="Hidden fees" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
