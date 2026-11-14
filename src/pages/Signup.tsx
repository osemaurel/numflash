import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js'
import { Mail, MailCheck, ShoppingBag, User } from 'lucide-react'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { pendingServiceSlug, safeRedirect, withRedirect } from '@/lib/redirect'
import { useAuth } from '@/hooks/useAuth'
import { AuthShell } from './auth/AuthShell'
import { FormAlert, OrDivider, PasswordField, PhoneField, RuleHint, SubmitButton, TextField, defaultDialIso, toInternational } from './auth/fields'
import { FALLBACK_FACTS } from './landing/facts'

const MIN_PASSWORD = 8

const schema = z.object({
  full_name: z.string().trim().min(2, 'Indiquez votre nom complet.').max(80, 'Ce nom est trop long.'),
  phone: z.string().nullable().refine((v) => v !== null, 'Ce numéro de téléphone n’est pas valide.'),
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.').email('Cette adresse e-mail n’est pas valide.'),
  password: z
    .string()
    .min(MIN_PASSWORD, `Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`)
    .max(72, 'Le mot de passe ne doit pas dépasser 72 caractères.'),
})

type Field = keyof z.infer<typeof schema>

type SignupError = { message: string; existing?: boolean }

/** Message français pour chaque échec d'inscription Supabase (jamais le texte brut). */
function signupErrorMessage(error: AuthError): SignupError {
  if (isAuthRetryableFetchError(error) || error.status === 0) {
    return { message: 'Connexion au serveur impossible. Vérifiez votre connexion internet, puis réessayez.' }
  }
  switch (error.code) {
    case 'user_already_exists':
    case 'email_exists':
      return { message: 'Un compte existe déjà avec cette adresse e-mail.', existing: true }
    case 'weak_password':
      return { message: 'Ce mot de passe est trop facile à deviner. Choisissez-en un plus long ou plus varié.' }
    case 'email_address_invalid':
      return { message: 'Cette adresse e-mail n’est pas acceptée. Utilisez une autre adresse.' }
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return { message: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.' }
    case 'signup_disabled':
      return { message: 'Les inscriptions sont momentanément fermées. Réessayez plus tard.' }
    default:
      return { message: 'La création du compte a échoué. Réessayez dans un instant.' }
  }
}

function pendingPurchase(target: string | null): string | null {
  const slug = pendingServiceSlug(target)
  if (!slug) return null
  return FALLBACK_FACTS.catalog.find((s) => s.slug === slug)?.name ?? 'votre numéro'
}

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const target = safeRedirect(params.get('redirect'))
  const purchase = pendingPurchase(target)
  const { session, loading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [dialIso, setDialIso] = useState(() => defaultDialIso())
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<SignupError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** Adresse à confirmer, quand Supabase exige une confirmation par e-mail. */
  const [confirmFor, setConfirmFor] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.title
    document.title = 'Créer un compte — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  if (!loading && session && !submitting) return <Navigate to={target ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const parsed = schema.safeParse({ full_name: fullName, phone: toInternational(dialIso, phone), email, password })
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field
        next[key] ??= issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { full_name: parsed.data.full_name, phone: parsed.data.phone } },
      })
      if (error) {
        setFormError(signupErrorMessage(error))
        return
      }
      // Confirmation par e-mail activée : une adresse déjà inscrite revient sans identité.
      if (data.user && data.user.identities?.length === 0) {
        setFormError({ message: 'Un compte existe déjà avec cette adresse e-mail.', existing: true })
        return
      }
      if (!data.session) {
        setConfirmFor(parsed.data.email)
        return
      }
      navigate(target ?? '/', { replace: true })
    } catch {
      setFormError({ message: 'Connexion au serveur impossible. Vérifiez votre connexion internet, puis réessayez.' })
    } finally {
      setSubmitting(false)
    }
  }

  const loginLink = withRedirect('/connexion', target)

  if (confirmFor) {
    return (
      <AuthShell variant="signup" switchTo={{ prompt: 'Déjà inscrit ?', label: 'Se connecter', to: loginLink }}>
        <div className="flex flex-col items-start gap-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(0,134,237,0.12)]">
            <MailCheck className="h-6 w-6 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
          </span>
          <h1 className="font-glow-display text-[32px] font-medium leading-[35.2px] tracking-[-1.28px] text-black min-[810px]:text-[40px] min-[810px]:leading-[44px] min-[810px]:tracking-[-1.6px]">
            Confirmez votre adresse e-mail
          </h1>
          <p className="text-[16px] leading-[24px] tracking-[-0.32px] text-[var(--glow-text)] opacity-80">
            Nous avons envoyé un lien à <span className="font-semibold text-black">{confirmFor}</span>. Ouvrez-le pour activer votre compte, puis connectez-vous.
          </p>
          <Link
            to={loginLink}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[var(--glow-blue)] px-4 text-[16px] font-medium text-white transition-colors hover:bg-[var(--glow-blue-dark)]"
          >
            Aller à la connexion
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell variant="signup" switchTo={{ prompt: 'Déjà inscrit ?', label: 'Se connecter', to: loginLink }}>
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          {purchase ? (
            <span className="inline-flex w-max max-w-full items-center gap-1.5 rounded-full bg-[rgba(0,134,237,0.12)] py-1 pl-2 pr-3 text-[13px] font-medium leading-[15.6px] text-[var(--glow-blue-dark)]">
              <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">Votre numéro {purchase} vous attend</span>
            </span>
          ) : null}
          <h1 className="font-glow-display text-[32px] font-medium leading-[35.2px] tracking-[-1.28px] text-black min-[810px]:text-[40px] min-[810px]:leading-[44px] min-[810px]:tracking-[-1.6px]">
            Créez votre compte <span className="text-[var(--glow-blue)]">gratuit</span>
          </h1>
          <p className="text-[16px] leading-[24px] tracking-[-0.32px] text-[var(--glow-text)] opacity-80 min-[810px]:text-[17px] min-[810px]:leading-[25.5px]">
            {purchase
              ? 'Quelques secondes suffisent : vous reviendrez ensuite directement à votre sélection.'
              : 'Quelques secondes suffisent. Rechargez ensuite en Mobile Money et achetez votre premier numéro.'}
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {formError ? (
            <FormAlert>
              {formError.message}
              {formError.existing ? (
                <>
                  {' '}
                  <Link to={loginLink} className="whitespace-nowrap font-semibold underline underline-offset-2">
                    Se connecter
                  </Link>
                </>
              ) : null}
            </FormAlert>
          ) : null}
          <TextField
            id="full_name"
            label="Nom complet"
            icon={User}
            autoComplete="name"
            autoCapitalize="words"
            placeholder="Prénom et nom"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.full_name}
            required
          />
          <PhoneField id="phone" label="Numéro de téléphone" iso={dialIso} onIsoChange={setDialIso} value={phone} onChange={setPhone} error={errors.phone} />
          <TextField
            id="email"
            label="Adresse e-mail"
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <PasswordField
            id="password"
            label="Mot de passe"
            autoComplete="new-password"
            placeholder="Choisissez un mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={<RuleHint ok={password.length >= MIN_PASSWORD}>{MIN_PASSWORD} caractères minimum</RuleHint>}
            required
          />
          <SubmitButton loading={submitting} loadingLabel="Création du compte…">
            Créer mon compte
          </SubmitButton>
        </form>

        <OrDivider />

        <Link
          to={loginLink}
          className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-medium leading-[18px] text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(222,222,222)] transition-colors hover:bg-[rgb(252,252,252)] hover:ring-[rgb(200,200,200)]"
        >
          Déjà inscrit ? <span className="text-[var(--glow-blue-dark)]">Se connecter</span>
        </Link>
      </div>
    </AuthShell>
  )
}
