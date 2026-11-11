import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBalance } from '@/hooks/useBalance'
import { useTopupTiers } from '@/hooks/useTopupTiers'
import { useWalletTransactions, type TransactionType } from '@/hooks/useWalletTransactions'
import { createTopup } from '@/lib/topup'
import { cn, formatDateTime, formatFCFA } from '@/lib/utils'

const TRANSACTION_LABELS: Record<TransactionType, string> = {
  topup: 'Recharge mobile money',
  purchase: 'Achat de numéro',
  refund: 'Remboursement',
  bonus: 'Bonus',
  adjustment: 'Ajustement',
}

export default function Wallet() {
  const navigate = useNavigate()
  const { balance, loading: balanceLoading } = useBalance()
  const { tiers, loading: tiersLoading } = useTopupTiers()
  const { transactions, loading: txLoading, error: txError } = useWalletTransactions()
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)

  async function startTopup(amount: number) {
    if (pendingAmount !== null) return
    setPendingAmount(amount)
    try {
      const { topup_id, checkout_url } = await createTopup(amount)
      if (checkout_url) {
        window.location.assign(checkout_url)
        return
      }
      // Réseau « push » : pas de page de paiement, le client valide sur son téléphone.
      navigate(`/wallet/recharge/${topup_id}?push=1`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de lancer la recharge.')
      setPendingAmount(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Portefeuille</h1>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="space-y-1 p-6">
          <p className="text-sm opacity-90">Solde disponible</p>
          <p className="text-3xl font-semibold tabular-nums" aria-live="polite">
            {balanceLoading ? '…' : formatFCFA(balance ?? 0)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recharger mon compte</CardTitle>
          <CardDescription>Choisissez un montant, vous paierez par mobile money.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiersLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">La recharge est momentanément indisponible.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tiers.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="lg"
                  className="tabular-nums"
                  disabled={pendingAmount !== null}
                  onClick={() => void startTopup(amount)}
                >
                  {pendingAmount === amount ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {formatFCFA(amount)}
                </Button>
              ))}
            </div>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            Paiement sécurisé par SasPay. Votre solde est crédité dès que l'opérateur confirme le paiement.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Historique</h2>
        {txLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : txError ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Impossible de charger l'historique. Vérifiez votre connexion.
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Aucune transaction pour le moment.
          </Card>
        ) : (
          <ul className="space-y-2">
            {transactions.map((tx) => {
              const credit = tx.amount_xof > 0
              return (
                <li key={tx.id}>
                  <Card className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                          credit ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                        aria-hidden
                      >
                        {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{TRANSACTION_LABELS[tx.type]}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'shrink-0 text-sm font-semibold tabular-nums',
                        credit ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {credit ? '+' : ''}
                      {formatFCFA(tx.amount_xof)}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
