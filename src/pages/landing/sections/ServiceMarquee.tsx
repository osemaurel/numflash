import type { LandingFacts } from '../facts'
import { ServiceTile } from '../ui'

/** Bandeau défilant des services proposés (liste réelle du catalogue), à 30 px/s comme le modèle. */
function Set({ names, hidden = false }: { names: string[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-20 pr-20" aria-hidden={hidden || undefined}>
      {names.map((n) => (
        <li key={n} className="flex shrink-0 items-center gap-2.5">
          <ServiceTile name={n} size={30} radius={9} />
          <span className="font-glow-display whitespace-nowrap text-[24px] font-semibold leading-[30px] tracking-[-0.5px] text-black">{n}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ServiceMarquee({ facts }: { facts: LandingFacts }) {
  // Largeur approximative d'une série : sert à garder la vitesse du modèle (30 px/s).
  const setWidth = facts.services.reduce((w, n) => w + 40 + n.length * 13 + 80, 0)
  return (
    <figure className="flex flex-col items-center py-12 min-[810px]:px-8 min-[1200px]:py-24">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-6 overflow-hidden">
        <p className="font-glow-display px-4 text-center text-[20px] font-medium leading-[24px] text-[var(--glow-gray)]">
          Disponible pour <span className="text-[var(--glow-blue)]">vos applications</span> préférées
        </p>
        <div className="flex h-[71px] w-full items-center overflow-hidden opacity-60 [filter:contrast(0)_grayscale(1)]">
          <div className="glow-marquee flex w-max" style={{ ['--glow-marquee-duration' as string]: `${Math.round(setWidth / 30)}s` }}>
            <Set names={facts.services} />
            <Set names={facts.services} hidden />
          </div>
        </div>
      </div>
    </figure>
  )
}
