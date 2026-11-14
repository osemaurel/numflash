import { Img } from '../../glow/primitives'

interface Card {
  title: string
  service: string
  img: string
  top: string
  bottom: string
  label: string
  fadeImage: boolean
  desktop: { x: number; y: number }
  tablet: { x: number; y: number } | null
}

/** Services actuellement proposés, sur les visuels et dégradés du modèle. */
const CARDS: Card[] = [
  { title: 'Ouvrez un nouveau compte TikTok', service: 'TikTok', img: 'partner-tshirt.webp', top: 'rgb(255, 92, 105)', bottom: 'rgb(0, 0, 0)', label: '#fff', fadeImage: false, desktop: { x: 0, y: 0 }, tablet: { x: 0, y: 210 } },
  { title: 'Créez votre compte Uber', service: 'Uber', img: 'partner-camping.webp', top: 'rgba(254, 152, 0, 0.8)', bottom: 'transparent', label: '#fff', fadeImage: false, desktop: { x: 0, y: 274 }, tablet: { x: 0, y: 480 } },
  { title: 'Vérifiez votre compte Amazon', service: 'Amazon', img: 'partner-delivery.webp', top: 'rgba(77, 20, 140, 0.8)', bottom: 'rgb(239, 224, 255)', label: 'rgb(77, 20, 140)', fadeImage: true, desktop: { x: 232, y: 238 }, tablet: { x: 268, y: 264 } },
  { title: 'Un WhatsApp sans votre numéro', service: 'WhatsApp', img: 'partner-tshirt.webp', top: 'rgb(8, 166, 56)', bottom: 'rgb(0, 0, 0)', label: 'rgb(110, 231, 140)', fadeImage: false, desktop: { x: 464, y: 337 }, tablet: { x: 263, y: 534 } },
  { title: 'Gérez plusieurs comptes Instagram', service: 'Instagram', img: 'partner-perfume.webp', top: 'rgb(217, 137, 16)', bottom: 'rgba(255, 255, 255, 0.7)', label: 'rgb(217, 137, 16)', fadeImage: true, desktop: { x: 695, y: 238 }, tablet: null },
  { title: 'Restez discret sur Tinder', service: 'Tinder', img: 'partner-lumecosta.webp', top: 'rgba(0, 69, 38, 0.8)', bottom: 'rgba(255, 255, 255, 0.7)', label: 'rgb(0, 69, 38)', fadeImage: true, desktop: { x: 928, y: 0 }, tablet: { x: 536, y: 210 } },
  { title: 'Rejoignez vos serveurs Discord', service: 'Discord', img: 'partner-popcorn.webp', top: 'rgb(92, 92, 92)', bottom: 'rgb(166, 243, 255)', label: '#111', fadeImage: true, desktop: { x: 928, y: 274 }, tablet: { x: 536, y: 480 } },
]

const fade = (g: string) => ({ WebkitMaskImage: g, maskImage: g })

function ServiceCard({ c }: { c: Card }) {
  return (
    <div className="relative h-[250px] w-[210px] overflow-hidden rounded-[20px] bg-white">
      <div className="absolute inset-0" style={c.fadeImage ? fade('linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0%, #000 56%)') : undefined}>
        <Img src={c.img} className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0" style={{ background: c.top, ...fade('linear-gradient(0deg, rgba(0, 0, 0, 0.2) 35%, #000 100%)') }} />
      <div className="absolute inset-0" style={{ background: c.bottom, ...fade('linear-gradient(180deg, transparent 55%, #000 100%)') }} />
      <p className="font-glow-display absolute left-[18px] top-[204px] text-[19px] font-semibold leading-6 tracking-[-0.4px]" style={{ color: c.label }}>
        {c.service}
      </p>
      <p className="font-glow-geist absolute left-[18px] top-5 w-[182px] text-balance text-[20px] font-semibold leading-[24px] tracking-[-0.6px] text-[var(--glow-bg)]">{c.title}</p>
    </div>
  )
}

export default function Services() {
  return (
    <section className="hidden flex-col items-center bg-white px-8 pb-24 pt-12 min-[810px]:flex">
      <div className="relative h-[784px] w-full max-w-[1138px] min-[1200px]:h-[640px]">
        <div className="absolute left-1/2 top-0 z-[1] flex w-[568px] -translate-x-1/2 flex-col items-center gap-[18px] overflow-hidden text-center">
          <h2 className="font-glow-display text-balance text-[36px] font-medium leading-[39.6px] tracking-[-1.44px] text-black min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Vérifiez vos comptes
            <br />
            sur <span className="text-[var(--glow-blue)]">vos applications</span>
          </h2>
          <p className="max-w-[466px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)]">
            Un numéro dédié pour chaque inscription : vos contacts personnels restent privés, les plateformes ne voient que le numéro virtuel.
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-[53px] hidden overflow-clip min-[1200px]:block">
          {CARDS.map((c) => (
            <div key={c.service} className="absolute" style={{ left: c.desktop.x, top: c.desktop.y }}>
              <ServiceCard c={c} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 min-[1200px]:hidden">
          {CARDS.filter((c) => c.tablet).map((c) => (
            <div key={c.service} className="absolute" style={{ left: c.tablet!.x, top: c.tablet!.y }}>
              <ServiceCard c={c} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
