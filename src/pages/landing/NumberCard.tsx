import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Img, spring } from '../glow/primitives'
import { LogoMark } from './ui'

export type CardTone = 'blue' | 'gold' | 'black'

/** Numéros d'illustration (plages réservées à la fiction). */
const TONES: Record<CardTone, { bg: string; country: string; number: string; accent: string }> = {
  blue: { bg: 'rgb(0, 111, 230)', country: 'Royaume-Uni', number: '+44 7700 900123', accent: '#fff' },
  gold: { bg: 'rgb(153, 126, 67)', country: 'France', number: '+33 6 39 98 12 34', accent: 'rgb(250, 219, 132)' },
  black: { bg: 'rgb(13, 13, 13)', country: 'États-Unis', number: '+1 202 555 0147', accent: 'rgb(153, 153, 153)' },
}

const CARD_SHADOW =
  'rgba(14, 52, 69, 0.11) 0px 0.602187px 2.28831px -0.583333px, rgba(14, 52, 69, 0.13) 0px 2.28853px 8.69643px -1.16667px, rgba(14, 52, 69, 0.2) 0px 10px 38px -1.75px'

/** Carte « numéro virtuel » (404 × 229) : même construction que la carte du modèle. */
export function NumberCard({ tone, className, style }: { tone: CardTone; className?: string; style?: CSSProperties }) {
  const t = TONES[tone]
  return (
    <div
      className={cn('relative flex h-[229px] w-[404px] items-end justify-between overflow-hidden rounded-[22.44px]', className)}
      style={{ background: t.bg, boxShadow: CARD_SHADOW, padding: '12.82px 19.23px 12.82px 12.82px', ...style }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ WebkitMaskImage: 'linear-gradient(7deg, transparent 0%, #000 100%)', maskImage: 'linear-gradient(7deg, transparent 0%, #000 100%)' }}>
        <Img src="card-texture.webp" className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div className="relative flex items-center gap-1.5 pb-1 pl-1">
        <LogoMark className="h-[34px] w-[34px] text-white" />
        <p className="font-glow-display text-[21px] font-semibold leading-[31.5px] tracking-[-0.42px] text-white">Numflash</p>
      </div>
      <p className="font-glow-display relative pb-[18px] pr-1 text-[17px] font-semibold leading-[20px] tracking-[-0.2px]" style={{ color: t.accent }}>
        {t.number}
      </p>
      <div
        className="absolute right-[12.82px] top-[12.82px] z-[1] flex items-center justify-center rounded-[160px] bg-white/15 backdrop-blur-[13px]"
        style={{ padding: '4.81px 12.82px 4.81px 14.42px' }}
      >
        <p className="text-[16px] font-medium leading-[24px] tracking-[-0.32px] text-white">{t.country}</p>
      </div>
    </div>
  )
}

function PopIn({ delay, children, style }: { delay: number; children: ReactNode; style: CSSProperties }) {
  return (
    <motion.div
      className="absolute z-[1]"
      style={style}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={spring(0.2, 0.4, delay)}
    >
      {children}
    </motion.div>
  )
}

/** Pile de trois numéros (506 × 382), mêmes positions et animations que la pile de cartes du modèle. */
export function NumberStack() {
  return (
    <figure className="relative h-[382px] w-[506px]">
      <div className="absolute" style={{ left: 25.5, top: 96, transform: 'rotate(-18deg)' }}>
        <PopIn delay={0.2} style={{ position: 'relative' }}>
          <NumberCard tone="black" />
        </PopIn>
      </div>
      <div className="absolute" style={{ left: 60.5, top: 42, transform: 'rotate(-9deg)' }}>
        <PopIn delay={0.1} style={{ position: 'relative' }}>
          <NumberCard tone="gold" />
        </PopIn>
      </div>
      <PopIn delay={0} style={{ left: 102, top: 0 }}>
        <NumberCard tone="blue" />
      </PopIn>
    </figure>
  )
}
