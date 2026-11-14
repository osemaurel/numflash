import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js'
import { Mail, ShoppingBag } from 'lucide-react'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { safeRedirect, withRedirect } from '@/lib/redirect'
import { useAuth } from '@/hooks/useAuth'
import { AuthShell } from './auth/AuthShell'
import { FormAlert, OrDivider, PasswordField, SubmitButton, TextField } from './auth/fields'
import { FALLBACK_FACTS, SUPPORT_WHATSAPP_URL } from './landing/facts'

const schema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse e-mail.').email('Cette adresse e-mail n’est pas valide.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
})

type Field = keyof z.infer<typeof schema>

/** Message français pour chaque échec de connexion Supabase (jamais le texte brut). */
function loginErrorMessage(error: AuthError): string {
  if (isAuthRetryableFetchError(error) || error.status === 0) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet, puis réessayez.'
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Adresse e-mail ou mot de passe incorrect.'
    case 'email_not_confirmed':
      return 'Votre adresse e-mail n’est pas encore confirmée. Ouvrez le lien reçu par e-mail, puis reconnectez-vous.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
    case 'user_banned':
      return 'Ce compte est suspendu. Contactez l’assistance pour en savoir plus.'
    default:
      return error.status === 400 ? 'Adresse e-mail ou mot de passe incorrect.' : 'La connexion a échoué. Réessayez dans un instant.'
  }
}

/** « /service/whatsapp?pays=france » → « WhatsApp », pour rappeler l'achat en cours. */
function pendingPurchase(target: string | null): string | null {
  const match = target?.match(/^\/service\/([a-z0-9_-]+)/i)
  if (!match) return null
  return FALLBACK_FACTS.catalog.find((s) => s.slug === match[1])?.name ?? 'votre numéro'
}

const FORGOT_URL = SUPPORT_WHATSAPP_URL.replace(/text=[^&]*/, `text=${encodeURIComponent('Bonjour, j’ai oublié le mot de passe de mon compte Numflash.')}`)

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const target = safeRedirect(params.get('redirect'))
  const purchase = pendingPurchase(target)
  const { session, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const prev = document.title
    document.title = 'Connexion — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  // Déjà connecté : on file directement vers la destination.
  if (!loading && session && !submitting) return <Navigate to={target ?? '/'} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const parsed = schema.safeParse({ email, password })
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
      const { error } = await supabase.auth.signInWithPassword(parsed.data)
      if (error) {
        setFormError(loginErrorMessage(error))
        return
      }
      navigate(target ?? '/', { replace: true })
    } catch {
      setFormError('Connexion au serveur impossible. Vérifiez votre connexion internet, puis réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell switchTo={{ prompt: 'Pas encore de compte ?', label: 'Créer un compte', to: withRedirect('/inscription', target) }}>
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          {purchase ? (
            <span className="inline-flex w-max max-w-full items-center gap-1.5 rounded-full bg-[rgba(0,134,237,0.12)] py-1 pl-2 pr-3 text-[13px] font-medium leading-[15.6px] text-[var(--glow-blue-dark)]">
              <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">Encore une étape pour votre numéro {purchase}</span>
            </span>
          ) : null}
          <h1 className="font-glow-display text-[32px] font-medium leading-[35.2px] tracking-[-1.28px] text-black min-[810px]:text-[40px] min-[810px]:leading-[44px] min-[810px]:tracking-[-1.6px]">
            Bon retour sur <span className="text-[var(--glow-blue)]">Numflash</span>
          </h1>
          <p className="text-[16px] leading-[24px] tracking-[-0.32px] text-[var(--glow-text)] opacity-80 min-[810px]:text-[17px] min-[810px]:leading-[25.5px]">
            {purchase ? 'Connectez-vous pour finaliser votre achat : votre sélection vous attend.' : 'Connectez-vous pour acheter vos numéros et recevoir vos codes SMS.'}
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {formError ? <FormAlert>{formError}</FormAlert> : null}
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
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            labelAside={
              <a href={FORGOT_URL} target="_blank" rel="noreferrer" className="text-[13px] font-medium leading-[16px] text-[var(--glow-blue-dark)] hover:underline">
                Mot de passe oublié ?
              </a>
            }
            required
          />
          <SubmitButton loading={submitting} loadingLabel="Connexion…">
            Se connecter
          </SubmitButton>
        </form>

        <OrDivider />

        <Link
          to={withRedirect('/inscription', target)}
          className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-medium leading-[18px] text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(222,222,222)] transition-colors hover:bg-[rgb(252,252,252)] hover:ring-[rgb(200,200,200)]"
        >
          Pas encore de compte ? <span className="text-[var(--glow-blue-dark)]">Inscription gratuite</span>
        </Link>
      </div>
    </AuthShell>
  )
}
