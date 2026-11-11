import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, Smartphone, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTopupStatus } from '@/hooks/useTopupStatus'
import { formatFCFA } from '@/lib/utils'

function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        {icon}
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  )
}

function BackToWallet({ variant = 'outline' }: { variant?: 'default' | 'outline' }) {
  return (
    <Button asChild variant={variant} className="w-full">
      <Link to="/wallet">Retour au portefeuille</Link>
    </Button>
  )
}

export default function TopupStatus() {
  const { topupId } = useParams<{ topupId: string }>()
  const [params] = useSearchParams()
  const pushFlow = params.get('push') === '1'
  const { topup, phase, retry } = useTopupStatus(topupId)
  const amount = topup ? formatFCFA(topup.amount_xof) : null

  if (phase === 'not_found') {
    return (
      <Panel icon={<XCircle className="h-12 w-12 text-destructive" aria-hidden />} title="Recharge introuvable">
        <p>Cette recharge n'existe pas ou n'est pas liée à votre compte.</p>
        <BackToWallet />
      </Panel>
    )
  }

  if (phase === 'final' && topup?.status === 'succeeded') {
    return (
      <Panel icon={<CheckCircle2 className="h-12 w-12 text-primary" aria-hidden />} title="Recharge confirmée">
        <p>
          <span className="font-semibold text-foreground">{amount}</span> ont été ajoutés à votre solde.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button asChild className="w-full">
            <Link to="/">Acheter un numéro</Link>
          </Button>
          <BackToWallet />
        </div>
      </Panel>
    )
  }

  if (phase === 'final') {
    return (
      <Panel icon={<XCircle className="h-12 w-12 text-destructive" aria-hidden />} title="Paiement non abouti">
        <p>
          {topup?.status === 'expired'
            ? 'Le délai de paiement est dépassé.'
            : "L'opérateur n'a pas confirmé le paiement."}{' '}
          Votre solde Numflash n'a pas été modifié.
        </p>
        <p>Si votre compte mobile money a tout de même été débité, contactez le support avec ce numéro : {topupId}</p>
        <Button asChild className="w-full">
          <Link to="/wallet">Réessayer une recharge</Link>
        </Button>
      </Panel>
    )
  }

  if (phase === 'timeout') {
    return (
      <Panel icon={<Clock className="h-12 w-12 text-muted-foreground" aria-hidden />} title="Paiement pas encore confirmé">
        <p>Nous n'avons pas encore reçu la confirmation de votre opérateur.</p>
        <p>
          Si vous avez validé le paiement, votre solde sera crédité automatiquement dès sa confirmation : vous n'avez
          rien à refaire. Vous pouvez quitter cette page.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button className="w-full" onClick={retry}>
            Vérifier à nouveau
          </Button>
          <BackToWallet />
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      icon={
        pushFlow ? (
          <Smartphone className="h-12 w-12 text-primary" aria-hidden />
        ) : (
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
        )
      }
      title={pushFlow ? 'Validez le paiement sur votre téléphone' : 'Confirmation de votre paiement'}
    >
      {pushFlow ? (
        <>
          <p>
            Vous allez recevoir une demande de paiement de votre opérateur mobile money
            {amount ? (
              <>
                {' '}
                de <span className="font-semibold text-foreground">{amount}</span>
              </>
            ) : null}
            .
          </p>
          <p>Saisissez votre code secret sur votre téléphone pour valider. Gardez cette page ouverte.</p>
        </>
      ) : (
        <p>Nous attendons la confirmation de votre opérateur. Cela prend en général moins d'une minute.</p>
      )}
      <p className="flex items-center justify-center gap-2 text-xs" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Vérification en cours…
      </p>
    </Panel>
  )
}
