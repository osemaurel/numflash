import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Icon, Img, SvgImg } from './primitives'

/* ------------------------------------------------------------------ */
/* Cadre iPhone (reproduit au pixel près le composant du modèle)       */
/* Dimensions de référence : 432 × 904, mis à l'échelle de la largeur. */
/* ------------------------------------------------------------------ */

const FRAME_W = 432
const FRAME_H = 904
const SCREEN_DESIGN_W = 385
const SCREEN_SCALE = 402 / SCREEN_DESIGN_W

const metal = 'linear-gradient(90deg, #6c675e 0%, #a8a297 40%, #dcd7cc 100%)'
const metalR = 'linear-gradient(270deg, #6c675e 0%, #a8a297 40%, #dcd7cc 100%)'
const btnShadow = 'inset 0 0.5px 0 rgba(255,255,255,0.35), inset 0 -0.5px 0 rgba(0,0,0,0.45)'
const antenna = 'linear-gradient(0deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))'

function useScale(base: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / base)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [base])
  return { ref, scale }
}

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  const { ref, scale } = useScale(FRAME_W)
  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}>
      <div className="absolute left-0 top-0" style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {/* Boutons latéraux */}
        <div className="pointer-events-none absolute" style={{ left: -3, top: 159.74, width: 5, height: 33.27, borderRadius: '2px 0 0 2px', background: metal, boxShadow: btnShadow }} />
        <div className="pointer-events-none absolute" style={{ left: -3, top: 224.19, width: 5, height: 60.03, borderRadius: '2px 0 0 2px', background: metal, boxShadow: btnShadow }} />
        <div className="pointer-events-none absolute" style={{ left: -3, top: 302.39, width: 5, height: 60.03, borderRadius: '2px 0 0 2px', background: metal, boxShadow: btnShadow }} />
        <div className="pointer-events-none absolute" style={{ left: 430, top: 263.79, width: 5, height: 106.13, borderRadius: '0 2px 2px 0', background: metalR, boxShadow: btnShadow }} />
        {/* Châssis titane */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-[1]"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            borderRadius: 77,
            background:
              'conic-gradient(from 0deg at 50% 50%, #a8a297 0deg, #dcd7cc 26deg, #a8a297 68deg, #6c675e 118deg, #a8a297 165deg, #dcd7cc 205deg, #a8a297 250deg, #6c675e 298deg, #dcd7cc 334deg, #a8a297 360deg)',
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.5), inset 0 0 0 1.25px rgba(255,255,255,0.28)',
          }}
        />
        {/* Lignes d'antenne */}
        <div className="pointer-events-none absolute z-[2]" style={{ left: 335.13, top: 0, width: 1.5, height: 5.5, background: antenna }} />
        <div className="pointer-events-none absolute z-[2]" style={{ left: 65.78, top: 898.5, width: 1.5, height: 5.5, background: antenna }} />
        <div className="pointer-events-none absolute z-[2]" style={{ left: 0, top: 87.21, width: 5.5, height: 1.5, background: antenna }} />
        <div className="pointer-events-none absolute z-[2]" style={{ left: 0, top: 810.14, width: 5.5, height: 1.5, background: antenna }} />
        <div className="pointer-events-none absolute z-[2]" style={{ left: 426.5, top: 810.14, width: 5.5, height: 1.5, background: antenna }} />
        {/* Lunette noire */}
        <div
          className="pointer-events-none absolute z-[3]"
          style={{
            left: 5.5,
            top: 5.5,
            width: 421,
            height: 893,
            borderRadius: 71.5,
            background: '#030303',
            boxShadow: '0 0 0 0.5px rgba(0,0,0,0.6), 0 0 1.5px 0.5px rgba(255,255,255,0.45), inset 0 0 0 0.5px rgba(255,255,255,0.1)',
          }}
        />
        {/* Écran */}
        <div className="absolute z-[4] overflow-hidden" style={{ left: 15, top: 15, width: 402, height: 874, borderRadius: 62, background: 'rgb(248, 247, 247)', isolation: 'isolate', transform: 'translateZ(0)' }}>
          <div className="absolute left-0 top-0 overflow-hidden" style={{ width: SCREEN_DESIGN_W, height: 837.04, transform: `scale(${SCREEN_SCALE})`, transformOrigin: '0 0' }}>
            {children}
          </div>
          {/* Barre d'état */}
          <div className="pointer-events-none absolute left-0 top-0 z-[3] text-white" style={{ width: 402, height: 59 }}>
            <div
              className="font-glow-system absolute left-0 flex items-center justify-center"
              style={{ width: 138.5, top: 18.5, height: 22, fontWeight: 600, fontSize: 17, letterSpacing: -0.4, lineHeight: '22px', fontVariantNumeric: 'tabular-nums' }}
            >
              9:41
            </div>
            <div className="absolute right-0 flex items-center justify-center gap-1.5" style={{ width: 138.5, top: 22.5, height: 14 }}>
              <Icon name="signal" className="h-[12px] w-[19px]" />
              <Icon name="wifi" className="h-[12px] w-[17px]" />
              <Icon name="battery" className="h-[13px] w-[27.5px]" />
            </div>
          </div>
          {/* Dynamic Island */}
          <div className="pointer-events-none absolute z-[4]" style={{ left: 138.5, top: 11, width: 125, height: 37, borderRadius: 37, background: '#030303' }}>
            <div className="absolute rounded-full" style={{ right: 8.14, top: 7.03, width: 22.94, height: 22.94, background: '#0e0b0f' }}>
              <div className="absolute rounded-full" style={{ inset: 3.21, background: 'radial-gradient(circle at 35% 30%, #2a2850 0%, #16142a 55%, #0b0a18 100%)' }} />
              <div className="absolute rounded-full" style={{ inset: 7.34, background: '#0f0f2a' }} />
              <div className="absolute rounded-full" style={{ left: 9.63, top: 6.42, width: 2.52, height: 2.52, background: '#39375a' }} />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 z-[5]" style={{ borderRadius: 62, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.9), inset 0 0 2.5px 0 rgba(0,0,0,0.55)' }} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Écrans de l'application (largeur de conception 385 px)              */
