import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE_APPEAR } from '../glow/primitives'
import { PrimaryLink, Wordmark } from './ui'

export const NAV = [
  { label: 'Fonctionnement', href: '#fonctionnement' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'Affiliation', href: '#affiliation' },
  { label: 'FAQ', href: '#faq' },
]

/** En-tête fixe du modèle : transparent en haut, blanc après 100 px, masqué en descendant. */
export default function LandingHeader() {
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
      <header className={cn('hidden h-16 items-center justify-center px-[15px] transition-colors duration-300 min-[810px]:flex', solid ? 'bg-white' : 'bg-white/0')}>
        <motion.div
          className="flex w-full max-w-[1138px] items-center"
          initial={{ opacity: 0.001, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'tween', ease: EASE_APPEAR, duration: 0.6, delay: 0.2 }}
        >
          <nav className="flex flex-1 basis-0 items-center">
            <Wordmark />
          </nav>
          <nav className="flex items-center justify-center gap-5" aria-label="Navigation principale">
            {NAV.map((l) => (
              <a key={l.label} href={l.href} className="text-[15px] font-medium leading-[22.5px] text-black transition-opacity hover:opacity-60">
                {l.label}
              </a>
            ))}
          </nav>
          <nav className="flex flex-1 basis-0 items-center justify-end gap-5">
            <Link to="/connexion" className="text-[15px] font-medium leading-[22.5px] text-black transition-opacity hover:opacity-60">
              Connexion
            </Link>
            <PrimaryLink to="/inscription">Créer un compte</PrimaryLink>
          </nav>
        </motion.div>
      </header>

      {/* Téléphone : menu repliable */}
      <header className="overflow-hidden bg-white p-2.5 min-[810px]:hidden">
        <div className="flex h-11 items-center justify-between">
          <div className="pl-1.5">
            <Wordmark />
          </div>
          <button type="button" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="relative h-11 w-11">
            <motion.span className="absolute left-3 h-0.5 w-5 rounded-[10px] bg-[var(--glow-gray)]" animate={open ? { top: 21, rotate: 45 } : { top: 16, rotate: 0 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
            <motion.span className="absolute left-3 h-0.5 w-5 rounded-[10px] bg-[var(--glow-gray)]" animate={open ? { top: 21, rotate: -45 } : { top: 27, rotate: 0 }} transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }} />
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div key="menu" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}>
              <nav className="flex flex-col items-center gap-4 py-4" aria-label="Navigation principale">
                {NAV.map((l) => (
                  <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="text-[15px] font-medium leading-[22.5px] text-black">
                    {l.label}
                  </a>
                ))}
                <Link to="/connexion" className="text-[15px] font-medium leading-[22.5px] text-black">
                  Connexion
                </Link>
              </nav>
              <div className="px-1.5 pb-1.5">
                <PrimaryLink to="/inscription" large className="w-full">
                  Créer un compte
                </PrimaryLink>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>
    </motion.div>
  )
}
