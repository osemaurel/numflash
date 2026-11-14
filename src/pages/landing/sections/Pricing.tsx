import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Globe2, RotateCcw, Search, Smartphone, UserPlus, type LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { withRedirect } from '@/lib/redirect'
import { Reveal, spring } from '../../glow/primitives'
import { SH_PILL } from '../../glow/sections/Feature1'
import { useBreakpoint } from '../../glow/useBreakpoint'
import { MIN_NUMBER_PRICE_XOF, type CatalogService, type LandingFacts } from '../facts'
import { normalizeSearch, offerPrice, useServiceCountries, type CountryOffer } from '../buy'
import { NumberCard } from '../NumberCard'
import { Chevron, ServiceTile } from '../ui'

/* ------------------------------------------------------------------ */
/* Éléments communs aux deux étapes                                    */
/* ------------------------------------------------------------------ */

function StepHead({ n, title, done, aside }: { n: number; title: string; done: boolean; aside?: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'font-glow-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold leading-none transition-colors',
            done ? 'bg-[var(--glow-blue)] text-white' : 'bg-white text-[var(--glow-blue)]',
          )}
          style={{ boxShadow: SH_PILL }}
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : String(n).padStart(2, '0')}
        </span>
        <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] tracking-[-0.36px] text-black">{title}</h3>
      </div>
      {aside}
    </div>
  )
}

const panel = 'flex flex-col gap-4 rounded-3xl bg-[var(--glow-bg)] p-4 min-[810px]:h-[476px] min-[810px]:p-5'

/* ------------------------------------------------------------------ */
/* Étape 1 : l'application                                             */
/* ------------------------------------------------------------------ */

