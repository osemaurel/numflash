import { SvgImg } from '../primitives'

const LOGOS = [
  { name: 'logoipsum1', w: 166, h: 30 },
  { name: 'logoipsum2', w: 152, h: 30 },
  { name: 'logoipsum3', w: 134, h: 27 },
  { name: 'logoipsum4', w: 151, h: 30 },
  { name: 'logoipsum5', w: 152, h: 28 },
  { name: 'logoipsum6', w: 30, h: 30, label: true },
  { name: 'logoipsum7', w: 124, h: 30 },
]

// Vitesse du modèle : 30 px/s ; une série fait 1 612 px (logos + 7 × 80 px d'écart).
const SET_WIDTH = LOGOS.reduce((s, l) => s + (l.label ? 172 : l.w), 0) + LOGOS.length * 80
const DURATION = SET_WIDTH / 30

function LogoSet({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-20 pr-20" aria-hidden={hidden || undefined}>
      {LOGOS.map((l) => (
        <li key={l.name} className="flex shrink-0 items-center">
          {l.label ? (
            <figure className="flex items-center gap-3">
              <SvgImg name={l.name} className="h-[30px] w-[30px]" />
              <span className="font-glow-panchang text-[14px] font-bold leading-[16.8px] text-[rgb(255,153,0)]">LOGOIPSUM</span>
            </figure>
          ) : (
            <SvgImg name={l.name} alt="Logoipsum" style={{ width: l.w, height: l.h }} />
          )}
        </li>
      ))}
    </ul>
  )
}

export default function Logos() {
  return (
    <figure className="flex flex-col items-center py-12 min-[810px]:px-8 min-[1200px]:py-24">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-6 overflow-hidden">
        <p className="font-glow-display text-center text-[20px] font-medium leading-[24px] text-[var(--glow-gray)]">
          Trusted by <span className="text-[var(--glow-blue)]">100+</span> businesses worldwide
        </p>
        <div className="flex h-[71px] w-full items-center overflow-hidden opacity-60 [filter:contrast(0)_grayscale(1)]">
          <div className="glow-marquee flex w-max" style={{ ['--glow-marquee-duration' as string]: `${DURATION}s` }}>
            <LogoSet />
            <LogoSet hidden />
          </div>
        </div>
      </div>
    </figure>
  )
}
