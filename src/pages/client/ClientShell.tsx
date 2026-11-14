import { Suspense, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Gift, House, LogOut, MessageSquareText, Plus, ShieldCheck, ShoppingBag, UserRound, Wallet, type LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { signOut, useAuth } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useProfile } from '@/hooks/useProfile'
import '../glow/glow.css'
import { Wordmark } from '../landing/ui'
import { Avatar, displayName } from './ui'

/*
 * Habillage de l'espace client, dans le design de la landing :
 * colonne de navigation sur grand écran, en-tête + barre d'onglets en bas sur mobile.
 */

const NAV: { to: string; label: string; short: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Accueil', short: 'Accueil', icon: House, end: true },
  { to: '/acheter', label: 'Acheter un numéro', short: 'Acheter', icon: ShoppingBag },
  { to: '/numeros', label: 'Mes numéros', short: 'Numéros', icon: MessageSquareText },
  { to: '/wallet', label: 'Solde', short: 'Solde', icon: Wallet },
  { to: '/profil', label: 'Profil', short: 'Profil', icon: UserRound },
]

function useLogout() {
  const navigate = useNavigate()
  return async () => {
    await signOut()
    navigate('/', { replace: true })
  }
}

function BalanceText({ balance, loading }: { balance: number | null; loading: boolean }) {
  return <>{loading || balance === null ? '…' : formatFCFA(balance)}</>
}

function Sidebar() {
  const { user } = useAuth()
  const { profile, isAdmin } = useProfile()
  const { balance, loading } = useBalance()
  const logout = useLogout()
  const name = displayName(profile?.full_name, user?.email)
  const item = 'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium tracking-[-0.3px] transition-colors'

  return (
    <aside className="sticky top-0 hidden h-[100svh] w-[264px] shrink-0 flex-col border-r border-[var(--glow-line)] bg-white px-4 pb-5 pt-6 min-[1024px]:flex">
      <Wordmark className="px-2" />
      <nav className="mt-9 flex flex-col gap-1" aria-label="Navigation principale">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => cn(item, isActive ? 'bg-[rgba(0,133,238,0.1)] text-[var(--glow-blue-dark)]' : 'text-[rgb(70,70,70)] hover:bg-[var(--glow-bg)] hover:text-black')}
          >
            {({ isActive }) => (
              <>
                <n.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
        <span className={cn(item, 'cursor-default text-[rgb(170,170,170)]')}>
          <Gift className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          Affiliation
          <span className="ml-auto rounded-full bg-[var(--glow-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--glow-gray)]">Bientôt</span>
        </span>
        {isAdmin ? (
          <Link to="/admin" className={cn(item, 'mt-3 text-[rgb(70,70,70)] hover:bg-[var(--glow-bg)] hover:text-black')}>
            <ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            Administration
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--glow-bg)] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--glow-gray)]">Votre solde</span>
            <span className="font-glow-display text-[22px] font-semibold leading-[26px] tracking-[-0.5px] text-black" aria-live="polite">
              <BalanceText balance={balance} loading={loading} />
            </span>
          </div>
          <Link to="/wallet" className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--glow-blue)] text-[14px] font-medium text-white transition-colors hover:bg-[var(--glow-blue-dark)]">
            <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            Recharger
          </Link>
        </div>
        <div className="flex items-center gap-3 px-1">
          <Link to="/profil" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg">
            <Avatar name={name} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-medium leading-[18px] text-black">{name}</span>
              <span className="truncate text-[12px] leading-[16px] text-[var(--glow-gray)]">{user?.email}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Se déconnecter"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(130,130,130)] transition-colors hover:bg-[var(--glow-bg)] hover:text-black"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  )
}

function MobileHeader() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { balance, loading } = useBalance()
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 bg-[rgba(248,247,247,0.88)] px-4 backdrop-blur-md min-[1024px]:hidden">
      <Wordmark />
      <div className="flex items-center gap-2">
        <Link
          to="/wallet"
          className="flex h-9 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-3 text-[14px] font-semibold tracking-[-0.3px] text-black ring-1 ring-inset ring-[rgb(228,228,228)]"
          aria-label="Votre solde, ouvrir le portefeuille"
        >
          <Wallet className="h-4 w-4 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
          <BalanceText balance={balance} loading={loading} />
        </Link>
        <Link to="/profil" aria-label="Votre profil">
          <Avatar name={displayName(profile?.full_name, user?.email)} size={36} />
        </Link>
      </div>
    </header>
  )
}

function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--glow-line)] bg-[rgba(255,255,255,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md min-[1024px]:hidden"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.end} className={({ isActive }) => cn('flex h-[62px] flex-col items-center justify-center gap-1', isActive ? 'text-[var(--glow-blue)]' : 'text-[rgb(140,140,140)]')}>
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-[rgba(0,133,238,0.1)]')}>
                    <n.icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                  </span>
                  <span className="text-[11px] font-medium leading-[13px]">{n.short}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Chargement d'une page de l'espace client : la structure reste en place. */
function PageFallback() {
  return (
    <div className="flex flex-col gap-4" aria-label="Chargement">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-white" />
      <div className="h-40 animate-pulse rounded-[28px] bg-white" />
      <div className="h-64 animate-pulse rounded-[28px] bg-white" />
    </div>
  )
}

export default function ClientShell({ children }: { children?: ReactNode }) {
  return (
    <div className="glow-root flex min-h-[100svh] bg-[var(--glow-bg)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-28 pt-3 min-[810px]:px-8 min-[1024px]:px-10 min-[1024px]:pb-12 min-[1024px]:pt-9">
          <Suspense fallback={<PageFallback />}>{children ?? <Outlet />}</Suspense>
        </main>
      </div>
      <TabBar />
    </div>
  )
}

export { useLogout }
