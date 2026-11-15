import { useEffect, useMemo, useState } from 'react'
import { Check, MessageSquareText, Receipt, ShoppingBag } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { relativeTime } from '@/lib/orders'
import { useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { ACTIVE_STATUSES, useLastCodes, useOrders } from '@/hooks/useOrders'
import { usePricingSettings } from '@/hooks/usePricingSettings'
import { useProfile } from '@/hooks/useProfile'
import { useServices } from '@/hooks/useServices'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'
import { offerPrice, useServiceCountries } from '../landing/buy'
import { ServiceTile } from '../landing/ui'
import { PurchaseButton, toCatalog } from './purchase'
import { BalanceCard, Card, EmptyState, LoadError, OrderCard, PageHeader, SeeAll, SkeletonRows, TransactionList, displayName, firstName, secondaryButton } from './ui'
import { Link } from 'react-router-dom'

/* ------------------------------------------------------------------ */
/* Achat rapide                                                        */
/* ------------------------------------------------------------------ */

function QuickBuy({ balance }: { balance: number | null }) {
  const { services, loading } = useServices()
  const { settings } = usePricingSettings()
  const catalog = useMemo(() => toCatalog(services), [services])
  const [slug, setSlug] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const current = slug ?? catalog[0]?.slug ?? null
  const state = useServiceCountries(current, 0)
  const service = catalog.find((s) => s.slug === current) ?? null

  // Les pays les plus demandés en tête (ordre du module d'achat), quatre au plus.
  const countries = useMemo(() => (state.status === 'ready' ? state.countries.slice(0, 4) : []), [state])
  const total = state.status === 'ready' ? state.countries.length : 0
  useEffect(() => {
    if (countries.length > 0 && !countries.some((c) => c.code === code)) setCode(countries[0].code)
  }, [countries, code])
  const country = countries.find((c) => c.code === code) ?? null
  const price = service && country && settings ? offerPrice(country, service, settings) : null

  return (
    <Card title="Acheter un numéro" aside={<SeeAll to="/acheter">Tous les services</SeeAll>}>
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--glow-gray)]">1. Application</span>
        {loading ? (
          <div className="h-[78px] animate-pulse rounded-2xl bg-[var(--glow-bg)]" />
        ) : (
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] min-[810px]:mx-0 min-[810px]:flex-wrap min-[810px]:overflow-visible min-[810px]:px-0">
            {catalog.map((s) => {
              const on = s.slug === current
              return (
                <li key={s.slug} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSlug(s.slug)
                      setCode(null)
                    }}
                    className={cn(
                      'flex h-[78px] w-[78px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-white transition-shadow',
                      on ? 'shadow-[0_8px_20px_-8px_rgba(0,133,238,0.45)] ring-2 ring-[var(--glow-blue)]' : 'ring-1 ring-inset ring-[rgb(232,232,232)] hover:ring-[rgb(205,205,205)]',
                    )}
                  >
                    <ServiceTile name={s.name} size={34} radius={10} />
                    <span className="w-full truncate px-1 text-center text-[11px] font-medium leading-[13px] text-black">{s.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-[var(--glow-gray)]">2. Pays</span>
          {current && total > 0 ? <SeeAll to={`/acheter?service=${encodeURIComponent(current)}`}>Voir les {total} pays</SeeAll> : null}
        </div>
        {state.status === 'error' ? (
          <LoadError>Impossible de charger les pays pour le moment. Vérifiez votre connexion.</LoadError>
        ) : state.status !== 'ready' ? (
          <div className="grid grid-cols-1 gap-2 min-[810px]:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-[10px] bg-[var(--glow-bg)]" />
            ))}
          </div>
        ) : countries.length === 0 ? (
          <LoadError>Aucun numéro {service?.name} en stock pour le moment. Le stock est actualisé toutes les 10 minutes.</LoadError>
        ) : (
          <ul className="grid grid-cols-1 gap-2 min-[810px]:grid-cols-2">
            {countries.map((c) => {
              const on = c.code === code
              const p = service && settings ? offerPrice(c, service, settings) : null
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCode(c.code)}
                    className={cn(
                      'flex h-11 w-full items-center justify-between gap-3 rounded-[10px] border py-2 pl-2.5 pr-3 transition-colors',
                      on ? 'border-[rgb(0,157,255)] bg-[rgb(222,242,255)]' : 'border-[rgb(232,232,232)] bg-white hover:border-[rgb(205,205,205)]',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {on ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(51,136,255)]">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden />
                        </span>
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border border-[rgb(214,214,214)] bg-white" />
                      )}
                      <span className="text-[20px] leading-none" aria-hidden>
                        {c.flag}
                      </span>
                      <span className={cn('truncate text-[14px] tracking-[-0.28px]', on ? 'font-semibold text-black' : 'font-medium text-[rgb(48,48,48)]')}>{c.name}</span>
                    </span>
                    {p !== null ? <span className={cn('shrink-0 text-[14px] font-semibold', on ? 'text-black' : 'text-[rgb(88,89,89)]')}>{formatFCFA(p)}</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-[var(--glow-line)] pt-4 min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          {service ? (
            <span className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-black">
              <ServiceTile name={service.name} size={22} radius={6} />
              <span className="truncate">
                {service.name}
                {country ? ` · ${country.flag} ${country.name}` : ''}
              </span>
            </span>
          ) : null}
          {price !== null && balance !== null ? (
            <span className="text-[13px] text-[var(--glow-gray)]">{balance >= price ? `Solde après l’achat : ${formatFCFA(balance - price)}` : `Solde actuel : ${formatFCFA(balance)}`}</span>
          ) : null}
        </div>
        <PurchaseButton service={service} country={country} price={price} balance={balance} />
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { balance } = useBalance()
  const summary = useWalletSummary()
  const active = useOrders(ACTIVE_STATUSES, 5)
  const codes = useLastCodes(3)
  const history = useWalletTransactions(4)
  const name = displayName(profile?.full_name, user?.email)

  useEffect(() => {
    const prev = document.title
    document.title = 'Accueil — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader title="Bonjour, " accent={firstName(name)} subtitle="Voici l’essentiel de votre compte." />

      <div className="grid grid-cols-1 gap-5 min-[810px]:gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_380px] min-[1200px]:items-start">
        <div className="flex min-w-0 flex-col gap-5 min-[810px]:gap-6">
          <BalanceCard balance={balance} summary={summary} />

          <Card
            title="Numéros en cours"
            aside={
              <span className="flex items-center gap-3">
                {active.orders.length > 0 ? <span className="rounded-full bg-[var(--glow-blue)] px-2 py-0.5 text-[12px] font-semibold text-white">{active.orders.length}</span> : null}
                <SeeAll to="/numeros" />
              </span>
            }
          >
            {active.loading ? (
              <SkeletonRows count={2} height={120} />
            ) : active.error ? (
              <LoadError />
            ) : active.orders.length === 0 ? (
              <EmptyState
                icon={MessageSquareText}
                title="Aucun numéro en cours"
                text="Achetez un numéro : il s’affichera ici avec le code reçu par SMS, en direct."
                action={
                  <Link to="/acheter" className={secondaryButton}>
                    <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                    Acheter un numéro
                  </Link>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {active.orders.map((o) => (
                  <OrderCard key={o.id} order={o} actions />
                ))}
              </div>
            )}
          </Card>

          <QuickBuy balance={balance} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 min-[810px]:gap-6">
          <Card title="Derniers codes reçus" aside={<SeeAll to="/numeros?onglet=termines" />}>
            {codes.loading ? (
              <SkeletonRows count={3} height={44} />
            ) : codes.error ? (
              <LoadError />
            ) : codes.codes.length === 0 ? (
              <p className="text-[14px] leading-[20px] text-[var(--glow-gray)]">Vos codes de vérification apparaîtront ici.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--glow-line)]">
                {codes.codes.map((c) => {
                  const service = c.orders?.services?.name_fr ?? c.orders?.service_slug ?? 'Service'
                  return (
                    <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <ServiceTile name={service} size={38} radius={10} />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-medium leading-[19px] text-black">{service}</span>
                        <span className="truncate text-[13px] leading-[17px] text-[var(--glow-gray)]">
                          {c.orders?.countries?.flag_emoji} {c.orders?.countries?.name_fr} · {relativeTime(c.received_at)}
                        </span>
                      </div>
                      <span className="font-glow-mono text-[16px] font-bold tracking-[0.5px] text-black">{c.code ?? '—'}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card title="Historique" aside={<SeeAll to="/wallet" />}>
            {history.loading ? (
              <SkeletonRows count={4} height={44} />
            ) : history.error ? (
              <LoadError />
            ) : history.transactions.length === 0 ? (
              <EmptyState icon={Receipt} title="Aucune opération" text="Vos recharges, achats et remboursements apparaîtront ici." />
            ) : (
              <TransactionList transactions={history.transactions} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