/* ------------------------------------------------------------------ */

export type PhoneTab = 'Overview' | 'Cards' | 'Stocks' | 'Cryptos' | 'Cashback'
const TABS: PhoneTab[] = ['Overview', 'Cards', 'Stocks', 'Cryptos', 'Cashback']

const cardShadow = '0px 1px 4px 0px rgba(12, 12, 13, 0.05), 0px 1px 4px 0px rgba(12, 12, 13, 0.1)'
const GREEN = 'rgb(55, 158, 45)'
const RED = 'rgb(232, 46, 46)'

function AppCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col gap-5 rounded-[20px] bg-white px-5 py-4', className)} style={{ boxShadow: cardShadow }}>
      <div className="flex items-center opacity-60">
        <span className="font-glow-manrope text-[14px] font-bold leading-[16.8px] text-[#050505]">{title}</span>
        <SvgImg name="headingChevron" className="h-3 w-3" />
      </div>
      {children}
    </div>
  )
}

function BalanceCard() {
  return (
    <AppCard title="Balance">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <SvgImg name="cashCoin" className="h-10 w-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-medium leading-[21.6px] tracking-[-0.36px] text-black">Cash</span>
              <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">$467.20</span>
            </div>
            <div className="flex flex-col gap-1.5 text-[13px] font-medium leading-[15.6px] tracking-[-0.26px] text-[rgb(121,121,121)]">
              <div className="flex justify-between">
                <span>Dollar</span>
                <span>$370.13</span>
              </div>
              <div className="flex justify-between">
                <span>Euro</span>
                <span>€98.07</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <SvgImg name="stocksCoin" className="h-10 w-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-medium leading-[21.6px] tracking-[-0.36px] text-black">Stocks</span>
              <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">$2067.83</span>
            </div>
            <div className="flex justify-between text-[13px] font-medium leading-[15.6px] tracking-[-0.26px] text-[rgb(121,121,121)]">
              <span>3 stocks</span>
              <span style={{ color: GREEN }}>3.17%</span>
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  )
}

function CardsCard() {
  const rows = [
    { img: 'card-mini-blue.webp', name: 'Main', sub: 'Debit - 2424', amount: '$368.13' },
    { img: 'card-mini-gold.webp', name: 'Gold', sub: 'Virtual - 6589', amount: '$2.07' },
    { img: 'card-mini-black.webp', name: 'Black', sub: 'Credit - 3476', amount: '$120.000' },
  ]
  return (
    <AppCard title="Cards">
      <div className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.name} className="flex gap-3">
            <Img src={r.img} className="h-10 w-[63px] shrink-0 object-contain" />
            <div className="flex flex-1 flex-col justify-center gap-0.5">
              <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{r.name}</span>
              <span className="text-[14px] leading-[16.8px] tracking-[-0.28px] text-black/50">{r.sub}</span>
            </div>
            <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{r.amount}</span>
          </div>
        ))}
      </div>
    </AppCard>
  )
}