function ServiceGrid({ catalog, selected, onSelect }: { catalog: CatalogService[]; selected: string | null; onSelect: (slug: string) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-2 min-[1200px]:grid-cols-4">
      {catalog.map((s) => {
        const active = s.slug === selected
        return (
          <li key={s.slug}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(s.slug)}
              className={cn(
                'relative flex h-[86px] w-full flex-col items-center justify-center gap-2 rounded-2xl min-[1200px]:h-[124px] min-[1200px]:gap-3 bg-white px-1.5 transition-[box-shadow,transform] duration-200 active:scale-[0.97]',
                active
                  ? 'shadow-[0_8px_20px_-8px_rgba(0,133,238,0.45)] ring-2 ring-[var(--glow-blue)]'
                  : 'ring-1 ring-inset ring-[rgb(235,235,235)] hover:ring-[rgb(205,205,205)]',
              )}
            >
              <ServiceTile name={s.name} size={40} radius={11} />
              <span className="w-full truncate text-center text-[13px] font-medium leading-[15.6px] tracking-[-0.26px] text-black">{s.name}</span>
              {active ? (
                <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--glow-blue)]">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Étape 2 : le pays                                                   */
/* ------------------------------------------------------------------ */

function CountryRow({ c, price, active, onSelect }: { c: CountryOffer; price: number | null; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-3 rounded-[10px] border py-2 pl-2.5 pr-3 text-left transition-colors duration-150',
          active ? 'border-[rgb(0,157,255)] bg-[rgb(222,242,255)]' : 'border-[rgb(232,232,232)] bg-white hover:border-[rgb(205,205,205)]',
        )}
        style={{ boxShadow: SH_PILL }}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {active ? (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(51,136,255)]">
              <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
            </span>
          ) : (
            <span className="h-5 w-5 shrink-0 rounded-full border border-[rgb(214,214,214)] bg-white" />
          )}
          <span className="text-[20px] leading-none" aria-hidden>
            {c.flag}
          </span>
          <span className={cn('truncate text-[14px] leading-[21px] tracking-[-0.28px]', active ? 'font-semibold text-[rgb(26,14,18)]' : 'font-medium text-[rgb(48,48,48)]')}>{c.name}</span>
        </span>
        {price != null ? (
          <span className={cn('shrink-0 text-[14px] font-semibold leading-[21px] tracking-[-0.28px]', active ? 'text-[rgb(26,14,18)]' : 'text-[rgb(88,89,89)]')}>{formatFCFA(price)}</span>
        ) : (
          <span className="shrink-0 text-[13px] font-medium text-[rgb(55,158,45)]">En stock</span>
        )}
      </button>
    </li>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <li className="px-1 pb-0.5 pt-2 text-[13px] font-medium leading-[15.6px] tracking-[-0.26px] text-[var(--glow-gray)] first:pt-0">{children}</li>
}

function Placeholder({ icon: I, children, action }: { icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[rgb(226,226,226)] px-6 py-8 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white" style={{ boxShadow: SH_PILL }}>
        <I className="h-5 w-5 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
      </span>
      <p className="max-w-[300px] text-balance text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-gray)]">{children}</p>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Module complet                                                      */
/* ------------------------------------------------------------------ */

function BuyNumber({ facts }: { facts: LandingFacts }) {
  const [slug, setSlug] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const step2 = useRef<HTMLDivElement>(null)
  const state = useServiceCountries(slug, attempt)

  const service = facts.catalog.find((s) => s.slug === slug) ?? null
  const countries = useMemo(() => (state.status === 'ready' ? state.countries : []), [state])
  const selected = countries.find((c) => c.code === code) ?? null

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    return q ? countries.filter((c) => normalizeSearch(c.name).includes(q)) : countries
  }, [countries, query])
  const featured = filtered.filter((c) => c.featured)
  const others = filtered.filter((c) => !c.featured)

  const priceOf = (c: CountryOffer) => (service && facts.settings ? offerPrice(c, service, facts.settings) : null)
  const price = selected ? (priceOf(selected) ?? MIN_NUMBER_PRICE_XOF) : MIN_NUMBER_PRICE_XOF
  const target = service && selected ? `/service/${service.slug}?pays=${encodeURIComponent(selected.code)}` : null

  function chooseService(next: string) {
    if (next === slug) return
    setSlug(next)
    setCode(null)
    setQuery('')
    // Sur mobile et tablette, l'étape 2 est sous la grille : on l'amène à l'écran.
    if (window.matchMedia('(max-width: 1199px)').matches) {
      requestAnimationFrame(() => step2.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  let list: ReactNode
  if (!service) {
    list = <Placeholder icon={Globe2}>Sélectionnez d’abord une application : les pays où elle est disponible s’afficheront ici.</Placeholder>
  } else if (state.status === 'error') {
    list = (
      <Placeholder
        icon={Globe2}
        action={
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="rounded-full bg-white px-4 py-2 text-[14px] font-medium text-[var(--glow-blue-dark)] ring-1 ring-inset ring-[rgb(217,217,217)] hover:bg-[var(--glow-bg)]">
            Réessayer
          </button>
        }
      >
        Impossible de charger les pays pour le moment. Vérifiez votre connexion.
      </Placeholder>
    )
  } else if (state.status !== 'ready') {
    list = (
      <ul className="flex flex-col gap-2" aria-label="Chargement des pays">
        {Array.from({ length: 7 }).map((_, i) => (
          <li key={i} className="h-11 animate-pulse rounded-[10px] bg-white" style={{ opacity: 1 - i * 0.11 }} />
        ))}
      </ul>
    )
  } else if (countries.length === 0) {
    list = <Placeholder icon={Globe2}>Aucun numéro {service.name} en stock pour le moment. Le stock est actualisé toutes les 10 minutes.</Placeholder>
  } else {
    list = (
      <>
        <label className="relative block shrink-0">
          <span className="sr-only">Rechercher un pays</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--glow-gray)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pays"
            autoComplete="off"
            className="h-11 w-full rounded-[10px] bg-white pl-9 pr-3 text-[16px] tracking-[-0.3px] text-black outline-none ring-1 ring-inset ring-[rgb(232,232,232)] transition-shadow placeholder:text-[rgb(150,150,150)] focus:ring-2 focus:ring-[var(--glow-blue)] min-[810px]:text-[14px]"
          />
        </label>
        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-[15px] text-[var(--glow-gray)]">Aucun pays ne correspond à « {query.trim()} ».</p>
        ) : (
          <ul className="-mx-1 flex max-h-[344px] flex-col gap-2 overflow-y-auto overscroll-contain px-1 pb-1 [scrollbar-width:thin] min-[810px]:max-h-none min-[810px]:min-h-0 min-[810px]:flex-1">
            {featured.length > 0 ? <GroupLabel>Les plus demandés</GroupLabel> : null}
            {featured.map((c) => (
              <CountryRow key={c.code} c={c} price={priceOf(c)} active={c.code === code} onSelect={() => setCode(c.code)} />
            ))}
            {others.length > 0 && featured.length > 0 ? <GroupLabel>Tous les autres pays</GroupLabel> : null}
            {others.map((c) => (
              <CountryRow key={c.code} c={c} price={priceOf(c)} active={c.code === code} onSelect={() => setCode(c.code)} />
            ))}
          </ul>
        )}
      </>
    )
  }

  const pending = !service ? 'Choisissez une application' : 'Choisissez un pays'

  return (
    <Reveal from={{ y: 80 }} transition={spring(0, 0.5)} amount={0.15} className="w-full rounded-[32px] bg-white p-2 ring-2 ring-inset ring-[rgb(235,235,235)] min-[810px]:p-3">
      <div className="grid grid-cols-1 gap-2 min-[810px]:grid-cols-2 min-[810px]:gap-3">
        <div className={panel}>
          <StepHead n={1} title="Choisissez l’application" done={Boolean(service)} aside={<span className="text-[13px] font-medium text-[var(--glow-gray)]">{facts.catalog.length} services</span>} />
          <ServiceGrid catalog={facts.catalog} selected={slug} onSelect={chooseService} />
        </div>
        <div ref={step2} className={cn(panel, 'scroll-mt-20')}>
          <StepHead
            n={2}
            title="Choisissez le pays"
            done={Boolean(selected)}
            aside={state.status === 'ready' && countries.length > 0 ? <span className="text-[13px] font-medium text-[var(--glow-gray)]">{countries.length} pays</span> : null}
          />
          {list}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-2 pb-2 pt-4 min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:gap-6 min-[810px]:px-3 min-[810px]:pb-1 min-[810px]:pt-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex min-h-7 items-center gap-2 text-[15px] font-medium leading-[22.5px] text-black">
            {service ? (
              <>
                <ServiceTile name={service.name} size={24} radius={7} />
                <span className="truncate">{service.name}</span>
                {selected ? (
                  <>
                    <span className="text-[var(--glow-gray)]">·</span>
                    <span aria-hidden>{selected.flag}</span>
                    <span className="truncate">{selected.name}</span>
                  </>
                ) : null}
              </>
            ) : (
              <span className="text-[var(--glow-gray)]">Aucune sélection pour l’instant</span>
            )}
          </p>
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
