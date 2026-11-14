import type { ReactNode } from 'react'
import { Gift, House, LogOut, MessageSquareText, Plus, ShoppingBag, UserRound, Wallet, type LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import '../glow/glow.css'
import { Wordmark } from '../landing/ui'

/*
 * Habillage de l'espace client, dans le design de la landing :
 * colonne de navigation sur grand écran, en-tête + barre d'onglets en bas sur mobile.
 */

export type DashboardTab = 'accueil' | 'acheter' | 'numeros' | 'solde' | 'profil'

const NAV: { key: DashboardTab; label: string; short: string; icon: LucideIcon }[] = [
  { key: 'accueil', label: 'Accueil', short: 'Accueil', icon: House },
  { key: 'acheter', label: 'Acheter un numéro', short: 'Acheter', icon: ShoppingBag },
  { key: 'numeros', label: 'Mes numéros', short: 'Numéros', icon: MessageSquareText },
  { key: 'solde', label: 'Solde', short: 'Solde', icon: Wallet },
  { key: 'profil', label: 'Profil', short: 'Profil', icon: UserRound },
]

export interface ShellUser {
  name: string
  email: string
  balance: number
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[rgb(222,242,255)] font-semibold text-[var(--glow-blue-dark)]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

function Sidebar({ active, user }: { active: DashboardTab; user: ShellUser }) {
  return (
    <aside className="sticky top-0 hidden h-[100svh] w-[264px] shrink-0 flex-col border-r border-[var(--glow-line)] bg-white px-4 pb-5 pt-6 min-[1024px]:flex">
      <Wordmark className="px-2" />
      <nav className="mt-9 flex flex-col gap-1" aria-label="Navigation principale">
        {NAV.map((n) => (
          <a
            key={n.key}
            href="#"
            aria-current={n.key === active ? 'page' : undefined}
            className={cn(
              'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium tracking-[-0.3px] transition-colors',
              n.key === active ? 'bg-[rgba(0,133,238,0.1)] text-[var(--glow-blue-dark)]' : 'text-[rgb(70,70,70)] hover:bg-[var(--glow-bg)] hover:text-black',
            )}
          >
            <n.icon className="h-5 w-5" strokeWidth={n.key === active ? 2.2 : 1.8} aria-hidden />
            {n.label}
          </a>
        ))}
        <span className="flex h-11 cursor-default items-center gap-3 rounded-xl px-3 text-[15px] font-medium tracking-[-0.3px] text-[rgb(170,170,170)]">
          <Gift className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          Affiliation
          <span className="ml-auto rounded-full bg-[var(--glow-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--glow-gray)]">Bientôt</span>
        </span>
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--glow-bg)] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--glow-gray)]">Votre solde</span>
            <span className="font-glow-display text-[22px] font-semibold leading-[26px] tracking-[-0.5px] text-black">{formatFCFA(user.balance)}</span>
          </div>
          <a href="#" className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--glow-blue)] text-[14px] font-medium text-white transition-colors hover:bg-[var(--glow-blue-dark)]">
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            Recharger
          </a>
        </div>
        <div className="flex items-center gap-3 px-1">
          <Avatar name={user.name} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-medium leading-[18px] text-black">{user.name}</span>
            <span className="truncate text-[12px] leading-[16px] text-[var(--glow-gray)]">{user.email}</span>
          </div>
          <button type="button" aria-label="Se déconnecter" className="flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(130,130,130)] transition-colors hover:bg-[var(--glow-bg)] hover:text-black">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  )
}

function MobileHeader({ user }: { user: ShellUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 bg-[rgba(248,247,247,0.88)] px-4 backdrop-blur-md min-[1024px]:hidden">
      <Wordmark />
      <div className="flex items-center gap-2">
        <a href="#" className="flex h-9 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-3 text-[14px] font-semibold tracking-[-0.3px] text-black ring-1 ring-inset ring-[rgb(228,228,228)]" aria-label="Votre solde">
          <Wallet className="h-4 w-4 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
          {formatFCFA(user.balance)}
        </a>
        <Avatar name={user.name} size={36} />
      </div>
    </header>
  )
}

function TabBar({ active }: { active: DashboardTab }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--glow-line)] bg-[rgba(255,255,255,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md min-[1024px]:hidden"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {NAV.map((n) => {
          const on = n.key === active
          return (
            <li key={n.key}>
              <a href="#" aria-current={on ? 'page' : undefined} className={cn('flex h-[62px] flex-col items-center justify-center gap-1', on ? 'text-[var(--glow-blue)]' : 'text-[rgb(140,140,140)]')}>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', on && 'bg-[rgba(0,133,238,0.1)]')}>
                  <n.icon className="h-[21px] w-[21px]" strokeWidth={on ? 2.2 : 1.8} aria-hidden />
                </span>
                <span className="text-[11px] font-medium leading-[13px]">{n.short}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function DashboardShell({ active, user, children }: { active: DashboardTab; user: ShellUser; children: ReactNode }) {
  return (
    <div className="glow-root flex min-h-[100svh] bg-[var(--glow-bg)]">
      <Sidebar active={active} user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} />
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-28 pt-3 min-[810px]:px-8 min-[1024px]:px-10 min-[1024px]:pb-12 min-[1024px]:pt-9">{children}</main>
      </div>
      <TabBar active={active} />
    </div>
  )
}
