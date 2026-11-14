import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PhoneFrame, PhoneScreen, type PhoneSection, type PhoneTab } from '../Phone'
import { CheckItem, Icon, Reveal, spring } from '../primitives'
import type { GlowIconName } from '../glowIcons'
import { useBreakpoint } from '../useBreakpoint'

interface CardDef {
  theme: 'blue' | 'white' | 'gray'
  pill: { icon: GlowIconName; label: string }
  title: string
  text: string
  items: string[]
  phone: { tab: PhoneTab; sections: PhoneSection[] }
  imageFirst: boolean
  sticky: { top: number; pb: number; pbTablet: number }
  /** Position du téléphone dans la colonne image : bureau, tablette. */
  phonePos: { desktop: number; tablet: number }
}

const CARDS: CardDef[] = [
  {
    theme: 'blue',
    pill: { icon: 'gift', label: 'Cashback' },
    title: 'Get rewards while you spend',
    text: 'Transform your spending into earning with our intelligent cashback system. Get instant rewards on qualifying purchases while enjoying the flexibility of our buy-now-pay-later solution.',
    items: ['Instant Cashback', '20+ Partner Brands', 'No Annual Fees'],
    phone: { tab: 'Cashback', sections: ['featured', 'balance'] },
    imageFirst: false,
    sticky: { top: 70, pb: 70, pbTablet: 70 },
    phonePos: { desktop: 6, tablet: 3 },
  },
  {
    theme: 'white',
    pill: { icon: 'chartLine', label: 'Stocks' },
    title: 'Trade stocks, easier than ever',
    text: 'Get real-time access to global markets, commission-free trades, advanced charting, and AI-driven insights—all on an intuitive, secure platform designed for speed and simplicity.',
    items: ['Real-Time', 'Commission-Free', 'Price Alerts'],
    phone: { tab: 'Stocks', sections: ['stocks', 'balance'] },
    imageFirst: true,
    sticky: { top: 100, pb: 35, pbTablet: 35 },
    phonePos: { desktop: 71, tablet: 131 },
  },
  {
    theme: 'gray',
    pill: { icon: 'cryptoCoin', label: 'Cryptos' },
    title: 'Your crypto journey starts right here',
    text: 'Enter the world of cryptocurrency trading with confidence through our integrated crypto platform. Buy, sell, and trade popular digital assets like Bitcoin, Ethereum, and more directly from your account.',
    items: ['50+ cryptocurrencies', 'Low Trading Fees', 'Price Alerts'],
    phone: { tab: 'Cryptos', sections: ['cryptos', 'stocks'] },
    imageFirst: false,
    sticky: { top: 130, pb: 0, pbTablet: 0 },
    phonePos: { desktop: 6, tablet: 3 },
  },
]

const THEMES = {
  blue: {
    box: 'border-0',
    style: {
      backgroundImage: 'linear-gradient(145deg, #0085ee 0%, rgb(114, 189, 247) 100%)',
      boxShadow:
        'rgba(52, 217, 217, 0.01) 0px 0.602187px 3.01094px 0px inset, rgba(52, 217, 217, 0.03) 0px 2.28853px 11.4427px 0px inset, rgba(52, 217, 217, 0.14) 0px 10px 50px 0px inset',
    },
    title: 'text-[var(--glow-bg)]',
    text: 'text-[var(--glow-bg)]',
    link: 'text-[var(--glow-bg)]',
  },
  white: { box: 'bg-white ring-2 ring-inset ring-[rgb(235,235,235)]', style: {}, title: 'text-black', text: 'text-[var(--glow-text)]', link: 'text-black' },
  gray: { box: 'bg-[var(--glow-bg)] ring-2 ring-inset ring-[rgb(235,235,235)]', style: {}, title: 'text-black', text: 'text-[var(--glow-text)]', link: 'text-black' },
}

function TextLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <a href="#" className={cn('group relative z-[2] inline-flex items-center gap-1.5', className)}>
      <span className="text-[15px] font-medium leading-[22.5px]">{children}</span>
      <span className="relative h-[22.5px] w-6 shrink-0 transition-transform duration-200 group-hover:translate-x-1">
        <Icon name="arrowRight" className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2" />
      </span>
    </a>
  )
}

function StickyCard({ c }: { c: CardDef }) {
  const bp = useBreakpoint()
  const t = THEMES[c.theme]
  const phoneScale = bp === 'desktop' ? 1 : 0.7
  const phoneLeft = bp === 'desktop' ? c.phonePos.desktop : bp === 'tablet' ? c.phonePos.tablet : -137
  const phoneTop = bp === 'desktop' ? 50 : bp === 'tablet' ? 36 : 3
  const pb = bp === 'mobile' ? 0 : bp === 'tablet' ? c.sticky.pbTablet : c.sticky.pb
  return (
    <section className="sticky z-[1] flex w-full justify-center" style={{ top: c.sticky.top, paddingBottom: pb }}>
      <div
        className={cn(
          'flex w-full flex-col gap-[31px] overflow-hidden rounded-[48px] min-[810px]:h-[490px] min-[810px]:flex-row min-[810px]:gap-8 min-[1200px]:h-[600px] min-[1200px]:gap-16',
          t.box,
        )}
        style={t.style}
      >
        {/* Texte */}
        <div className={cn('flex h-[430px] w-full flex-col justify-between p-8 min-[810px]:h-auto min-[810px]:w-[504px] min-[810px]:shrink-0 min-[810px]:p-10 min-[1200px]:w-[587px] min-[1200px]:p-[50px]', c.imageFirst && 'min-[810px]:order-2')}>
          <div className="flex flex-col items-start gap-3 overflow-hidden">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full py-[3px] pl-1.5 pr-2',
                c.theme === 'blue' ? 'bg-white text-[var(--glow-blue-dark)]' : 'bg-[var(--glow-blue)] text-[var(--glow-bg)]',
              )}
            >
              <Icon name={c.pill.icon} className="h-[18px] w-[18px]" />
              <span className="font-glow-display text-[14px] font-medium leading-[14px]">{c.pill.label}</span>
            </span>
            <h2 className={cn('font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]', t.title)}>
              {c.title}
            </h2>
            <p className={cn('text-[17px] leading-[25.5px] tracking-[-0.34px]', t.text)}>{c.text}</p>
            <ul className="flex flex-col py-1.5">
              {c.items.map((i) => (
                <CheckItem key={i} light={c.theme === 'blue'}>
                  {i}
                </CheckItem>
              ))}
            </ul>
          </div>
          <TextLink className={cn('hidden min-[1200px]:inline-flex', t.link)}>Start trading</TextLink>
        </div>
        {/* Téléphone */}
        <div className={cn('relative h-[366px] w-full shrink-0 overflow-hidden rounded-3xl min-[810px]:h-auto min-[810px]:w-[424px] min-[1200px]:w-[487px]', c.imageFirst && 'min-[810px]:order-1')}
          style={{ WebkitMaskImage: 'linear-gradient(0deg, transparent 2.25225%, #000 25.6757%)', maskImage: 'linear-gradient(0deg, transparent 2.25225%, #000 25.6757%)' }}
        >
          <div className="absolute z-[1]" style={{ left: phoneLeft, top: phoneTop, width: 410 * phoneScale }}>
            <Reveal replay amount={0} from={{ y: 150 }} transition={spring(0, 0.8)}>
              <PhoneFrame>
                <PhoneScreen tab={c.phone.tab} sections={c.phone.sections} showTotal={false} />
              </PhoneFrame>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Feature3() {
  return (
    <section id="features" className="flex scroll-mt-16 flex-col items-center gap-8 px-4 py-12 min-[810px]:gap-0 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-8 min-[810px]:gap-0">
        {CARDS.map((c) => (
          <StickyCard key={c.title} c={c} />
        ))}
      </div>
    </section>
  )
}
