import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { NAV } from '../LandingHeader'
import { SUPPORT_WHATSAPP_URL } from '../facts'
import { Wordmark } from '../ui'

const link = 'text-[15px] font-medium leading-[22.5px] text-[var(--glow-text)] transition-opacity hover:opacity-60'

export default function Footer() {
  return (
    <footer className="flex flex-col items-center overflow-hidden px-8 py-[46px]">
      <div className="flex w-full max-w-[1138px] flex-col items-start gap-5 min-[810px]:gap-10">
        <div className="flex w-full items-center">
          <Wordmark />
          <div className="flex flex-1 items-center justify-end gap-2">
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label="Assistance WhatsApp" className="flex h-[30px] w-[30px] items-center justify-center opacity-60 transition-opacity hover:opacity-100">
              <MessageCircle className="h-6 w-6 text-black" strokeWidth={2} aria-hidden />
            </a>
          </div>
        </div>
        <nav className="grid w-full grid-cols-2 gap-5 min-[810px]:flex min-[810px]:items-center" aria-label="Liens du pied de page">
          {NAV.map((l) => (
            <p key={l.label} className="text-[15px] leading-[22.5px]">
              <a href={l.href} className={link}>
                {l.label}
              </a>
            </p>
          ))}
        </nav>
        <div className="flex w-full flex-col-reverse items-start gap-5 overflow-hidden min-[810px]:flex-row min-[810px]:items-start">
          <p className="text-[15px] font-medium leading-[22.5px] text-[var(--glow-gray)]">© {new Date().getFullYear()} Numflash</p>
          <nav className="grid w-full grid-cols-2 gap-5 overflow-hidden min-[810px]:flex min-[810px]:flex-1 min-[810px]:items-center min-[810px]:justify-end">
            <p className="text-[15px] leading-[22.5px]">
              <Link to="/connexion" className={link}>
                Connexion
              </Link>
            </p>
            <p className="text-[15px] leading-[22.5px]">
              <Link to="/inscription" className={link}>
                Créer un compte
              </Link>
            </p>
          </nav>
        </div>
      </div>
    </footer>
  )
}
