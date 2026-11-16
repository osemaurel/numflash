import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, KeyRound, Loader2, Lock, Mail, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useTopupTiers } from '@/hooks/useTopupTiers'
import {
  detectCountry,
  dialCode,
  estimateFee,
  fillOtpInstructions,
  flag,
  isRedirectNetwork,
  localPart,
  networkStyle,
  splitFullName,
  toE164,
  type PaymentCountry,
  type PaymentNetwork,
} from '@/lib/payment'
import { fetchPaymentOptions, payTopup } from '@/lib/payment-api'
import { TextField } from '../auth/fields'
import { Wordmark } from '../landing/ui'
import { primaryButton, secondaryButton } from './ui'
import '../glow/glow.css'

/* ------------------------------------------------------------------ */
/* Mémoire locale (confort uniquement : la page fonctionne sans)       */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'numflash:payeur'

interface SavedPayer {
  first?: string
  last?: string
  email?: string
  country?: string
  network?: string
  phone?: string
}

function readSaved(): SavedPayer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedPayer) : {}
  } catch {
    return {}
  }
}

function writeSaved(value: SavedPayer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Navigation privée : rien à mémoriser.
  }
}

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function Section({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[24px] bg-white p-4 ring-1 ring-inset ring-[var(--glow-line)] min-[480px]:p-5">
      <h2 className="flex items-center gap-2.5">
        <span className="font-glow-mono flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--glow-bg)] px-1.5 text-[12px] font-bold text-[var(--glow-blue)]">{step}</span>
        <span className="font-glow-display text-[18px] font-medium leading-[22px] tracking-[-0.4px] text-black">{title}</span>
      </h2>
      {children}
    </section>
  )
}

function NetworkBadge({ network, size = 36 }: { network: PaymentNetwork; size?: number }) {
  const s = networkStyle(network.code, network.name)
  return (
    <span
      aria-hidden
      className="font-glow-display flex shrink-0 items-center justify-center rounded-[10px] font-bold"
      style={{ width: size, height: size, background: s.bg, color: s.fg, fontSize: size * 0.44 }}
    >
      {s.letter}
    </span>
  )
}

