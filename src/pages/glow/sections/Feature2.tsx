import { CardStack } from '../GlowCard'
import { Icon } from '../primitives'
import { scaledBox, useBreakpoint } from '../useBreakpoint'

const ITEMS = [
  { title: 'Glow Card', text: 'Simple, reliable, everyday spending solution.', color: 'var(--glow-blue)' },
  { title: 'Glow Gold', text: 'Premium perks, enhanced rewards, exclusive.', color: 'var(--glow-gold)' },
  { title: 'Glow Black', text: 'Business-focused, premium features, professional.', color: 'var(--glow-black)' },
]

export default function Feature2() {
  const bp = useBreakpoint()
  const box = scaledBox(506, 382, bp === 'desktop' ? 1 : bp === 'tablet' ? 0.7 : 0.6)
  return (
    <section className="flex flex-col items-center bg-white px-4 py-12 min-[1200px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 overflow-hidden min-[810px]:flex-row min-[1200px]:gap-16">
        <div className="flex h-[229px] w-full items-center justify-center overflow-clip min-[810px]:h-[382px] min-[810px]:flex-1 min-[1200px]:justify-start">
          <div style={box.outer}>
            <div style={box.inner}>
              <CardStack />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col items-start justify-center gap-3 overflow-hidden min-[810px]:flex-1">
          <h2 className="font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            There is a Glow for every need
          </h2>
          <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)]">
            Glow offers consumers unparalleled convenience with flexible payment options that fit any budget.
          </p>
          <ul className="flex w-full flex-col gap-3 overflow-hidden pt-2.5">
            {ITEMS.map((i) => (
              <li key={i.title} className="flex flex-col items-start overflow-hidden">
                <div className="flex items-center gap-1.5 rounded-[9px]">
                  <Icon name="glowLogo" className="h-7 w-7" style={{ color: i.color }} />
                  <span className="text-[15px] font-medium leading-[22.5px] text-black">{i.title}</span>
                </div>
                <p className="pl-[34px] text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-80">{i.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
