import type { CSSProperties, ReactNode } from 'react'
import { motion, type Transition } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GLOW_ICONS, type GlowIconName } from './glowIcons'

export const ASSET = '/glow'

/** Icône monochrome en ligne : la couleur suit `color` (currentColor). */
export function Icon({ name, className, style }: { name: GlowIconName; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full', className)}
      style={style}
      // Contenu statique généré depuis le modèle (aucune donnée utilisateur).
      dangerouslySetInnerHTML={{ __html: GLOW_ICONS[name] }}
    />
  )
}

/** Icône multicolore servie depuis /public/glow/icons. */
export function SvgImg({ name, className, alt = '', style }: { name: string; className?: string; alt?: string; style?: CSSProperties }) {
  return <img src={`${ASSET}/icons/${name}.svg`} alt={alt} className={className} style={style} draggable={false} decoding="async" />
}

/** Icône en masque : la forme vient du SVG, la couleur de `background`. */
export function MaskIcon({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  const url = `url(${ASSET}/icons/${name}.svg)`
  return <span aria-hidden className={cn('glow-mask inline-block shrink-0', className)} style={{ WebkitMaskImage: url, maskImage: url, ...style }} />
}

export function Img({
  src,
  className,
  alt = '',
  eager = false,
  style,
}: {
  src: string
  className?: string
  alt?: string
  eager?: boolean
  style?: CSSProperties
}) {
  return (
    <img
      src={`${ASSET}/img/${src}`}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Animations : mêmes réglages que le modèle Framer (moteur identique) */
/* ------------------------------------------------------------------ */

export const EASE_APPEAR = [0.12, 0.23, 0.5, 1] as const

export const spring = (bounce: number, duration: number, delay = 0): Transition => ({ type: 'spring', bounce, duration, delay })

interface RevealProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  /** État de départ (et de sortie si `replay`). */
  from: { opacity?: number; x?: number; y?: number; scale?: number }
  transition: Transition
  /** Part visible nécessaire pour déclencher (0 = au premier pixel). */
  amount?: number
  /** true : rejoue à chaque entrée dans l'écran (animateOnce:false dans Framer). */
  replay?: boolean
  as?: 'div' | 'figure' | 'span'
}

/** Apparition au défilement (effet « Appear » de Framer). */
export function Reveal({ children, className, style, from, transition, amount = 0.5, replay = false, as = 'div' }: RevealProps) {
  const Comp = as === 'figure' ? motion.figure : as === 'span' ? motion.span : motion.div
  const initial = { opacity: from.opacity ?? 0, x: from.x ?? 0, y: from.y ?? 0, scale: from.scale ?? 1 }
  return (
    <Comp
      className={className}
      style={style}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, transition }}
      // Sortie : retour à l'état initial avec la même transition (comportement Framer).
      viewport={{ once: !replay, amount }}
      transition={transition}
    >
      {children}
    </Comp>
  )
}

/** Animation d'arrivée au chargement (effet « appear » de la première vue). */
export function Appear({
  children,
  className,
  style,
  y = 0,
  delay = 0,
  duration = 0.4,
}: {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  y?: number
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0.001, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', ease: EASE_APPEAR, duration, delay }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Éléments récurrents                                                 */
/* ------------------------------------------------------------------ */

/** Pastille bleue « Cashback », « Stocks »… (icône + libellé). */
export function Pill({
  icon,
  children,
  tone = 'blue',
  className,
}: {
  icon: GlowIconName
  children: ReactNode
  tone?: 'blue' | 'white' | 'gold'
  className?: string
}) {
  const tones = {
    blue: 'bg-[var(--glow-blue)] text-[var(--glow-bg)]',
    white: 'bg-white text-[var(--glow-blue-dark)]',
    gold: 'bg-[var(--glow-gold)] text-[var(--glow-bg)]',
  }
  return (
    <span className={cn('inline-flex w-max items-center gap-1.5 rounded-full px-2 py-[3px]', tones[tone], className)}>
      <Icon name={icon} className="h-[18px] w-[18px]" />
      <span className="text-[14px] font-medium leading-[16.8px] tracking-[-0.28px]">{children}</span>
    </span>
  )
}

/** Puce cochée des listes (« Instant Cashback »…). */
export function CheckItem({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <li className="flex h-8 items-center gap-2 rounded-[9px]">
      <MaskIcon name="checkCircle" className={cn('h-5 w-5', light ? 'bg-white' : 'bg-[var(--glow-blue)]')} />
      <span className={cn('text-[15px] font-medium leading-[22.5px] tracking-[-0.15px]', light ? 'text-[var(--glow-bg)]' : 'text-[var(--glow-text)]')}>{children}</span>
    </li>
  )
}
