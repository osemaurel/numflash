import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowDownLeft, ArrowLeft, House, LayoutDashboard, LayoutGrid, Menu, ReceiptText, SlidersHorizontal, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { AppShell, sidebarIdle, sidebarItem, type NavItem } from '../client/AppShell'

const DASHBOARD: NavItem = { to: '/admin', label: 'Tableau de bord', short: 'Bord', icon: LayoutDashboard, end: true }
const SALES: NavItem = { to: '/admin/ventes', label: 'Ventes', short: 'Ventes', icon: ReceiptText }
const TOPUPS: NavItem = { to: '/admin/recharges', label: 'Recharges', short: 'Recharges', icon: ArrowDownLeft }
const USERS: NavItem = { to: '/admin/utilisateurs', label: 'Utilisateurs', short: 'Clients', icon: Users }
const CATALOG: NavItem = { to: '/admin/catalogue', label: 'Catalogue', short: 'Catalogue', icon: LayoutGrid }
const SETTINGS: NavItem = { to: '/admin/reglages', label: 'Réglages', short: 'Réglages', icon: SlidersHorizontal }

const NAV: NavItem[] = [DASHBOARD, SALES, TOPUPS, USERS, CATALOG, SETTINGS]
// Sur mobile : les écrans consultés le plus souvent en onglets, le reste dans le menu de l'en-tête.
const TABS: NavItem[] = [DASHBOARD, SALES, TOPUPS, USERS]
const MORE: NavItem[] = [CATALOG, SETTINGS, { to: '/', label: 'Espace client', short: 'Site', icon: House, end: true }]

function MoreMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Plus d’écrans d’administration"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black ring-1 ring-inset ring-[rgb(228,228,228)]"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-11 z-40 flex w-56 flex-col gap-0.5 rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(16,35,41,0.35)] ring-1 ring-[var(--glow-line)]">
          {MORE.map((n) => (
            <Link key={n.to} role="menuitem" to={n.to} className="flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-black hover:bg-[var(--glow-bg)]">
              <n.icon className="h-[18px] w-[18px] text-[var(--glow-blue)]" strokeWidth={1.9} aria-hidden />
              {n.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Administration : réservée aux comptes admin (les droits réels sont vérifiés par la base). */
export default function AdminLayout() {
  const { loading, isAdmin } = useProfile()

  if (loading) return <div className="min-h-screen bg-[#f8f7f7]" />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <AppShell
      nav={NAV}
      tabs={TABS}
      badge="Admin"
      headerRight={<MoreMenu />}
      sidebarExtra={
        <Link to="/" className={cn(sidebarItem, sidebarIdle, 'mt-3')}>
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          Espace client
        </Link>
      }
    />
  )
}
