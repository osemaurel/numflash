import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MessageSquareText, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACTIVE_STATUSES, CLOSED_STATUSES, FINISHED_STATUSES, useOrders, type OrderStatus } from '@/hooks/useOrders'
import { Card, EmptyState, LoadError, OrderCard, PageHeader, SkeletonRows, secondaryButton } from './ui'

const TABS: { key: string; label: string; statuses: OrderStatus[]; empty: string }[] = [
  { key: 'actifs', label: 'En cours', statuses: ACTIVE_STATUSES, empty: 'Aucun numéro en cours. Achetez un numéro : le code reçu par SMS s’affichera ici, en direct.' },
  { key: 'termines', label: 'Terminés', statuses: FINISHED_STATUSES, empty: 'Vos numéros terminés et leurs codes apparaîtront ici.' },
  { key: 'annules', label: 'Annulés', statuses: CLOSED_STATUSES, empty: 'Aucun numéro annulé ou remboursé.' },
]

export default function Numbers() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.key === params.get('onglet')) ?? TABS[0]
  const { orders, loading, error, hasMore, loadMore } = useOrders(tab.statuses, 20)

  useEffect(() => {
    const prev = document.title
    document.title = 'Mes numéros — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader
        title="Mes "
        accent="numéros"
        subtitle="Vos numéros et les codes reçus, mis à jour en direct."
        aside={
          <Link to="/acheter" className={cn(secondaryButton, 'w-full min-[810px]:w-auto')}>
            <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            Acheter un numéro
          </Link>
        }
      />

      <div role="tablist" aria-label="Filtrer les numéros" className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-inset ring-[var(--glow-line)] [scrollbar-width:none] min-[810px]:w-max">
        {TABS.map((t) => {
          const on = t.key === tab.key
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setParams(t.key === 'actifs' ? {} : { onglet: t.key }, { replace: true })}
              className={cn(
                'h-10 shrink-0 whitespace-nowrap rounded-xl px-4 text-[14px] font-medium transition-colors',
                on ? 'bg-[var(--glow-blue)] text-white' : 'text-[rgb(90,90,90)] hover:bg-[var(--glow-bg)] hover:text-black',
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <Card>
        {loading ? (
          <SkeletonRows count={3} height={120} />
        ) : error ? (
          <LoadError />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title={tab.key === 'actifs' ? 'Aucun numéro en cours' : 'Rien pour le moment'}
            text={tab.empty}
            action={
              tab.key === 'actifs' ? (
                <Link to="/acheter" className={secondaryButton}>
                  <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                  Acheter un numéro
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} actions />
            ))}
            {hasMore ? (
              <button type="button" onClick={loadMore} className={cn(secondaryButton, 'self-center')}>
                Afficher plus
              </button>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  )
}
