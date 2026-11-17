import { Suspense, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut, useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import '../glow/glow.css'
import { Wordmark } from '../landing/ui'
import { Avatar, displayName } from './ui'

/*
 * Habillage commun de l'espace client et de l'administration, dans le design de la landing :
 * colonne de navigation sur grand écran, en-tête + barre d'onglets en bas sur mobile.
 */

export interface NavItem {
  to: string
  label: string
  /** Libellé court de la barre d'onglets mobile. */
  short: string
  icon: LucideIcon
  end?: boolean
}

export function useLogout() {
  const navigate = useNavigate()
  return async () => {
    await signOut()
    navigate('/', { replace: true })
  }
}

export const sidebarItem = 'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium tracking-[-0.3px] transition-colors'
export const sidebarIdle = 'text-[rgb(70,70,70)] hover:bg-[var(--glow-bg)] hover:text-black'

function Brand({ badge }: { badge?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Wordmark />
      {badge ? <span className="rounded-full bg-black px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-white">{badge}</span> : null}
    </span>
  )
}

function Sidebar({ nav, badge, extra, bottom }: { nav: NavItem[]; badge?: string; extra?: ReactNode; bottom?: ReactNode }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const logout = useLogout()
  const name = displayName(profile?.full_name, user?.email)

  return (
    <aside className="sticky top-0 hidden h-[100svh] w-[264px] shrink-0 flex-col border-r border-[var(--glow-line)] bg-white px-4 pb-5 pt-6 min-[1024px]:flex">
      <div className="px-2">
        <Brand badge={badge} />
      </div>
      <nav className="mt-9 flex flex-col gap-1" aria-label="Navigation principale">
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn(sidebarItem, isActive ? 'bg-[rgba(0,133,238,0.1)] text-[var(--glow-blue-dark)]' : sidebarIdle)}>
            {({ isActive }) => (
              <>
                <n.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                {n.label}
              </>
            )}
          </NavLink>
        ))}
        {extra}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        {bottom}
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

function MobileHeader({ badge, right }: { badge?: string; right?: ReactNode }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 bg-[rgba(248,247,247,0.88)] px-4 backdrop-blur-md min-[1024px]:hidden">
      <Brand badge={badge} />
      <div className="flex items-center gap-2">
        {right}
        <Link to="/profil" aria-label="Votre profil">
          <Avatar name={displayName(profile?.full_name, user?.email)} size={36} />
        </Link>
      </div>
    </header>
  )
}

function TabBar({ nav }: { nav: NavItem[] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--glow-line)] bg-[rgba(255,255,255,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md min-[1024px]:hidden"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-[560px]" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} end={n.end} className={({ isActive }) => cn('flex h-[62px] flex-col items-center justify-center gap-1', isActive ? 'text-[var(--glow-blue)]' : 'text-[rgb(140,140,140)]')}>
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-[rgba(0,133,238,0.1)]')}>
                    <n.icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.2 : 1.8} aria-hidden />
                  </span>
                  <span className="max-w-full truncate px-0.5 text-[11px] font-medium leading-[13px]">{n.short}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Chargement d'une page : la structure reste en place. */
function PageFallback() {
  return (
    <div className="flex flex-col gap-4" aria-label="Chargement">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-white" />
      <div className="h-40 animate-pulse rounded-[28px] bg-white" />
      <div className="h-64 animate-pulse rounded-[28px] bg-white" />
    </div>
  )
}

export function AppShell({
  nav,
  tabs = nav,
  badge,
  sidebarExtra,
  sidebarBottom,
  headerRight,
  children,
}: {
  nav: NavItem[]
  /** Onglets mobiles (par défaut, la navigation principale). */
  tabs?: NavItem[]
  badge?: string
  sidebarExtra?: ReactNode
  sidebarBottom?: ReactNode
  headerRight?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="glow-root flex min-h-[100svh] bg-[var(--glow-bg)]">
      <Sidebar nav={nav} badge={badge} extra={sidebarExtra} bottom={sidebarBottom} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader badge={badge} right={headerRight} />
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-36 pt-3 min-[810px]:px-8 min-[1024px]:px-10 min-[1024px]:pb-12 min-[1024px]:pt-9">
          <Suspense fallback={<PageFallback />}>{children ?? <Outlet />}</Suspense>
        </main>
      </div>
      <TabBar nav={tabs} />
    </div>
  )
}
