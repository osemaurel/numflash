import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Icon, Img, SvgImg, spring } from './primitives'

export type CardTone = 'blue' | 'gold' | 'black'

const TONES: Record<CardTone, { bg: string; word?: string; wordColor?: string }> = {
  blue: { bg: 'rgb(0, 111, 230)' },
  gold: { bg: 'rgb(153, 126, 67)', word: 'Gold', wordColor: 'rgb(250, 219, 132)' },
  black: { bg: 'rgb(13, 13, 13)', word: 'Black', wordColor: 'rgb(153, 153, 153)' },
}

const CARD_SHADOW =
  'rgba(14, 52, 69, 0.11) 0px 0.602187px 2.28831px -0.583333px, rgba(14, 52, 69, 0.13) 0px 2.28853px 8.69643px -1.16667px, rgba(14, 52, 69, 0.2) 0px 10px 38px -1.75px'

/** Carte bancaire Glow (404 × 229 en taille de conception). */
export function GlowCard({ tone, className, style }: { tone: CardTone; className?: string; style?: CSSProperties }) {
  const t = TONES[tone]
  return (
    <div
      className={cn('relative flex h-[229px] w-[404px] items-end justify-between overflow-hidden rounded-[22.44px]', className)}
      style={{ background: t.bg, boxShadow: CARD_SHADOW, padding: '12.82px 19.23px 12.82px 12.82px', ...style }}
    >
      {/* Texture floutée qui donne le reflet */}
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ WebkitMaskImage: 'linear-gradient(7deg, transparent 0%, #000 100%)', maskImage: 'linear-gradient(7deg, transparent 0%, #000 100%)' }}>
        <Img src="card-texture.webp" className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div className="relative flex items-center">
        <Icon name="glowLogo" className="h-[41px] w-[41px] text-white" />
        <p className="font-glow-display text-[21px] font-semibold leading-[31.5px] tracking-[-0.42px] text-white">
          Glow{t.word ? <span style={{ color: t.wordColor }}> {t.word}</span> : null}
        </p>
      </div>
      <div className="relative flex items-center justify-end p-[12.82px]">
        <SvgImg name="visa" className="h-[25px] w-[77px]" />
      </div>
      <div
        className="absolute right-[12.82px] top-[12.82px] z-[1] flex items-center justify-center rounded-[160px] bg-white/15 backdrop-blur-[13px]"
        style={{ padding: '4.81px 12.82px 4.81px 14.42px' }}
      >
        <p className="text-[16px] font-medium leading-[24px] tracking-[-0.32px] text-white">One-time card</p>
      </div>
    </div>
  )
}

/** Mise à l'échelle d'un bloc de taille fixe sur la largeur disponible. */
export function Scaled({ width, height, children, className }: { width: number; height: number; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / width))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])
  return (
    <div ref={ref} className={cn('relative w-full', className)} style={{ height: height * scale }}>
      <div className="absolute left-0 top-0" style={{ width, height, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
        {children}
      </div>
    </div>
  )
}

/** Apparition d'une carte : 0,5 → 1 avec ressort (une seule fois, à mi-visibilité). */
function PopIn({ delay, children, style }: { delay: number; children: React.ReactNode; style: CSSProperties }) {
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

/** Pile Black / Gold / Bleu (506 × 382). */
export function CardStack() {
  return (
    <figure className="relative h-[382px] w-[506px]">
      <div className="absolute" style={{ left: 25.5, top: 96, transform: 'rotate(-18deg)' }}>
        <PopIn delay={0.2} style={{ position: 'relative' }}>
          <GlowCard tone="black" />
        </PopIn>
      </div>
      <div className="absolute" style={{ left: 60.5, top: 42, transform: 'rotate(-9deg)' }}>
        <PopIn delay={0.1} style={{ position: 'relative' }}>
          <GlowCard tone="gold" />
        </PopIn>
      </div>
      <PopIn delay={0} style={{ left: 102, top: 0 }}>
        <GlowCard tone="blue" />
      </PopIn>
    </figure>
  )
}
