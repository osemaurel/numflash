import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Points de rupture du modèle : < 810 px, 810–1199 px, ≥ 1200 px. */
function current(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia('(min-width: 1200px)').matches) return 'desktop'
  if (window.matchMedia('(min-width: 810px)').matches) return 'tablet'
  return 'mobile'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(current)
  useEffect(() => {
    const mqs = [window.matchMedia('(min-width: 1200px)'), window.matchMedia('(min-width: 810px)')]
    const update = () => setBp(current())
    mqs.forEach((m) => m.addEventListener('change', update))
    return () => mqs.forEach((m) => m.removeEventListener('change', update))
  }, [])
  return bp
}

/** Bloc de taille fixe affiché à une échelle donnée (l'encombrement suit l'échelle). */
export function scaledBox(width: number, height: number, scale: number) {
  return {
    outer: { width: width * scale, height: height * scale, position: 'relative' as const },
    inner: { width, height, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute' as const, left: 0, top: 0 },
  }
}
