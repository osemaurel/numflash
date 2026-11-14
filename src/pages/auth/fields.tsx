import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Chevron } from '../landing/ui'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>

export function TextField({
  id,
  label,
  icon: I,
  error,
  labelAside,
  trailing,
  ...input
}: InputProps & { id: string; label: string; icon: LucideIcon; error?: string | null; labelAside?: ReactNode; trailing?: ReactNode }) {
  const errorId = `${id}-erreur`
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-text)]">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <I className={cn('pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2', error ? 'text-[rgb(220,38,38)]' : 'text-[rgb(150,150,150)]')} strokeWidth={1.8} aria-hidden />
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            // 16 px sur mobile : en dessous, iOS zoome sur le champ.
            'h-12 w-full rounded-xl bg-white pl-11 text-[16px] shadow-[0px_1px_2px_0px_rgba(16,35,41,0.06)] leading-[20px] tracking-[-0.3px] text-black outline-none ring-1 ring-inset transition-shadow placeholder:text-[rgb(160,160,160)] focus:ring-2 min-[810px]:text-[15px]',
            trailing ? 'pr-12' : 'pr-4',
            error ? 'ring-[rgb(248,113,113)] focus:ring-[rgb(220,38,38)]' : 'ring-[rgb(222,222,222)] hover:ring-[rgb(200,200,200)] focus:ring-[var(--glow-blue)]',
          )}
          {...input}
        />
        {trailing ? <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={errorId} className="text-[13px] font-medium leading-[18px] text-[rgb(220,38,38)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function PasswordField(props: InputProps & { id: string; label: string; error?: string | null; labelAside?: ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      icon={Lock}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(130,130,130)] transition-colors hover:bg-[var(--glow-bg)] hover:text-[var(--glow-text)]"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />}
        </button>
      }
    />
  )
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-[rgb(254,242,242)] px-3.5 py-3 text-[14px] leading-[20px] text-[rgb(153,27,27)] ring-1 ring-inset ring-[rgb(254,202,202)]">
      <AlertCircle className="mt-px h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export function SubmitButton({ loading, children, loadingLabel }: { loading: boolean; children: ReactNode; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--glow-blue)] px-4 text-white transition-colors duration-200 hover:bg-[var(--glow-blue-dark)] disabled:cursor-wait disabled:opacity-80"
      style={{ boxShadow: '0 10px 24px -10px rgba(0, 133, 238, 0.6)' }}
    >
      {loading ? (
        <>
          <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2.2} aria-hidden />
          <span className="text-[16px] font-medium leading-[19.2px]">{loadingLabel}</span>
        </>
      ) : (
        <>
          <span className="text-[16px] font-medium leading-[19.2px]">{children}</span>
          <Chevron />
        </>
      )}
    </button>
  )
}

/** Séparateur « ou » entre le formulaire et le lien vers l'autre page. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-[rgb(150,150,150)]" aria-hidden>
      <span className="h-px flex-1 bg-[rgb(228,228,228)]" />
      ou
      <span className="h-px flex-1 bg-[rgb(228,228,228)]" />
    </div>
  )
}
