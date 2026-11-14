import { Link } from 'react-router-dom'
import { RotateCcw, Smartphone, UserPlus, type LucideIcon } from 'lucide-react'
import { formatFCFA } from '@/lib/utils'
import { purchasePath, withRedirect } from '@/lib/redirect'
import { Reveal, spring } from '../../glow/primitives'
import { useBreakpoint } from '../../glow/useBreakpoint'
import { MIN_NUMBER_PRICE_XOF, type LandingFacts } from '../facts'
import { BuyPicker, SelectionSummary } from '../BuyPicker'
import { NumberCard } from '../NumberCard'
import { Chevron } from '../ui'

/* ------------------------------------------------------------------ */
/* Module complet : sélection puis connexion                           */
/* ------------------------------------------------------------------ */

function BuyNumber({ facts }: { facts: LandingFacts }) {
  return (
    <Reveal from={{ y: 80 }} transition={spring(0, 0.5)} amount={0.15} className="w-full rounded-[32px] bg-white p-2 ring-2 ring-inset ring-[rgb(235,235,235)] min-[810px]:p-3">
      <BuyPicker
        catalog={facts.catalog}
        settings={facts.settings}
        footer={({ service, country: selected, price: picked }) => {
          const price = picked ?? MIN_NUMBER_PRICE_XOF
          const target = service && selected ? purchasePath(service.slug, selected.code) : null
          const pending = !service ? 'Choisissez une application' : 'Choisissez un pays'
          return (
            <div className="flex flex-col gap-3 px-2 pb-2 pt-4 min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:gap-6 min-[810px]:px-3 min-[810px]:pb-1 min-[810px]:pt-4">
              <div className="flex min-w-0 flex-col gap-1">
                <SelectionSummary service={service} country={selected} />
                <p className="text-[14px] leading-[21px] tracking-[-0.28px] text-[var(--glow-gray)]">Numéro à usage unique, remboursé si le SMS n’arrive pas.</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 min-[810px]:items-end">
                {target ? (
                  <Link
                    to={withRedirect('/connexion', target)}
                    className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--glow-blue)] px-4 py-2 text-white transition-colors duration-200 hover:bg-[var(--glow-blue-dark)] min-[810px]:px-5"
                  >
                    <span className="text-balance text-center text-[15px] font-medium leading-[19.2px] tracking-[-0.2px] min-[810px]:text-[16px] min-[810px]:tracking-normal">Acheter ce numéro à partir de {formatFCFA(price)}</span>
                    <Chevron />
                  </Link>
                ) : (
                  <span aria-disabled="true" className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-lg bg-[rgb(232,232,232)] px-5 text-[16px] font-medium leading-[19.2px] text-[rgb(140,140,140)]">
                    {pending}
                  </span>
                )}
                <p className="text-center text-[13px] leading-[19.5px] text-[var(--glow-gray)] min-[810px]:text-right">
                  Pas encore de compte ?{' '}
                  <Link to={withRedirect('/inscription', target)} className="font-medium text-[var(--glow-blue-dark)] hover:underline">
                    Inscription gratuite
                  </Link>
                </p>
              </div>
            </div>
          )
        }}
      />
    </Reveal>
  )
}

const PROMISES: { icon: LucideIcon; label: string }[] = [
  { icon: UserPlus, label: 'Inscription gratuite, sans abonnement' },
  { icon: RotateCcw, label: 'Remboursé si le SMS n’arrive pas' },
  { icon: Smartphone, label: 'Payé depuis votre solde, rechargé en Mobile Money' },
]

export default function Pricing({ facts }: { facts: LandingFacts }) {
  const bp = useBreakpoint()
  const card = bp === 'desktop' ? { cx: 936.5, cy: 81.5, s: 1 } : bp === 'tablet' ? { cx: 822, cy: 82, s: 0.8 } : { cx: 221.5, cy: -59, s: 0.6 }
  return (
    <div id="tarifs" className="flex scroll-mt-16 flex-col items-center px-4 pb-12 pt-24 min-[1200px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-10 min-[810px]:gap-16">
        <div className="relative flex w-full flex-col items-start gap-3">
          <h3 className="font-glow-geist text-[16px] font-medium leading-[16px] tracking-[-0.48px] text-[var(--glow-blue)]">Acheter un numéro</h3>
          <h2 className="font-glow-display max-w-[600px] text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:max-w-[400px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:max-w-[600px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Votre numéro en <span className="text-[var(--glow-blue)]">deux étapes</span>
          </h2>
          <div className="pointer-events-none absolute z-[1]" style={{ left: card.cx - 202, top: card.cy - 114.5, transform: `rotate(9deg) scale(${card.s})` }}>
            <Reveal from={{ scale: 0.5 }} transition={spring(0.2, 0.4)} amount={0.5}>
              <NumberCard tone="blue" />
            </Reveal>
          </div>
          <p className="max-w-[600px] text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-[1199px]:max-w-[400px]">
            Choisissez l’application à vérifier, puis le pays du numéro : les pays disponibles et leur prix s’affichent aussitôt. Numéros à partir de {formatFCFA(MIN_NUMBER_PRICE_XOF)}.
          </p>
        </div>
        <div className="flex w-full flex-col gap-5">
          <BuyNumber facts={facts} />
          <ul className="flex flex-col gap-2.5 px-2 min-[810px]:flex-row min-[810px]:flex-wrap min-[810px]:justify-center min-[810px]:gap-x-8">
            {PROMISES.map((p) => (
              <li key={p.label} className="flex items-center gap-1.5">
                <p.icon className="h-5 w-5 shrink-0 text-[var(--glow-text)]" strokeWidth={1.5} aria-hidden />
                <span className="text-[14px] font-medium leading-[21px] tracking-[-0.28px] text-[var(--glow-text)] opacity-95">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