function SummaryRow({ label, value, strong = false }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
      <span className={strong ? 'font-medium text-black' : 'text-[var(--glow-gray)]'}>{label}</span>
      <span className={cn('text-right', strong ? 'font-glow-display text-[18px] font-semibold text-black' : 'text-[var(--glow-text)]')}>{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type FieldErrors = Partial<Record<'first' | 'last' | 'email' | 'network' | 'phone' | 'otp', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_RE = /^[^<>"{}\\]{1,60}$/

export default function Checkout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const amount = Number(params.get('montant'))
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const { tiers, loading: tiersLoading } = useTopupTiers()

  const [countries, setCountries] = useState<PaymentCountry[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [detected, setDetected] = useState(false)
  const [networkCode, setNetworkCode] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const prefilled = useRef(false)
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'Paiement — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoadError(null)
    fetchPaymentOptions()
      .then((c) => active && setCountries(c))
      .catch((e: unknown) => active && setLoadError(e instanceof Error ? e.message : 'Les moyens de paiement sont indisponibles.'))
    return () => {
      active = false
    }
  }, [attempt])

  // Préremplissage : dernières coordonnées utilisées sur cet appareil, sinon le profil.
  useEffect(() => {
    if (prefilled.current || !countries || profileLoading) return
    prefilled.current = true
    const saved = readSaved()
    const names = splitFullName(profile?.full_name)
    setFirst(saved.first ?? names.first)
    setLast(saved.last ?? names.last)
    setEmail(saved.email ?? user?.email ?? '')
    const available = countries.map((c) => c.code)
    const savedCountry = saved.country && available.includes(saved.country) ? saved.country : null
    const initial =
      savedCountry ??
      detectCountry(available, {
        profilePhone: profile?.phone,
        timeZone: (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone
          } catch {
            return null
          }
        })(),
        languages: typeof navigator === 'undefined' ? [] : navigator.languages,
      })
    if (!initial) return
    setCountry(initial)
    setDetected(!savedCountry)
    const nets = countries.find((c) => c.code === initial)?.networks ?? []
    if (saved.network && nets.some((n) => n.code === saved.network)) setNetworkCode(saved.network)
    else if (nets.length === 1) setNetworkCode(nets[0].code)
    setPhone(savedCountry && saved.phone ? localPart(initial, saved.phone) : localPart(initial, profile?.phone))
  }, [countries, profile, profileLoading, user])

  const current = countries?.find((c) => c.code === country) ?? null
  const network = current?.networks.find((n) => n.code === networkCode) ?? null
  const fee = useMemo(() => (network && Number.isSafeInteger(amount) ? estimateFee(amount, network.fees) : null), [network, amount])
  const total = fee?.total ?? amount
  const amountValid = Number.isSafeInteger(amount) && amount > 0 && (tiersLoading || tiers.includes(amount))

  function changeCountry(code: string) {
    setCountry(code)
    setDetected(false)
    setOtp('')
    const nets = countries?.find((c) => c.code === code)?.networks ?? []
    setNetworkCode(nets.length === 1 ? nets[0].code : '')
    setErrors((e) => ({ ...e, network: undefined, phone: undefined }))
  }

  function chooseNetwork(code: string) {
    setNetworkCode(code)
    setOtp('')
    setErrors((e) => ({ ...e, network: undefined, otp: undefined }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !current) return
    setFormError(null)
    const next: FieldErrors = {}
    if (!NAME_RE.test(first.trim())) next.first = 'Indiquez votre prénom.'
    if (!NAME_RE.test(last.trim())) next.last = 'Indiquez votre nom.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Indiquez une adresse e-mail valide.'
    if (!network) next.network = 'Choisissez votre réseau Mobile Money.'
    const e164 = toE164(current.code, phone)
    if (!e164) next.phone = `Indiquez votre numéro ${network?.name ?? 'Mobile Money'} (sans l’indicatif ${dialCode(current.code) ?? ''}).`
    if (network?.otp_required && !/^[0-9A-Za-z]{3,12}$/.test(otp.trim())) next.otp = 'Saisissez le code de paiement obtenu sur votre téléphone.'
    setErrors(next)
    if (Object.keys(next).length > 0 || !network || !e164) return

    setSubmitting(true)
    writeSaved({ first: first.trim(), last: last.trim(), email: email.trim(), country: current.code, network: network.code, phone: e164 })
    const res = await payTopup({
      amountXof: amount,
      firstName: first.trim(),
      lastName: last.trim(),
      email: email.trim(),
      country: current.code,
      network: network.code,
      phone: e164,
      otp: network.otp_required ? otp.trim() : undefined,
    })
    if (!res.ok) {
      setSubmitting(false)
      setFormError(res.message)
      if (res.code === 'otp_required') otpRef.current?.focus()
      return
    }
    if (res.checkoutUrl) {
      // Wave, Djamo… : la validation se fait sur la page de l'opérateur.
      window.location.assign(res.checkoutUrl)
      return
    }
    navigate(`/wallet/recharge/${res.topupId}?push=1${res.confirmOtp ? '&code=1' : ''}`, { replace: true })
  }

  /* ---------------------------- rendu ---------------------------- */

  const header = (
    <header className="sticky top-0 z-10 border-b border-[var(--glow-line)] bg-[rgba(248,247,247,0.92)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[560px] items-center justify-between gap-3 px-4">
        <Link to="/wallet" aria-label="Retour au solde" className="flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-white">
          <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
        <Wordmark className="scale-[0.85]" />
        <span className="flex items-center gap-1 text-[12px] font-semibold text-[rgb(28,120,28)]">
          <Lock className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          Sécurisé
        </span>
      </div>
    </header>
  )

  if (!tiersLoading && !amountValid) {
    return (
      <div className="glow-root min-h-[100svh] bg-[var(--glow-bg)]">
        {header}
        <main className="mx-auto flex max-w-[560px] flex-col items-center gap-4 px-4 py-12 text-center">
          <h1 className="font-glow-display text-[24px] font-medium tracking-[-0.6px] text-black">Montant de recharge invalide</h1>
          <p className="text-[15px] text-[var(--glow-gray)]">Choisissez un montant de recharge depuis votre solde.</p>
          <Link to="/wallet" className={primaryButton}>
            Choisir un montant
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="glow-root min-h-[100svh] bg-[var(--glow-bg)]">
      {header}
      <main className="mx-auto flex max-w-[560px] flex-col gap-4 px-4 pb-[calc(32px+env(safe-area-inset-bottom))] pt-5">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-[var(--glow-blue)]">Recharge de votre solde</span>
          <h1 className="font-glow-display text-[34px] font-semibold leading-[38px] tracking-[-1px] text-black">{formatFCFA(amount)}</h1>
        </div>

        {loadError ? (
          <section className="flex flex-col items-center gap-3 rounded-[24px] bg-white p-6 text-center ring-1 ring-inset ring-[var(--glow-line)]">
            <p className="text-[15px] text-[var(--glow-text)]">{loadError}</p>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className={secondaryButton}>
              Réessayer
            </button>
          </section>
        ) : !countries || profileLoading ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement des moyens de paiement">
            {[180, 260, 120].map((h) => (
              <div key={h} className="animate-pulse rounded-[24px] bg-white ring-1 ring-inset ring-[var(--glow-line)]" style={{ height: h }} />
            ))}
          </div>
        ) : countries.length === 0 ? (
          <section className="rounded-[24px] bg-white p-6 text-center text-[15px] text-[var(--glow-text)] ring-1 ring-inset ring-[var(--glow-line)]">
            Le paiement Mobile Money est momentanément indisponible. Réessayez dans quelques minutes.
          </section>
        ) : (
          <form onSubmit={(e) => void submit(e)} noValidate className="flex flex-col gap-4">
            <Section step="1" title="Vos informations">
              <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
                <TextField id="prenom" label="Prénom" icon={UserRound} autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} error={errors.first} maxLength={60} />
                <TextField id="nom" label="Nom" icon={UserRound} autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} error={errors.last} maxLength={60} />
              </div>
              <TextField id="email" label="E-mail" icon={Mail} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} maxLength={254} />
            </Section>

            <Section step="2" title="Paiement Mobile Money">
              {/* Pays */}
              <div className="flex flex-col gap-2">
                <label htmlFor="pays" className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-text)]">
                  Pays
                </label>
                <div className="relative flex h-12 items-center gap-2.5 rounded-xl bg-white pl-3.5 pr-10 shadow-[0px_1px_2px_0px_rgba(16,35,41,0.06)] ring-1 ring-inset ring-[rgb(222,222,222)] focus-within:ring-2 focus-within:ring-[var(--glow-blue)]">
                  <span className="text-[20px] leading-none" aria-hidden>
                    {flag(country)}
                  </span>
                  <span className="truncate text-[16px] tracking-[-0.3px] text-black">{current?.name ?? 'Choisissez votre pays'}</span>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(150,150,150)]" strokeWidth={2} aria-hidden />
                  <select id="pays" value={country} onChange={(e) => changeCountry(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {flag(c.code)} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {detected ? <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">Détecté automatiquement. Vous pouvez le changer.</p> : null}
              </div>

              {/* Réseau */}
              {current ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-text)]">Réseau Mobile Money</legend>
                  <div role="radiogroup" aria-label="Réseau Mobile Money" className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                    {current.networks.map((n) => {
                      const on = n.code === networkCode
                      return (
                        <button
                          key={n.code}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => chooseNetwork(n.code)}
                          className={cn(
                            'flex min-h-[60px] items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left transition-shadow',
                            on ? 'ring-2 ring-[var(--glow-blue)] shadow-[0_8px_20px_-14px_rgba(0,133,238,0.8)]' : 'ring-1 ring-inset ring-[rgb(228,228,228)] hover:ring-[rgb(200,200,200)]',
                          )}
                        >
                          <NetworkBadge network={n} />
                          <span className="flex min-w-0 flex-col">
                            <span className="text-[15px] font-medium leading-[19px] tracking-[-0.2px] text-black">{n.name}</span>
                            {n.otp_required ? (
                              <span className="text-[12px] leading-[16px] text-[var(--glow-gray)]">Code de paiement requis</span>
                            ) : isRedirectNetwork(n.code) ? (
                              <span className="text-[12px] leading-[16px] text-[var(--glow-gray)]">Validation dans l’application</span>
                            ) : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.network ? <p className="text-[13px] font-medium leading-[18px] text-[rgb(220,38,38)]">{errors.network}</p> : null}
                </fieldset>
              ) : null}

              {/* Numéro */}
              {current ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="numero" className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-text)]">
                    Numéro {network ? network.name : 'Mobile Money'}
                  </label>
                  <div
                    className={cn(
                      'flex h-12 items-stretch overflow-hidden rounded-xl bg-white shadow-[0px_1px_2px_0px_rgba(16,35,41,0.06)] ring-1 ring-inset focus-within:ring-2',
                      errors.phone ? 'ring-[rgb(248,113,113)] focus-within:ring-[rgb(220,38,38)]' : 'ring-[rgb(222,222,222)] focus-within:ring-[var(--glow-blue)]',
                    )}
                  >
                    <span className="flex shrink-0 items-center gap-1.5 border-r border-[rgb(232,232,232)] px-3 text-[15px] font-medium text-black">
                      <span aria-hidden>{flag(current.code)}</span>
                      {dialCode(current.code)}
                    </span>
                    <input
                      id="numero"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="Votre numéro"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      aria-invalid={errors.phone ? true : undefined}
                      className="min-w-0 flex-1 bg-transparent px-3 text-[16px] tracking-[-0.3px] text-black outline-none placeholder:text-[rgb(160,160,160)]"
                    />
                  </div>
                  {errors.phone ? <p className="text-[13px] font-medium leading-[18px] text-[rgb(220,38,38)]">{errors.phone}</p> : null}
                </div>
              ) : null}

              {/* Code préalable (Orange Money Côte d'Ivoire, Burkina…) */}
              {network?.otp_required ? (
                <div className="flex flex-col gap-3 rounded-2xl bg-[rgb(255,248,235)] p-4 ring-1 ring-inset ring-[rgb(253,224,170)]">
                  <p className="flex items-start gap-2 text-[14px] leading-[20px] text-[rgb(110,62,0)]">
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>
                      {network.otp_instructions
                        ? fillOtpInstructions(network.otp_instructions, total)
                        : 'Obtenez votre code de paiement auprès de votre opérateur, puis saisissez-le ci-dessous.'}
                    </span>
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="code" className="text-[14px] font-medium text-[var(--glow-text)]">
                      Code de paiement
                    </label>
                    <input
                      ref={otpRef}
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                      maxLength={12}
                      aria-invalid={errors.otp ? true : undefined}
                      className={cn(
                        'font-glow-mono h-12 rounded-xl bg-white px-3.5 text-[18px] tracking-[3px] text-black outline-none ring-1 ring-inset focus:ring-2',
                        errors.otp ? 'ring-[rgb(248,113,113)]' : 'ring-[rgb(222,222,222)] focus:ring-[var(--glow-blue)]',
                      )}
                    />
                    {errors.otp ? <p className="text-[13px] font-medium leading-[18px] text-[rgb(220,38,38)]">{errors.otp}</p> : null}
                  </div>
                </div>
              ) : null}
            </Section>

            {/* Récapitulatif */}
            <section className="flex flex-col rounded-[24px] bg-white px-4 py-2 ring-1 ring-inset ring-[var(--glow-line)] min-[480px]:px-5">
              <SummaryRow label="Montant crédité" value={formatFCFA(amount)} />
              <div className="border-t border-[var(--glow-line)]" />
              <SummaryRow
                label={fee && !fee.known ? 'Frais de l’opérateur' : 'Frais de l’opérateur (estimés)'}
                value={!network ? '—' : fee?.known ? (fee.fee > 0 ? formatFCFA(fee.fee) : 'Offerts') : 'Selon l’opérateur'}
              />
              <div className="border-t border-[var(--glow-line)]" />
              <SummaryRow label="Total à payer" value={formatFCFA(total)} strong />
            </section>

            {formError ? (
              <p role="alert" className="rounded-xl bg-[rgb(254,242,242)] px-3.5 py-3 text-[14px] leading-[20px] text-[rgb(153,27,27)] ring-1 ring-inset ring-[rgb(254,202,202)]">
                {formError}
              </p>
            ) : null}

            <button type="submit" disabled={submitting} className={cn(primaryButton, 'h-14 text-[17px]')}>
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.2} aria-hidden /> : <Lock className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />}
              {submitting ? 'Envoi de la demande…' : `Payer ${formatFCFA(total)}`}
            </button>

            <div className="flex flex-col gap-2 px-1 text-[13px] leading-[19px] text-[var(--glow-gray)]">
              <span className="flex items-start gap-2">
                <Smartphone className="mt-px h-4 w-4 shrink-0 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
                {network && isRedirectNetwork(network.code)
                  ? `Vous allez être dirigé vers ${network.name} pour valider le paiement.`
                  : 'Une demande de paiement va s’afficher sur votre téléphone : saisissez votre code secret Mobile Money pour valider.'}
              </span>
              <span className="flex items-start gap-2">
                <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
                Paiement sécurisé. Votre solde est crédité automatiquement dès la confirmation de votre opérateur.
              </span>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
