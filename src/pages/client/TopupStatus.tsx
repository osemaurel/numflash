import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, KeyRound, Loader2, Smartphone, XCircle } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { useTopupStatus } from '@/hooks/useTopupStatus'
import { confirmTopupOtp } from '@/lib/payment-api'
import { moneyParams, track, trackOnce } from '@/lib/pixel'
import { primaryButton, secondaryButton } from './ui'
import { SupportLink, WhatsAppGlyph } from '@/components/Support'

/** « +22997123456 » → « +229 97 12 34 56 » (lecture plus facile). */
function prettyPhone(e164: string | null): string | null {
  if (!e164) return null
  const m = /^(\+\d{3})(\d+)$/.exec(e164)
  if (!m) return e164
  return `${m[1]} ${m[2].replace(/(\d{2})(?=\d)/g, '$1 ')}`
}

/** Réseaux qui envoient un code de confirmation par SMS après la demande de paiement. */
const CONFIRM_OTP_RE = /wizall|coris/

function ConfirmCode({ topupId }: { topupId: string }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!/^[0-9A-Za-z]{3,12}$/.test(code)) {
      setMessage({ ok: false, text: 'Saisissez le code reçu par SMS.' })
      return
    }
    setBusy(true)
    setMessage(null)
    const res = await confirmTopupOtp(topupId, code)
    setBusy(false)
    setMessage(res.ok ? { ok: true, text: 'Code envoyé. Confirmation du paiement en cours…' } : { ok: false, text: res.message })
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex w-full flex-col gap-3 rounded-2xl bg-[var(--glow-bg)] p-4 text-left">
      <label htmlFor="code-sms" className="flex items-center gap-2 text-[14px] font-medium text-black">
        <KeyRound className="h-4 w-4 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
        Code reçu par SMS
      </label>
      <div className="flex gap-2">
        <input
          id="code-sms"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
          maxLength={12}
          className="font-glow-mono h-12 min-w-0 flex-1 rounded-xl bg-white px-3.5 text-[18px] tracking-[3px] text-black outline-none ring-1 ring-inset ring-[rgb(222,222,222)] focus:ring-2 focus:ring-[var(--glow-blue)]"
        />
        <button type="submit" disabled={busy} className={cn(primaryButton, 'h-12 shrink-0 px-4')}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Valider
        </button>
      </div>
      {message ? (
        <p role="status" className={cn('text-[13px] leading-[18px]', message.ok ? 'text-[rgb(28,120,28)]' : 'text-[rgb(185,28,28)]')}>
          {message.text}
        </p>
      ) : null}
    </form>
  )
}

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
  // Pixel : recharge créditée (statut lu en base, confirmé par le webhook) ; une seule fois par recharge.
  const succeeded = phase === 'final' && topup?.status === 'succeeded'
  useEffect(() => {
    if (!succeeded || !topup) return
    trackOnce(`purchase_${topup.id}`, () => track('Purchase', { ...moneyParams(topup.amount_xof), content_name: 'Recharge', content_type: 'product', num_items: 1 }, `topup_${topup.id}`))
  }, [succeeded, topup])
  const amount = topup ? formatFCFA(topup.amount_xof) : null
  const phone = prettyPhone(topup?.payer_phone ?? null)
  const needsCode = params.get('code') === '1' || CONFIRM_OTP_RE.test(topup?.payer_network ?? '')

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
        <SupportLink where="recharge_echouee" text={`Bonjour, ma recharge Numflash n’a pas abouti mais mon compte Mobile Money a été débité. Référence : ${topupId}`} className={secondaryButton}>
          <WhatsAppGlyph className="h-[18px] w-[18px] text-[#1fa855]" />
          Contacter l’assistance
        </SupportLink>
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
            Une demande de paiement
            {amount ? (
              <>
                {' '}
                de <span className="font-semibold text-black">{amount}</span> (plus les frais de l’opérateur)
              </>
            ) : null}{' '}
            a été envoyée
            {phone ? (
              <>
                {' '}
                au <span className="font-semibold whitespace-nowrap text-black">{phone}</span>
              </>
            ) : null}
            .
          </p>
          <p>Saisissez votre code secret Mobile Money sur votre téléphone pour valider. Votre solde sera crédité automatiquement.</p>
          {needsCode && topupId ? <ConfirmCode topupId={topupId} /> : null}
          <p className="text-[13px]">Pas de demande reçue ? Vérifiez que votre téléphone est allumé et que le numéro est correct, puis composez le menu de votre opérateur pour voir les paiements en attente.</p>
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
