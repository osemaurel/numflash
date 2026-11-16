import { useState } from 'react'
import { cn } from '@/lib/utils'
import { networkLogo, networkStyle } from '@/lib/payment'

/** Logo officiel d'un réseau Mobile Money, ou pastille à initiale s'il n'y en a pas (ou si l'image échoue). */
export function NetworkLogo({ code, name, size = 36, radius = 10, className }: { code: string; name: string; size?: number; radius?: number; className?: string }) {
  const logo = networkLogo(code)
  const [failed, setFailed] = useState(false)
  if (logo && !failed) {
    return (
      <span
        aria-hidden
        className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-inset ring-[rgba(0,0,0,0.06)]', className)}
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <img
          src={logo.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={logo.fit === 'cover' ? 'h-full w-full object-cover' : 'h-[86%] w-[86%] object-contain'}
          style={logo.zoom ? { transform: `scale(${logo.zoom})` } : undefined}
        />
      </span>
    )
  }
  const s = networkStyle(code, name)
  return (
    <span
      aria-hidden
      className={cn('font-glow-display flex shrink-0 items-center justify-center font-bold', className)}
      style={{ width: size, height: size, borderRadius: radius, background: s.bg, color: s.fg, fontSize: size * 0.44 }}
    >
      {s.letter}
    </span>
  )
}
