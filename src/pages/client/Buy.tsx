import { useEffect, useMemo } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { formatFCFA } from '@/lib/utils'
import { purchasePath } from '@/lib/redirect'
import { useBalance } from '@/hooks/useBalance'
import { usePricingSettings } from '@/hooks/usePricingSettings'
import { useServices } from '@/hooks/useServices'
import { BuyPicker, SelectionSummary } from '../landing/BuyPicker'
import { PurchaseButton, toCatalog } from './purchase'
import { LoadError, PageHeader } from './ui'

/** Page « Acheter un numéro » : application, pays, puis achat avec le solde. */
export default function Buy() {
  const [params] = useSearchParams()
  const { services, loading } = useServices()
  const { settings } = usePricingSettings()
  const { balance } = useBalance()
  const catalog = useMemo(() => toCatalog(services), [services])

  useEffect(() => {
    const prev = document.title
    document.title = 'Acheter un numéro — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader title="Acheter un " accent="numéro" subtitle="Choisissez l’application à vérifier, puis le pays du numéro. Le prix est débité de votre solde." />
      <div className="w-full rounded-[32px] bg-white p-2 ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:p-3">
        {loading ? (
          <div className="h-[476px] animate-pulse rounded-3xl bg-[var(--glow-bg)]" />
        ) : catalog.length === 0 ? (
          <div className="p-4">
            <LoadError>Le catalogue n’est pas disponible pour le moment. Réessayez dans quelques minutes.</LoadError>
          </div>
        ) : (
          <BuyPicker
            catalog={catalog}
            settings={settings}
            initialService={params.get('service')}
            initialCountry={params.get('pays')}
            footer={({ service, country, price }) => (
              <div className="flex flex-col gap-3 px-2 pb-2 pt-4 min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-between min-[810px]:gap-6 min-[810px]:px-3 min-[810px]:pb-1">
                <div className="flex min-w-0 flex-col gap-1">
                  <SelectionSummary service={service} country={country} />
                  <p className="text-[14px] leading-[21px] tracking-[-0.28px] text-[var(--glow-gray)]">
                    {price !== null && balance !== null
                      ? balance >= price
                        ? `Solde après l’achat : ${formatFCFA(balance - price)}`
                        : `Solde actuel : ${formatFCFA(balance)}`
                      : 'Numéro à usage unique, remboursé si le SMS n’arrive pas.'}
                  </p>
                </div>
                <PurchaseButton service={service} country={country} price={price} balance={balance} className="shrink-0" />
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}

/** Ancienne adresse « /service/:slug?pays=… » : renvoie vers la page d'achat présélectionnée. */
export function LegacyServiceRedirect() {
  const { slug } = useParams<{ slug: string }>()
  const [params] = useSearchParams()
  const pays = params.get('pays')
  if (!slug) return <Navigate to="/acheter" replace />
  return <Navigate to={pays ? purchasePath(slug, pays) : `/acheter?service=${encodeURIComponent(slug)}`} replace />
}
