import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, ShieldCheck, Smartphone } from 'lucide-react'
import { formatFCFA } from '@/lib/utils'
import { useBalance } from '@/hooks/useBalance'
import { useTopupTiers } from '@/hooks/useTopupTiers'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { useWalletTransactions } from '@/hooks/useWalletTransactions'
import { BalanceCard, Card, EmptyState, LoadError, PageHeader, SkeletonRows, TransactionList } from './ui'

export default function Wallet() {
  const { balance } = useBalance()
  const summary = useWalletSummary()
  const { tiers, loading: tiersLoading } = useTopupTiers()
  const { transactions, loading: txLoading, error: txError } = useWalletTransactions(50)

  useEffect(() => {
    const prev = document.title
    document.title = 'Solde — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader title="Votre " accent="solde" subtitle="Rechargez en Mobile Money et suivez toutes vos opérations." />

      <div className="grid grid-cols-1 gap-5 min-[810px]:gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_380px] min-[1200px]:items-start">
        <div className="flex min-w-0 flex-col gap-5 min-[810px]:gap-6">
          <BalanceCard balance={balance} summary={summary} actions={false} />

          <Card title="Recharger mon solde" id="recharger">
            <p className="-mt-2 text-[14px] leading-[20px] text-[var(--glow-gray)]">Choisissez un montant, puis payez avec MTN, Moov, Orange Money, Wave et les autres réseaux Mobile Money.</p>
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
                {tiers.map((amount) => (
                  <li key={amount}>
                    <Link
                      to={`/paiement?montant=${amount}`}
                      className="flex h-[72px] w-full flex-col items-start justify-center gap-0.5 rounded-2xl bg-white px-4 text-left ring-1 ring-inset ring-[rgb(228,228,228)] transition-shadow hover:ring-[var(--glow-blue)]"
                    >
                      <span className="font-glow-display text-[20px] font-semibold leading-[24px] tracking-[-0.4px] text-black">{formatFCFA(amount).replace(/\s?FCFA$/, '')}</span>
                      <span className="text-[12px] font-medium text-[var(--glow-gray)]">FCFA</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 rounded-2xl bg-[var(--glow-bg)] p-4 text-[13px] leading-[19px] text-[var(--glow-gray)]">
              <span className="flex items-start gap-2">
                <Smartphone className="mt-px h-4 w-4 shrink-0 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
                Vous saisissez votre numéro sur notre page de paiement, puis vous validez directement sur votre téléphone.
              </span>
              <span className="flex items-start gap-2">
                <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
                Paiement sécurisé. Votre solde est crédité automatiquement dès que l’opérateur confirme le paiement.
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
