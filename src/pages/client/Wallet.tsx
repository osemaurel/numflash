import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Receipt, ShieldCheck, Smartphone } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { createTopup } from '@/lib/topup'
import { useBalance } from '@/hooks/useBalance'
import { useTopupTiers } from '@/hooks/useTopupTiers'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'
import { BalanceCard, Card, EmptyState, LoadError, PageHeader, SkeletonRows, TransactionList } from './ui'

export default function Wallet() {
  const navigate = useNavigate()
  const { balance } = useBalance()
  const summary = useWalletSummary()
  const { tiers, loading: tiersLoading } = useTopupTiers()
  const { transactions, loading: txLoading, error: txError } = useWalletTransactions(50)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'Solde — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  async function startTopup(amount: number) {
    if (pendingAmount !== null) return
    setPendingAmount(amount)
    setError(null)
    try {
      const { topup_id, checkout_url } = await createTopup(amount)
      if (checkout_url) {
        window.location.assign(checkout_url)
        return
      }
      // Réseau « push » : pas de page de paiement, le client valide sur son téléphone.
      navigate(`/wallet/recharge/${topup_id}?push=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lancer la recharge.')
      setPendingAmount(null)
    }
  }

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader title="Votre " accent="solde" subtitle="Rechargez en Mobile Money et suivez toutes vos opérations." />

      <div className="grid grid-cols-1 gap-5 min-[810px]:gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_380px] min-[1200px]:items-start">
        <div className="flex min-w-0 flex-col gap-5 min-[810px]:gap-6">
          <BalanceCard balance={balance} summary={summary} actions={false} />

          <Card title="Recharger mon solde" id="recharger">
            <p className="-mt-2 text-[14px] leading-[20px] text-[var(--glow-gray)]">Choisissez un montant, puis payez avec Orange Money, MTN, Moov, Wave ou par carte.</p>
            {tiersLoading ? (
              <div className="grid grid-cols-2 gap-2 min-[810px]:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-[var(--glow-bg)]" />
                ))}
              </div>
            ) : tiers.length === 0 ? (
              <LoadError>La recharge est momentanément indisponible. Réessayez dans quelques minutes.</LoadError>
            ) : (
              <ul className="grid grid-cols-2 gap-2 min-[810px]:grid-cols-3">
                {tiers.map((amount) => {
                  const busy = pendingAmount === amount
                  return (
                    <li key={amount}>
                      <button
                        type="button"
                        disabled={pendingAmount !== null}
                        onClick={() => void startTopup(amount)}
                        className={cn(
                          'flex h-[72px] w-full flex-col items-start justify-center gap-0.5 rounded-2xl bg-white px-4 text-left ring-1 ring-inset transition-shadow disabled:cursor-wait',
                          busy ? 'ring-2 ring-[var(--glow-blue)]' : 'ring-[rgb(228,228,228)] hover:ring-[var(--glow-blue)] disabled:opacity-60',
                        )}
                      >
                        <span className="flex items-center gap-2 font-glow-display text-[20px] font-semibold leading-[24px] tracking-[-0.4px] text-black">
                          {busy ? <Loader2 className="h-4 w-4 animate-spin text-[var(--glow-blue)]" strokeWidth={2.4} aria-hidden /> : null}
                          {formatFCFA(amount).replace(/\s?FCFA$/, '')}
                        </span>
                        <span className="text-[12px] font-medium text-[var(--glow-gray)]">{busy ? 'Ouverture du paiement…' : 'FCFA'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {error ? (
              <p role="alert" className="rounded-xl bg-[rgb(254,242,242)] px-3.5 py-3 text-[14px] leading-[20px] text-[rgb(153,27,27)] ring-1 ring-inset ring-[rgb(254,202,202)]">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col gap-2 rounded-2xl bg-[var(--glow-bg)] p-4 text-[13px] leading-[19px] text-[var(--glow-gray)]">
              <span className="flex items-start gap-2">
                <Smartphone className="mt-px h-4 w-4 shrink-0 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
                Selon votre opérateur, vous êtes redirigé vers la page de paiement ou vous validez directement sur votre téléphone.
              </span>
              <span className="flex items-start gap-2">
                <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
                Paiement sécurisé par SasPay. Votre solde est crédité dès que l’opérateur confirme le paiement.
              </span>
            </div>
          </Card>
        </div>

        <Card title="Historique">
          {txLoading ? (
            <SkeletonRows count={5} height={44} />
          ) : txError ? (
            <LoadError />
          ) : transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune opération" text="Vos recharges, achats et remboursements apparaîtront ici." />
          ) : (
            <>
              <TransactionList transactions={transactions} />
              {transactions.length >= 50 ? <p className="text-center text-[13px] text-[var(--glow-gray)]">Les 50 dernières opérations sont affichées.</p> : null}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