interface Quote {
  name: string
  ticker: string
  delta: string
  price: string
  pct: string
  up: boolean
  logo: ReactNode
}

const STOCKS: Quote[] = [
  { name: 'Apple', ticker: 'AAPL', delta: '+6.38', price: '219.62', pct: '+2.99%', up: true, logo: <span className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-[rgb(41,41,41)]"><SvgImg name="appleWhite" className="h-6 w-5" /></span> },
  { name: 'AMD', ticker: 'AMD', delta: '+10.05', price: '173.34', pct: '+6.23%', up: true, logo: <span className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-[rgb(214,28,28)]"><SvgImg name="amdWhite" className="h-5 w-5" /></span> },
  { name: 'Intel', ticker: 'INTC', delta: '-0.56', price: '19.84', pct: '-2.79%', up: false, logo: <span className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-[var(--glow-blue)]"><SvgImg name="intelWhite" className="h-[13px] w-8" /></span> },
]

function QuoteRow({ q }: { q: Quote }) {
  const color = q.up ? GREEN : RED
  return (
    <div className="flex gap-3">
      <span className="shrink-0">{q.logo}</span>
      <div className="flex flex-1 flex-col justify-center gap-0.5">
        <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{q.name}</span>
        <span className="text-[14px] leading-[16.8px] tracking-[-0.28px] text-black/50">{q.ticker}</span>
      </div>
      <div className="flex flex-col items-end justify-center gap-0.5">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[13px] font-medium leading-[15.6px] tracking-[-0.26px]" style={{ color }}>
            {q.delta}
          </span>
          <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{q.price}</span>
        </div>
        <span className="text-[13px] font-medium leading-[15.6px] tracking-[-0.26px]" style={{ color }}>
          {q.pct}
        </span>
      </div>
    </div>
  )
}

function StocksCard() {
  return (
    <AppCard title="Stocks">
      <div className="flex flex-col gap-4">
        {STOCKS.map((q) => (
          <QuoteRow key={q.ticker} q={q} />
        ))}
      </div>
    </AppCard>
  )
}

function CryptoGlyph({ bg, children, pl = 0 }: { bg: string; children: ReactNode; pl?: number }) {
  return (
    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: bg, paddingLeft: pl }}>
      {children}
    </span>
  )
}

const CRYPTOS = [
  { name: 'Bitcoin', ticker: 'BTC', price: '$117,153.55', pct: '+1.82%', icon: <CryptoGlyph bg="rgb(247, 147, 26)"><SvgImg name="bitcoinGlyph" className="h-6 w-6" /></CryptoGlyph> },
  { name: 'Ethereum', ticker: 'ETH', price: '$3,871.20', pct: '+5.52%', icon: <CryptoGlyph bg="rgb(235, 235, 235)"><SvgImg name="ethereumGlyph" className="h-6 w-4" /></CryptoGlyph> },
  { name: 'Dogecoin', ticker: 'DOGE', price: '$0.2190', pct: '+6.7%', icon: <CryptoGlyph bg="rgb(186, 159, 51)" pl={2}><SvgImg name="dogeGlyph" className="h-4 w-4" /></CryptoGlyph> },
]

export function CryptoRows({ compact = false, className }: { compact?: boolean; className?: string }) {
  const items = compact ? CRYPTOS.slice(0, 2) : CRYPTOS
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {items.map((c) => (
        <div key={c.ticker} className="flex gap-3">
          {c.icon}
          <div className="flex flex-1 flex-col justify-center gap-0.5">
            <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{c.name}</span>
            <span className="text-[14px] leading-[16.8px] tracking-[-0.28px] text-black/50">{c.ticker}</span>
          </div>
          <div className="flex flex-col items-end justify-center gap-0.5">
            <span className="text-[16px] font-medium leading-[19.2px] tracking-[-0.32px] text-black">{c.price}</span>
            <span className="text-[13px] font-medium leading-[15.6px] tracking-[-0.26px]" style={{ color: GREEN }}>
              {c.pct}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CryptosCard() {
  return (
    <AppCard title="Cryptos">
      <CryptoRows />
    </AppCard>
  )
}

function FeaturedCard() {
  const items = [
    { img: 'featured-listenify.webp', name: 'Listenify', rate: '10% cashback', tint: 'linear-gradient(180deg, rgb(8, 165, 54) 0%, rgba(8, 165, 54, 0) 100%)' },
    { img: 'featured-lumecosta.webp', name: 'Lumecosta', rate: '3% cashback', tint: 'linear-gradient(180deg, rgb(0, 69, 38) 0%, rgba(0, 69, 38, 0) 100%)' },
    { img: 'partner-tshirt.webp', name: 'Pinpoint', rate: '3% cashback', tint: 'linear-gradient(180deg, rgb(255, 92, 105) 0%, rgba(54, 0, 4, 0) 100%)' },
    { img: 'featured-cream.webp', name: 'Lumecosta', rate: '3% cashback', tint: 'linear-gradient(180deg, rgb(218, 132, 4) 0%, rgba(218, 132, 4, 0) 100%)' },
  ]
  return (
    <div className="flex w-full flex-col gap-5 rounded-[20px] bg-white px-5 py-4" style={{ boxShadow: cardShadow }}>
      <span className="font-glow-manrope text-[14px] font-bold leading-[16.8px] text-[#050505] opacity-60">Featured</span>
      <div className="grid grid-cols-2 gap-4">
        {items.map((i, k) => (
          <div key={k} className="flex flex-col gap-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl">
              <Img src={i.img} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute" style={{ inset: '-20px -30px', background: i.tint }} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-black">{i.name}</span>
              <span className="text-[14px] leading-[16.8px] tracking-[-0.28px] text-black/50">{i.rate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Navbar({ tab }: { tab: PhoneTab }) {
  // La barre d'onglets déborde : alignée à droite quand « Cashback » est actif, comme dans le modèle.
  return (
    <div className={cn('flex items-center gap-1', tab === 'Cashback' && 'justify-end')}>
      {TABS.map((t) => (
        <div
          key={t}
          className={cn('flex h-[26px] shrink-0 items-center rounded-full px-3 py-0.5', t === tab && 'bg-white')}
          style={t === tab ? { boxShadow: cardShadow } : undefined}
        >
          <span className={cn('font-glow-manrope text-[14px] font-bold leading-[16.8px]', t === tab ? 'text-[#050505]' : 'text-white/70')}>{t}</span>
        </div>
      ))}
    </div>
  )
}

export type PhoneSection = 'balance' | 'cards' | 'stocks' | 'cryptos' | 'featured'

/** Écran de l'app : en-tête bleu + onglets + cartes empilées. */
export function PhoneScreen({ tab = 'Overview', sections, showTotal = true }: { tab?: PhoneTab; sections: PhoneSection[]; showTotal?: boolean }) {
  const blocks: Record<PhoneSection, ReactNode> = {
    balance: <BalanceCard />,
    cards: <CardsCard />,
    stocks: <StocksCard />,
    cryptos: <CryptosCard />,
    featured: <FeaturedCard />,
  }
  return (
    <figure className="relative h-[820px] w-[385px] overflow-clip" aria-label="Capture de l'application Glow">
      <SvgImg name="phoneScreenBg" className="absolute inset-0 h-full w-full" />
      <div className="absolute left-0 top-0 w-full" style={{ height: showTotal ? 318 : 181, background: 'linear-gradient(180deg, #0085ee 0%, rgba(0, 134, 237, 0.7) 100%)' }} />
      <div className="absolute left-[15px] top-[55px] flex w-[355px] flex-col gap-4">
        <div className="flex h-[30px] items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[37px] bg-white text-[13px] font-medium leading-[15.6px] text-[#050505]">JM</span>
            <span className="font-glow-manrope text-[16px] font-semibold leading-[19.2px] text-white">Welcome, Jeff</span>
          </div>
          <div className="flex items-center gap-4">
            <SvgImg name="bell" className="h-6 w-6" />
            <SvgImg name="settings" className="h-6 w-6" />
          </div>
        </div>
        <Navbar tab={tab} />
        {showTotal ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex items-center justify-center gap-1">
              <SvgImg name="selectorLeft" className="h-3 w-3 opacity-0" />
              <span className="font-glow-manrope text-[14px] font-bold leading-[16.8px] text-white">Personal Account</span>
              <SvgImg name="selectorDown" className="h-3 w-3" />
            </div>
            <div className="flex items-start justify-center gap-1">
              <span className="pt-0.5 text-[24px] font-medium leading-[28.8px] tracking-[-0.48px] text-white/60">$</span>
              <span className="text-[44px] font-semibold leading-[44px] tracking-[-1.76px] text-white">467.20</span>
              <span className="pt-0.5 text-[24px] font-medium leading-[28.8px] tracking-[-0.48px] opacity-0">$</span>
            </div>
          </div>
        ) : null}
        {sections.map((s) => (
          <div key={s}>{blocks[s]}</div>
        ))}
      </div>
    </figure>
  )
}
