import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Gift, LogOut, Mail, MessageCircle, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { SUPPORT_WHATSAPP_URL } from '../landing/facts'
import { useLogout } from './ClientShell'
import { Avatar, Card, PageHeader, displayName, secondaryButton } from './ui'

const memberSince = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

function Row({ icon: I, label, value }: { icon: typeof Mail; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--glow-bg)]">
        <I className="h-[18px] w-[18px] text-[rgb(90,90,90)]" strokeWidth={1.9} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] text-[var(--glow-gray)]">{label}</span>
        <span className="truncate text-[15px] font-medium text-black">{value}</span>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const { profile, isAdmin } = useProfile()
  const logout = useLogout()
  const name = displayName(profile?.full_name, user?.email)
  const since = user?.created_at ? memberSince.format(new Date(user.created_at)) : null

  useEffect(() => {
    const prev = document.title
    document.title = 'Profil — Numflash'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 min-[810px]:gap-6">
      <PageHeader title="Votre " accent="profil" />

      <div className="grid grid-cols-1 gap-5 min-[810px]:gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_380px] min-[1200px]:items-start">
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={name} size={64} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-glow-display truncate text-[22px] font-medium leading-[26px] tracking-[-0.5px] text-black">{name}</span>
              {since ? <span className="text-[14px] text-[var(--glow-gray)]">Membre depuis {since}</span> : null}
            </div>
          </div>
          <div className="flex flex-col divide-y divide-[var(--glow-line)] border-t border-[var(--glow-line)] pt-4">
            <Row icon={UserRound} label="Nom complet" value={profile?.full_name || '—'} />
            <Row icon={Mail} label="Adresse e-mail" value={user?.email ?? '—'} />
            <Row icon={Phone} label="Téléphone" value={profile?.phone || '—'} />
          </div>
          <p className="rounded-2xl bg-[var(--glow-bg)] px-4 py-3 text-[13px] leading-[19px] text-[var(--glow-gray)]">Pour modifier ces informations, contactez l’assistance sur WhatsApp.</p>
        </Card>

        <div className="flex flex-col gap-5 min-[810px]:gap-6">
          <Card title="Assistance">
            <p className="-mt-2 text-[14px] leading-[20px] text-[var(--glow-gray)]">Une question sur une recharge ou un numéro ? Écrivez-nous sur WhatsApp.</p>
            <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className={secondaryButton}>
              <MessageCircle className="h-[18px] w-[18px] text-[#1fa855]" strokeWidth={2} aria-hidden />
              Contacter l’assistance
            </a>
          </Card>

          <Card title="Affiliation" aside={<span className="rounded-full bg-[var(--glow-bg)] px-2 py-0.5 text-[12px] font-semibold text-[var(--glow-gray)]">Bientôt</span>}>
            <p className="-mt-2 flex items-start gap-2 text-[14px] leading-[20px] text-[var(--glow-gray)]">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-[var(--glow-gold)]" strokeWidth={2} aria-hidden />
              Le programme de parrainage arrive bientôt dans votre espace.
            </p>
          </Card>

          <div className="flex flex-col gap-2">
            {isAdmin ? (
              <Link to="/admin" className={secondaryButton}>
                <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                Administration
              </Link>
            ) : null}
            <button type="button" onClick={() => void logout()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[15px] font-medium text-[rgb(185,28,28)] ring-1 ring-inset ring-[rgb(254,202,202)] transition-colors hover:bg-[rgb(254,242,242)]">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
