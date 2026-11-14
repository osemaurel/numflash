import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Check, ChevronDown, Eye, EyeOff, Loader2, Lock, type LucideIcon } from 'lucide-react'
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
  hint,
  ...input
}: InputProps & { id: string; label: string; icon: LucideIcon; error?: string | null; labelAside?: ReactNode; trailing?: ReactNode; hint?: ReactNode }) {
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
      ) : (
        hint
      )}
    </div>
  )
}

export function PasswordField(props: InputProps & { id: string; label: string; error?: string | null; labelAside?: ReactNode; hint?: ReactNode }) {
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

/** Règle satisfaite ou non, affichée sous un champ (« 8 caractères minimum »). */
export function RuleHint({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-[13px] font-medium leading-[18px] transition-colors', ok ? 'text-[rgb(34,139,34)]' : 'text-[rgb(140,140,140)]')}>
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full transition-colors', ok ? 'bg-[rgb(34,139,34)]' : 'bg-[rgb(225,225,225)]')}>
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} aria-hidden />
      </span>
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ */
/* Téléphone : indicatif + numéro                                      */
/* ------------------------------------------------------------------ */

export interface DialCode {
  /** Code ISO du pays (sert aussi à présélectionner selon la langue du navigateur). */
  iso: string
  name: string
  flag: string
  dial: string
}

/** Afrique francophone d'abord, puis Maghreb et diaspora. */
export const DIAL_CODES: DialCode[] = [
  { iso: 'BJ', name: 'Bénin', flag: '🇧🇯', dial: '+229' },
  { iso: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dial: '+226' },
  { iso: 'BI', name: 'Burundi', flag: '🇧🇮', dial: '+257' },
  { iso: 'CM', name: 'Cameroun', flag: '🇨🇲', dial: '+237' },
  { iso: 'CF', name: 'Centrafrique', flag: '🇨🇫', dial: '+236' },
  { iso: 'KM', name: 'Comores', flag: '🇰🇲', dial: '+269' },
  { iso: 'CG', name: 'Congo', flag: '🇨🇬', dial: '+242' },
  { iso: 'CD', name: 'RD Congo', flag: '🇨🇩', dial: '+243' },
  { iso: 'CI', name: 'Côte d’Ivoire', flag: '🇨🇮', dial: '+225' },
  { iso: 'DJ', name: 'Djibouti', flag: '🇩🇯', dial: '+253' },
  { iso: 'GA', name: 'Gabon', flag: '🇬🇦', dial: '+241' },
  { iso: 'GN', name: 'Guinée', flag: '🇬🇳', dial: '+224' },
  { iso: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶', dial: '+240' },
  { iso: 'MG', name: 'Madagascar', flag: '🇲🇬', dial: '+261' },
  { iso: 'ML', name: 'Mali', flag: '🇲🇱', dial: '+223' },
  { iso: 'MR', name: 'Mauritanie', flag: '🇲🇷', dial: '+222' },
  { iso: 'NE', name: 'Niger', flag: '🇳🇪', dial: '+227' },
  { iso: 'RW', name: 'Rwanda', flag: '🇷🇼', dial: '+250' },
  { iso: 'SN', name: 'Sénégal', flag: '🇸🇳', dial: '+221' },
  { iso: 'TD', name: 'Tchad', flag: '🇹🇩', dial: '+235' },
  { iso: 'TG', name: 'Togo', flag: '🇹🇬', dial: '+228' },
  { iso: 'DZ', name: 'Algérie', flag: '🇩🇿', dial: '+213' },
  { iso: 'MA', name: 'Maroc', flag: '🇲🇦', dial: '+212' },
  { iso: 'TN', name: 'Tunisie', flag: '🇹🇳', dial: '+216' },
  { iso: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { iso: 'BE', name: 'Belgique', flag: '🇧🇪', dial: '+32' },
  { iso: 'CH', name: 'Suisse', flag: '🇨🇭', dial: '+41' },
  { iso: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
]

/** Valeur spéciale : l'utilisateur saisit le numéro complet, indicatif compris. */
export const OTHER_DIAL = 'autre'

/** Indicatif proposé par défaut : pays de la langue du navigateur (« fr-CI »), sinon le Bénin. */
export function defaultDialIso(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? []): string {
  for (const lang of languages) {
    const region = lang.split('-')[1]?.toUpperCase()
    if (region && DIAL_CODES.some((d) => d.iso === region)) return region
  }
  return 'BJ'
}

export function PhoneField({
  id,
  label,
  iso,
  onIsoChange,
  value,
  onChange,
  error,
}: {
  id: string
  label: string
  iso: string
  onIsoChange: (iso: string) => void
  value: string
  onChange: (value: string) => void
  error?: string | null
}) {
  const errorId = `${id}-erreur`
  const current = DIAL_CODES.find((d) => d.iso === iso)
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px] text-[var(--glow-text)]">
        {label}
      </label>
      <div
        className={cn(
          'flex h-12 w-full items-stretch overflow-hidden rounded-xl bg-white shadow-[0px_1px_2px_0px_rgba(16,35,41,0.06)] ring-1 ring-inset transition-shadow focus-within:ring-2',
          error ? 'ring-[rgb(248,113,113)] focus-within:ring-[rgb(220,38,38)]' : 'ring-[rgb(222,222,222)] hover:ring-[rgb(200,200,200)] focus-within:ring-[var(--glow-blue)]',
        )}
      >
        {/* Sélecteur natif (pratique sur mobile), habillé par l'étiquette affichée dessous. */}
        <div className="relative flex shrink-0 items-center gap-1.5 border-r border-[rgb(232,232,232)] pl-3.5 pr-2.5">
          <span className="text-[18px] leading-none" aria-hidden>
            {current?.flag ?? '🌐'}
          </span>
          <span className="text-[15px] font-medium tracking-[-0.3px] text-black">{current?.dial ?? 'Autre'}</span>
          <ChevronDown className="h-4 w-4 text-[rgb(150,150,150)]" strokeWidth={2} aria-hidden />
          <select
            aria-label="Indicatif du pays"
            value={current ? iso : OTHER_DIAL}
            onChange={(e) => onIsoChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {DIAL_CODES.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.flag} {d.name} ({d.dial})
              </option>
            ))}
            <option value={OTHER_DIAL}>🌐 Autre indicatif</option>
          </select>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete={current ? 'tel-national' : 'tel'}
          placeholder={current ? 'Votre numéro' : '+XXX numéro complet'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-[16px] leading-[20px] tracking-[-0.3px] text-black outline-none placeholder:text-[rgb(160,160,160)] min-[810px]:text-[15px]"
        />
      </div>
      {error ? (
        <p id={errorId} className="text-[13px] font-medium leading-[18px] text-[rgb(220,38,38)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Numéro international (« +22997123456 ») à partir de l'indicatif et de la saisie, ou null s'il est invalide. */
export function toInternational(iso: string, raw: string): string | null {
  const compact = raw.replace(/[\s.\-()]/g, '')
  const dial = DIAL_CODES.find((d) => d.iso === iso)?.dial
  if (!dial) return /^\+[0-9]{8,15}$/.test(compact) ? compact : null
  // Saisie déjà au format international (copier-coller) : acceptée telle quelle.
  if (compact.startsWith('+')) return /^\+[0-9]{8,15}$/.test(compact) ? compact : null
  if (!/^[0-9]{6,13}$/.test(compact)) return null
  const full = `${dial}${compact}`
  return full.length - 1 <= 15 ? full : null
}
