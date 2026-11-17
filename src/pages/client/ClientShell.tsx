import type { ReactNode } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Gift, House, MessageSquareText, Plus, ShieldCheck, ShoppingBag, UserRound, Wallet } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { useBalance } from '@/hooks/useBalance'
import { useProfile } from '@/hooks/useProfile'
import { AppShell, sidebarIdle, sidebarItem, type NavItem } from './AppShell'
import UserMessages from './UserMessages'
import { SupportFab, SupportLink, WhatsAppGlyph } from '@/components/Support'

export { useLogout } from './AppShell'

const NAV: NavItem[] = [
  { to: '/', label: 'Accueil', short: 'Accueil', icon: House, end: true },
  { to: '/acheter', label: 'Acheter un numéro', short: 'Acheter', icon: ShoppingBag },
  { to: '/numeros', label: 'Mes numéros', short: 'Numéros', icon: MessageSquareText },
  { to: '/wallet', label: 'Solde', short: 'Solde', icon: Wallet },
  { to: '/profil', label: 'Profil', short: 'Profil', icon: UserRound },
]

function BalanceText({ balance, loading }: { balance: number | null; loading: boolean }) {
  return <>{loading || balance === null ? '…' : formatFCFA(balance)}</>
}

export default function ClientShell({ children }: { children?: ReactNode }) {
  const { isAdmin } = useProfile()
  const { balance, loading } = useBalance()

  return (
    <AppShell
      nav={NAV}
      sidebarExtra={
        <>
          <span className={cn(sidebarItem, 'cursor-default text-[rgb(170,170,170)]')}>
            <Gift className="h-5 w-5" strokeWidth={1.8} aria-hidden />
            Affiliation
            <span className="ml-auto rounded-full bg-[var(--glow-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--glow-gray)]">Bientôt</span>
          </span>
          <SupportLink where="menu" className={cn(sidebarItem, sidebarIdle)}>
            <WhatsAppGlyph className="h-5 w-5 text-[#1fa855]" />
            Support WhatsApp
          </SupportLink>
          {isAdmin ? (
            <Link to="/admin" className={cn(sidebarItem, sidebarIdle, 'mt-3')}>
              <ShieldCheck className="h-5 w-5" strokeWidth={1.8} aria-hidden />
              Administration
            </Link>
          ) : null}
        </>
      }
      sidebarBottom={
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
      }
      headerRight={
        <Link
          to="/wallet"
          className="flex h-9 items-center gap-1.5 rounded-full bg-white pl-2.5 pr-3 text-[14px] font-semibold tracking-[-0.3px] text-black ring-1 ring-inset ring-[rgb(228,228,228)]"
          aria-label="Votre solde, ouvrir le portefeuille"
        >
          <Wallet className="h-4 w-4 text-[var(--glow-blue)]" strokeWidth={2} aria-hidden />
          <BalanceText balance={balance} loading={loading} />
        </Link>
      }
    >
      <UserMessages />
      {children ?? <Outlet />}
      <SupportFab where="espace_client" className="bottom-[calc(76px+env(safe-area-inset-bottom))] min-[1024px]:hidden" />
    </AppShell>
  )
}
