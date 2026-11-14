import { GlowWordmark, NAV_LINKS } from '../GlowHeader'
import { MaskIcon } from '../primitives'

const SOCIALS = [
  { name: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/' },
  { name: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/' },
  { name: 'x', label: 'X', href: 'https://x.com/' },
  { name: 'discord', label: 'Discord', href: 'https://discord.com/' },
]

const LEGAL = [
  { label: 'Privacy policy', href: '#' },
  { label: 'Terms of services', href: '#' },
]

const link = 'text-[15px] font-medium leading-[22.5px] text-[var(--glow-text)] transition-opacity hover:opacity-60'

export default function Footer() {
  return (
    <footer className="flex flex-col items-center overflow-hidden px-8 py-[46px]">
      <div className="flex w-full max-w-[1138px] flex-col items-start gap-5 min-[810px]:gap-10">
        <div className="flex w-full items-center">
          <GlowWordmark />
          <div className="flex flex-1 items-center justify-end gap-2">
            {SOCIALS.map((s) => (
              <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden opacity-60 transition-opacity hover:opacity-100">
                <MaskIcon name={s.name} className="h-6 w-6 bg-black" />
              </a>
            ))}
          </div>
        </div>
        <nav className="grid w-full grid-cols-2 gap-5 min-[810px]:flex min-[810px]:items-center">
          {NAV_LINKS.map((l) => (
            <p key={l.label} className="text-[15px] leading-[22.5px]">
              <a href={l.href} className={link}>
                {l.label}
              </a>
            </p>
          ))}
        </nav>
        <div className="flex w-full flex-col-reverse items-start gap-5 overflow-hidden min-[810px]:flex-row min-[810px]:items-start">
          <p className="text-[15px] font-medium leading-[22.5px] text-[var(--glow-gray)]">Glow Inc.</p>
          <nav className="grid w-full grid-cols-2 gap-5 overflow-hidden min-[810px]:flex min-[810px]:flex-1 min-[810px]:items-center min-[810px]:justify-end">
            {LEGAL.map((l) => (
              <p key={l.label} className="text-[15px] leading-[22.5px]">
                <a href={l.href} className={link}>
                  {l.label}
                </a>
              </p>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
