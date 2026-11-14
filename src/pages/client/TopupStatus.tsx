import { useEffect, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, Smartphone, XCircle } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { useTopupStatus } from '@/hooks/useTopupStatus'
import { primaryButton, secondaryButton } from './ui'

function Panel({ icon, tone, title, children }: { icon: ReactNode; tone: string; title: string; children: ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 rounded-[28px] bg-white p-6 text-center ring-1 ring-inset ring-[var(--glow-line)] min-[810px]:mt-6 min-[810px]:p-8">
      <span className={cn('flex h-16 w-16 items-center justify-center rounded-full', tone)}>{icon}</span>
      <h1 className="font-glow-display text-[26px] font-medium leading-[30px] tracking-[-0.8px] text-black">{title}</h1>
      <div className="flex w-full flex-col gap-3 text-[15px] leading-[22px] text-[var(--glow-gray)]">{children}</div>
    </section>
  )
}

const icon = 'h-8 w-8'

export default function TopupStatus() {
  const { topupId } = useParams<{ topupId: string }>()
  const [params] = useSearchParams()
  const pushFlow = params.get('push') === '1'
  const { topup, phase, retry } = useTopupStatus(topupId)
  const amount = topup ? formatFCFA(topup.amount_xof) : null

  useEffect(() => {
    const prev = document.title
    document.title = 'Recharge — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  if (phase === 'not_found') {
    return (
      <Panel icon={<XCircle className={icon} strokeWidth={2} aria-hidden />} tone="bg-[rgb(254,242,242)] text-[rgb(185,28,28)]" title="Recharge introuvable">
        <p>Cette recharge n’existe pas ou n’est pas liée à votre compte.</p>
        <Link to="/wallet" className={secondaryButton}>
          Retour au solde
        </Link>
      </Panel>
    )
  }

  if (phase === 'final' && topup?.status === 'succeeded') {
    return (
      <Panel icon={<CheckCircle2 className={icon} strokeWidth={2} aria-hidden />} tone="bg-[rgb(232,246,234)] text-[rgb(28,120,28)]" title="Recharge confirmée">
        <p>
          <span className="font-semibold text-black">{amount}</span> ont été ajoutés à votre solde.
        </p>
        <Link to="/acheter" className={primaryButton}>
          Acheter un numéro
        </Link>
        <Link to="/wallet" className={secondaryButton}>
          Retour au solde
        </Link>
      </Panel>
    )
  }

  if (phase === 'final') {
    return (
      <Panel icon={<XCircle className={icon} strokeWidth={2} aria-hidden />} tone="bg-[rgb(254,242,242)] text-[rgb(185,28,28)]" title="Paiement non abouti">
        <p>
          {topup?.status === 'expired' ? 'Le délai de paiement est dépassé.' : 'L’opérateur n’a pas confirmé le paiement.'} Votre solde Numflash n’a pas été modifié.
        </p>
        <p className="text-[13px]">
          Si votre compte Mobile Money a tout de même été débité, contactez l’assistance avec cette référence : <span className="font-glow-mono break-all text-black">{topupId}</span>
        </p>
        <Link to="/wallet" className={primaryButton}>
          Réessayer une recharge
        </Link>
      </Panel>
    )
  }

  if (phase === 'timeout') {
    return (
      <Panel icon={<Clock className={icon} strokeWidth={2} aria-hidden />} tone="bg-[var(--glow-bg)] text-[var(--glow-gray)]" title="Paiement pas encore confirmé">
        <p>Nous n’avons pas encore reçu la confirmation de votre opérateur.</p>
        <p>Si vous avez validé le paiement, votre solde sera crédité automatiquement dès sa confirmation : vous n’avez rien à refaire. Vous pouvez quitter cette page.</p>
        <button type="button" onClick={retry} className={primaryButton}>
          Vérifier à nouveau
        </button>
        <Link to="/wallet" className={secondaryButton}>
          Retour au solde
        </Link>
      </Panel>
    )
  }

  return (
    <Panel
      icon={pushFlow ? <Smartphone className={icon} strokeWidth={2} aria-hidden /> : <Loader2 className={cn(icon, 'animate-spin')} strokeWidth={2} aria-hidden />}
      tone="bg-[rgb(222,242,255)] text-[var(--glow-blue)]"
      title={pushFlow ? 'Validez le paiement sur votre téléphone' : 'Confirmation de votre paiement'}
    >
      {pushFlow ? (
        <>
          <p>
            Vous allez recevoir une demande de paiement de votre opérateur Mobile Money
            {amount ? (
              <>
                {' '}
                de <span className="font-semibold text-black">{amount}</span>
              </>
            ) : null}
            .
          </p>
          <p>Saisissez votre code secret sur votre téléphone pour valider. Gardez cette page ouverte.</p>
        </>
      ) : (
        <p>Nous attendons la confirmation de votre opérateur. Cela prend en général moins d’une minute.</p>
      )}
      <p className="flex items-center justify-center gap-2 text-[13px]" aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Vérification en cours…
      </p>
    </Panel>
  )
}
