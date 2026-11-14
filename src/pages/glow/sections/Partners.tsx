import { Img } from '../primitives'

interface Partner {
  title: string
  img: string
  logo: string
  top: string
  bottom: string
  fadeImage: boolean
  desktop: { x: number; y: number }
  tablet: { x: number; y: number } | null
}

const PARTNERS: Partner[] = [
  { title: 'Get 3% cashback at Vectorgrid', img: 'partner-tshirt.webp', logo: 'logo-vectorgrid.webp', top: 'rgb(255, 92, 105)', bottom: 'rgb(0, 0, 0)', fadeImage: false, desktop: { x: 0, y: 0 }, tablet: { x: 0, y: 210 } },
  { title: 'Save 10$ at checkout', img: 'partner-camping.webp', logo: 'logo-solarterm.webp', top: 'rgba(254, 152, 0, 0.8)', bottom: 'transparent', fadeImage: false, desktop: { x: 0, y: 274 }, tablet: { x: 0, y: 480 } },
  { title: 'Shop now, pay in 4', img: 'partner-delivery.webp', logo: 'logo-elvoflip.webp', top: 'rgba(77, 20, 140, 0.8)', bottom: 'rgb(239, 224, 255)', fadeImage: true, desktop: { x: 232, y: 238 }, tablet: { x: 268, y: 264 } },
  { title: 'Grab 15% Off Instantly', img: 'partner-tshirt.webp', logo: 'logo-booptweak.webp', top: 'rgb(8, 166, 56)', bottom: 'rgb(0, 0, 0)', fadeImage: false, desktop: { x: 464, y: 337 }, tablet: { x: 263, y: 534 } },
  { title: 'Claim 5% cashback now', img: 'partner-perfume.webp', logo: 'logo-auroblip.webp', top: 'rgb(217, 137, 16)', bottom: 'rgba(255, 255, 255, 0.7)', fadeImage: true, desktop: { x: 695, y: 238 }, tablet: null },
  { title: 'Get 3% cashback at Lumecosta', img: 'partner-lumecosta.webp', logo: 'logo-noirgen.webp', top: 'rgba(0, 69, 38, 0.8)', bottom: 'rgba(255, 255, 255, 0.7)', fadeImage: true, desktop: { x: 928, y: 0 }, tablet: { x: 536, y: 210 } },
  { title: 'Save 20$ at checkout', img: 'partner-popcorn.webp', logo: 'logo-fizzylens.webp', top: 'rgb(92, 92, 92)', bottom: 'rgb(166, 243, 255)', fadeImage: true, desktop: { x: 928, y: 274 }, tablet: { x: 536, y: 480 } },
]

const fade = (g: string) => ({ WebkitMaskImage: g, maskImage: g })

function PartnerCard({ p }: { p: Partner }) {
  return (
    <div className="relative h-[250px] w-[210px] overflow-hidden rounded-[20px] bg-white">
      <div className="absolute inset-0" style={p.fadeImage ? fade('linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0%, #000 56%)') : undefined}>
        <Img src={p.img} className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0" style={{ background: p.top, ...fade('linear-gradient(0deg, rgba(0, 0, 0, 0.2) 35%, #000 100%)') }} />
      <div className="absolute inset-0" style={{ background: p.bottom, ...fade('linear-gradient(180deg, transparent 55%, #000 100%)') }} />
      <Img src={p.logo} alt="" className="absolute left-[18px] top-[204px] h-6 w-[105px] object-contain object-left" />
      <p className="font-glow-geist absolute left-[18px] top-5 w-[182px] text-balance text-[20px] font-semibold leading-[24px] tracking-[-0.6px] text-[var(--glow-bg)]">{p.title}</p>
    </div>
  )
}

export default function Partners() {
  return (
    <section className="hidden flex-col items-center bg-white px-8 pb-24 pt-12 min-[810px]:flex">
      <div className="relative h-[784px] w-full max-w-[1138px] min-[1200px]:h-[640px]">
        <div className="absolute left-1/2 top-0 z-[1] flex w-[568px] -translate-x-1/2 flex-col items-center gap-[18px] overflow-hidden text-center">
          <h2 className="font-glow-display text-balance text-[36px] font-medium leading-[39.6px] tracking-[-1.44px] text-black min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            We partnered with
            <br />
            <span className="text-[var(--glow-blue)]">20+ brands</span> you love
          </h2>
          <p className="max-w-[466px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)]">
            We’ve partnered with your favorite brands to bring you more flexibility at checkout. With Glow, you can shop now and pay later at stores you already trust.
          </p>
        </div>
        {/* Bureau */}
        <div className="absolute inset-x-0 bottom-0 top-[53px] hidden overflow-clip min-[1200px]:block">
          {PARTNERS.map((p) => (
            <div key={p.title} className="absolute" style={{ left: p.desktop.x, top: p.desktop.y }}>
              <PartnerCard p={p} />
            </div>
          ))}
        </div>
        {/* Tablette */}
        <div className="absolute inset-0 min-[1200px]:hidden">
          {PARTNERS.filter((p) => p.tablet).map((p) => (
            <div key={p.title} className="absolute" style={{ left: p.tablet!.x, top: p.tablet!.y }}>
              <PartnerCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
