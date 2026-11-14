import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDown, Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Briques de l'administration, dans le design de la landing et de l'espace client.
 */

export { Card, PageHeader, SkeletonRows, Avatar } from '../client/ui'

/* ------------------------------------------------------------------ */
/* Champs                                                              */
/* ------------------------------------------------------------------ */

export const inputClass =
  'h-11 w-full rounded-xl bg-white px-3.5 text-[16px] leading-[20px] tracking-[-0.3px] text-black outline-none shadow-[0px_1px_2px_0px_rgba(16,35,41,0.06)] ring-1 ring-inset ring-[rgb(222,222,222)] transition-shadow placeholder:text-[rgb(160,160,160)] hover:ring-[rgb(200,200,200)] focus:ring-2 focus:ring-[var(--glow-blue)] aria-[invalid=true]:ring-[rgb(248,113,113)] min-[810px]:text-[15px]'

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn(inputClass, 'appearance-none pr-10', className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(140,140,140)]" strokeWidth={2} aria-hidden />
    </div>
  )
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-text)]">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] font-medium leading-[18px] text-[rgb(220,38,38)]">{error}</p>
      ) : hint ? (
        <p className="text-[13px] leading-[18px] text-[var(--glow-gray)]">{hint}</p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-[var(--glow-blue)] text-white hover:bg-[var(--glow-blue-dark)] shadow-[0_8px_20px_-10px_rgba(0,133,238,0.6)]',
  secondary: 'bg-white text-[var(--glow-text)] ring-1 ring-inset ring-[rgb(222,222,222)] hover:bg-[rgb(252,252,252)] hover:ring-[rgb(200,200,200)]',
  danger: 'bg-white text-[rgb(185,28,28)] ring-1 ring-inset ring-[rgb(254,202,202)] hover:bg-[rgb(254,242,242)]',
  ghost: 'text-[rgb(90,90,90)] hover:bg-[var(--glow-bg)] hover:text-black',
  dark: 'bg-[rgb(185,28,28)] text-white hover:bg-[rgb(160,24,24)]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: I,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: LucideIcon }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55',
        size === 'sm' ? 'h-9 px-3 text-[14px]' : 'h-11 px-4 text-[15px]',
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} aria-hidden /> : I ? <I className="h-4 w-4" strokeWidth={2} aria-hidden /> : null}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Sélecteurs                                                          */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-inset ring-[var(--glow-line)] [scrollbar-width:none] min-[810px]:w-max">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-10 flex-1 shrink-0 whitespace-nowrap rounded-xl px-4 text-[14px] font-medium transition-colors min-[810px]:flex-none',
              on ? 'bg-[var(--glow-blue)] text-white' : 'text-[rgb(90,90,90)] hover:bg-[var(--glow-bg)] hover:text-black',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, busy, onChange, label }: { checked: boolean; busy: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glow-blue)] focus-visible:ring-offset-2 disabled:opacity-60',
        checked ? 'bg-[var(--glow-blue)]' : 'bg-[rgb(214,214,214)]',
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Indicateurs                                                         */
/* ------------------------------------------------------------------ */

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'blue' | 'red' | 'green' | 'amber'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-[var(--glow-bg)] text-[var(--glow-gray)]',
    blue: 'bg-[rgb(222,242,255)] text-[var(--glow-blue-dark)]',
    red: 'bg-[rgb(254,242,242)] text-[rgb(185,28,28)]',
    green: 'bg-[rgb(232,246,234)] text-[rgb(28,120,28)]',
    amber: 'bg-[rgb(255,244,229)] text-[rgb(178,98,0)]',
  }
  return <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold', tones[tone])}>{children}</span>
}

export function Kpi({
  icon: I,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'danger' | 'hero'
}) {
  const hero = tone === 'hero'
  return (
    <div
      className={cn('relative flex min-h-[132px] flex-col justify-between gap-3 overflow-hidden rounded-3xl p-4 min-[810px]:p-5', hero ? 'text-white' : 'bg-white ring-1 ring-inset ring-[var(--glow-line)]')}
      style={hero ? { backgroundImage: 'linear-gradient(145deg, #0085ee 0%, rgb(114, 189, 247) 100%)' } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[13px] font-medium leading-[16px]', hero ? 'text-white/85' : 'text-[var(--glow-gray)]')}>{label}</span>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', hero ? 'bg-white/20' : tone === 'danger' ? 'bg-[rgb(254,242,242)]' : 'bg-[var(--glow-bg)]')}>
          <I className={cn('h-4 w-4', hero ? 'text-white' : tone === 'danger' ? 'text-[rgb(185,28,28)]' : 'text-[var(--glow-blue)]')} strokeWidth={2} aria-hidden />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className={cn('font-glow-display text-[24px] font-semibold leading-[28px] tracking-[-0.6px] min-[810px]:text-[28px] min-[810px]:leading-[32px]', hero ? 'text-white' : tone === 'danger' ? 'text-[rgb(185,28,28)]' : 'text-black')}>
          {value}
        </span>
        {hint ? <span className={cn('text-[12px] leading-[16px]', hero ? 'text-white/80' : 'text-[var(--glow-gray)]')}>{hint}</span> : null}
      </div>
    </div>
  )
}

export function Notice({ tone = 'red', icon: I, children }: { tone?: 'red' | 'amber' | 'blue'; icon: LucideIcon; children: ReactNode }) {
  const tones = {
    red: 'bg-[rgb(254,242,242)] text-[rgb(153,27,27)] ring-[rgb(254,202,202)]',
    amber: 'bg-[rgb(255,248,235)] text-[rgb(146,80,0)] ring-[rgb(253,224,170)]',
    blue: 'bg-[rgb(236,246,255)] text-[var(--glow-blue-dark)] ring-[rgb(196,226,252)]',
  }
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-2xl px-4 py-3.5 text-[14px] leading-[20px] ring-1 ring-inset', tones[tone])}>
      <I className="mt-0.5 h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-[var(--glow-bg)] px-4 py-6 text-center text-[14px] text-[var(--glow-gray)]">{children}</p>
}
