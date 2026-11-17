import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { placeOrder } from '@/lib/order-api'
import type { ServiceRow } from '@/hooks/useServices'
import type { CatalogService } from '../landing/facts'
import type { CountryOffer } from '../landing/buy'
import { ConfirmPurchase, primaryButton } from './ui'
import { moneyParams, trackCustom } from '@/lib/pixel'

/** Services du catalogue au format du sélecteur d'achat. */
export function toCatalog(services: ServiceRow[]): CatalogService[] {
  return services.map((s) => ({ slug: s.slug, name: s.name_fr, marginOverride: s.margin_override == null ? null : Number(s.margin_override) }))
}

/**
 * Bouton d'achat avec le solde : « Acheter pour … », « Recharger » si le solde ne suffit pas,
 * puis fenêtre de confirmation.
 */
export function PurchaseButton({
  service,
  country,
  price,
  balance,
  className,
}: {
  service: CatalogService | null
  country: CountryOffer | null
  price: number | null
  balance: number | null
  className?: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // Nouveau prix annoncé par le serveur (catalogue mis à jour entre l'affichage et l'achat).
  const [quoted, setQuoted] = useState<number | null>(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    setQuoted(null)
  }, [service?.slug, country?.code, price])

  if (!service || !country || price === null) {
    return (
      <span aria-disabled="true" className={cn('flex h-12 cursor-not-allowed items-center justify-center rounded-xl bg-[rgb(232,232,232)] px-5 text-[16px] font-medium text-[rgb(140,140,140)]', className)}>
        {!service ? 'Choisissez une application' : 'Choisissez un pays'}
      </span>
    )
  }

  if (balance !== null && balance < price) {
    return (
      <Link to="/wallet" className={cn(primaryButton, className)}>
        <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden />
        Recharger · il manque {formatFCFA(price - balance)}
      </Link>
    )
  }

  const payable = quoted ?? price

  async function confirm() {
    const res = await placeOrder({ service: service!.slug, country: country!.code, expectedPriceXof: payable })
    if (!res.ok) {
      if (res.code === 'price_changed' && res.priceXof) setQuoted(res.priceXof)
      return res.message
    }
    trackCustom('AchatNumero', { ...moneyParams(payable), content_type: 'product', content_ids: [`${service!.slug}:${country!.code}`], content_name: `${service!.name} · ${country!.name}` }, `order_${res.orderId}`)
    setOpen(false)
    setQuoted(null)
    navigate('/numeros')
    return null
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={balance === null} className={cn(primaryButton, className)}>
        Acheter pour {formatFCFA(price)}
      </button>
      <ConfirmPurchase
        open={open}
        onClose={close}
        onConfirm={confirm}
        service={service.name}
        country={country.name}
        flag={country.flag}
        price={payable}
        balance={balance ?? 0}
      />
    </>
  )
}
