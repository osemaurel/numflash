import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { Icon } from '../glow/primitives'

/* ------------------------------------------------------------------ */
/* Marque                                                              */
/* ------------------------------------------------------------------ */

/** Pictogramme Numflash (provisoire) : un éclair dans un cercle, au trait comme le modèle. */
export function LogoMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
      <circle cx="12" cy="12" r="10.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.75" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path d="M12.9 6.6 8.9 12.6h3.1l-.9 4.8 4-6h-3.1l.9-4.8Z" fill="currentColor" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
    </svg>
  )
}

export function Wordmark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" aria-label="Numflash — accueil" className={cn('flex h-[39px] items-center gap-1.5', className)}>
      <LogoMark className={cn('h-8 w-8', light ? 'text-white' : 'text-[var(--glow-blue)]')} />
      <span className={cn('font-glow-display text-[20px] font-semibold leading-[30px] tracking-[-0.4px]', light ? 'text-white' : 'text-black')}>Numflash</span>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* Boutons et liens                                                    */
/* ------------------------------------------------------------------ */

export function Chevron() {
  return (
    <span className="relative h-[9px] w-1.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
      <Icon name="chevronRight" className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white opacity-60" />
    </span>
  )
}

/** Bouton principal bleu du modèle (texte + chevron). */
export function PrimaryLink({ to, children, className, large = false }: { to: string; children: ReactNode; className?: string; large?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-[var(--glow-blue)] px-4 py-3 text-white transition-colors duration-200 hover:bg-[var(--glow-blue-dark)]',
        className,
      )}
    >
      <span className={cn('font-medium', large ? 'text-[16px] leading-[19.2px]' : 'text-[14px] leading-[16.8px]')}>{children}</span>
      <Chevron />
    </Link>
  )
}

/** Lien texte + flèche (« Start trading → » du modèle). */
export function ArrowLink({ to, href, children, color, className }: { to?: string; href?: string; children: ReactNode; color?: string; className?: string }) {
  const inner = (
    <>
      <span className="text-[15px] font-medium leading-[22.5px]">{children}</span>
      <span className="relative h-[22.5px] w-6 shrink-0 transition-transform duration-200 group-hover:translate-x-1">
        <Icon name="arrowRight" className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2" />
      </span>
    </>
  )
  const cls = cn('group relative z-[2] inline-flex items-center gap-1.5 self-start', className)
  return to ? (
    <Link to={to} className={cls} style={{ color }}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={cls} style={{ color }}>
      {inner}
    </a>
  )
}

/* ------------------------------------------------------------------ */
/* Pastilles et puces                                                  */
/* ------------------------------------------------------------------ */

export function Pill({ icon: I, children, tone = 'blue', className }: { icon: LucideIcon; children: ReactNode; tone?: 'blue' | 'white' | 'gold'; className?: string }) {
  const tones = {
    blue: 'bg-[var(--glow-blue)] text-[var(--glow-bg)]',
    white: 'bg-white text-[var(--glow-blue-dark)]',
    gold: 'bg-[var(--glow-gold)] text-[var(--glow-bg)]',
  }
  return (
    <span className={cn('inline-flex w-max items-center gap-1.5 rounded-full py-[3px] pl-1.5 pr-2', tones[tone], className)}>
      <I className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      <span className="font-glow-display text-[14px] font-medium leading-[14px]">{children}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

/** Couleurs de repère des services (pastilles avec initiale, sans reprendre les logos déposés). */
export const SERVICE_STYLE: Record<string, { bg: string; letter: string }> = {
  WhatsApp: { bg: '#25D366', letter: 'W' },
  Telegram: { bg: '#2AABEE', letter: 'T' },
  Google: { bg: '#4285F4', letter: 'G' },
  Facebook: { bg: '#1877F2', letter: 'f' },
  Instagram: { bg: '#E1306C', letter: 'I' },
  TikTok: { bg: '#111111', letter: 'T' },
  Discord: { bg: '#5865F2', letter: 'D' },
  'Twitter / X': { bg: '#000000', letter: 'X' },
  Amazon: { bg: '#FF9900', letter: 'a' },
  Microsoft: { bg: '#00A4EF', letter: 'M' },
  Uber: { bg: '#000000', letter: 'U' },
  Tinder: { bg: '#FE3C72', letter: 't' },
}

export function ServiceTile({ name, size = 38, radius = 8, className }: { name: string; size?: number; radius?: number; className?: string }) {
  const s = SERVICE_STYLE[name] ?? { bg: 'var(--glow-blue)', letter: name.charAt(0) }
  return (
    <span
      aria-hidden
      className={cn('font-glow-display flex shrink-0 items-center justify-center font-semibold text-white', className)}
      style={{ width: size, height: size, borderRadius: radius, background: s.bg, fontSize: size * 0.47, lineHeight: 1 }}
    >
      {s.letter}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Montants                                                            */
/* ------------------------------------------------------------------ */

/** Montant signé pour les historiques : « +5 000 FCFA » / « −600 FCFA ». */
export function signedFCFA(n: number) {
  return `${n < 0 ? '−' : '+'}${formatFCFA(Math.abs(n))}`
}

/** Nombre seul au format FCFA (espace fine insécable entre milliers). */
export function digits(n: number) {
  return formatFCFA(n).replace(/\s?FCFA$/, '')
}
