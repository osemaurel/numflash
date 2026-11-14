import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE_APPEAR, Icon } from './primitives'

export const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQs', href: '#faqs' },
  { label: 'Contact', href: 'mailto:info@example.com' },
]

export function GlowWordmark({ className }: { className?: string }) {
  return (
    <a href="#" aria-label="Glow — accueil" className={cn('flex h-[39px] items-center gap-1', className)}>
      <span className="relative h-[39px] w-[33px]">
        <Icon name="glowLogo" className="absolute -left-1.5 top-0 h-[39px] w-[39px] text-black" />
      </span>
      <span className="font-glow-display text-[20px] font-semibold leading-[30px] tracking-[-0.4px] text-black">Glow</span>
    </a>
  )
}

export function PrimaryButton({ children, href = '#', className, large = false }: { children: React.ReactNode; href?: string; className?: string; large?: boolean }) {
  return (
    <a
      href={href}
      className={cn(
        'group inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-[var(--glow-blue)] px-4 py-3 text-white transition-colors duration-200 hover:bg-[var(--glow-blue-dark)]',
        className,
      )}
    >
      <span className={cn('font-medium', large ? 'text-[16px] leading-[19.2px]' : 'text-[14px] leading-[16.8px]')}>{children}</span>
      <span className="relative h-[9px] w-1.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
        <Icon name="chevronRight" className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-white opacity-60" />
      </span>
    </a>
  )
}

/**
 * En-tête fixe : transparent en haut de page, fond blanc après 100 px,
 * masqué quand on descend et réaffiché dès qu'on remonte (comme le modèle).
 */
export default function GlowHeader() {
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setSolid(y > 100)
      const delta = y - lastY.current
      if (y < 100) setHidden(false)
      else if (delta > 4) setHidden(true)
      else if (delta < -4) setHidden(false)
      lastY.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-10"
      initial={false}
      animate={hidden && !open ? { y: -150, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
    >
      {/* Bureau et tablette */}
      <header
        className={cn('hidden h-16 items-center justify-center px-[15px] transition-colors duration-300 min-[810px]:flex', solid ? 'bg-white' : 'bg-white/0')}
      >
        <motion.div
          className="flex w-full max-w-[1138px] items-center"
          initial={{ opacity: 0.001, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'tween', ease: EASE_APPEAR, duration: 0.6, delay: 0.2 }}
        >
          <nav className="flex flex-1 basis-0 items-center gap-1">
            <GlowWordmark />
          </nav>
          <nav className="flex flex-1 basis-0 items-center justify-center gap-5">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-[15px] font-medium leading-[22.5px] text-black transition-opacity hover:opacity-60">
                {l.label}
              </a>
            ))}
          </nav>
          <nav className="flex flex-1 basis-0 items-center justify-end gap-5">
            <PrimaryButton>Download app</PrimaryButton>
          </nav>
        </motion.div>
      </header>

      {/* Téléphone : menu repliable */}
      <header className="overflow-hidden bg-white p-2.5 min-[810px]:hidden">
        <div className="flex h-11 items-center justify-between">
          <div className="pl-1.5">
            <GlowWordmark />
          </div>
          <button type="button" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="relative h-11 w-11">
            <motion.span
              className="absolute left-3 h-0.5 w-5 rounded-[10px] bg-[var(--glow-gray)]"
              animate={open ? { top: 21, rotate: 45 } : { top: 16, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
            <motion.span
              className="absolute left-3 h-0.5 w-5 rounded-[10px] bg-[var(--glow-gray)]"
              animate={open ? { top: 21, rotate: -45 } : { top: 27, rotate: 0 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            >
              <nav className="flex flex-col items-center gap-4 py-4">
                {NAV_LINKS.map((l) => (
                  <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="text-[15px] font-medium leading-[22.5px] text-black">
                    {l.label}
                  </a>
                ))}
              </nav>
              <div className="px-1.5 pb-1.5">
                <PrimaryButton large className="w-full">
                  Download app
                </PrimaryButton>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </motion.div>
  )
}
