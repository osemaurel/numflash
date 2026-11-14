import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { placeOrder } from '@/lib/orders'
import type { ServiceRow } from '@/hooks/useServices'
import type { CatalogService } from '../landing/facts'
import type { CountryOffer } from '../landing/buy'
import { ConfirmPurchase, primaryButton } from './ui'

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
  const close = useCallback(() => setOpen(false), [])

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

  async function confirm() {
    const res = await placeOrder({ service: service!.slug, country: country!.code })
    if (!res.ok) return res.message
    setOpen(false)
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
        price={price}
        balance={balance ?? 0}
      />
    </>
  )
}
