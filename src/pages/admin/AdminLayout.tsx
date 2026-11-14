import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, House, LayoutDashboard, LayoutGrid, SlidersHorizontal, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { AppShell, sidebarIdle, sidebarItem, type NavItem } from '../client/AppShell'

const NAV: NavItem[] = [
  { to: '/admin', label: 'Tableau de bord', short: 'Bord', icon: LayoutDashboard, end: true },
  { to: '/admin/reglages', label: 'Réglages', short: 'Réglages', icon: SlidersHorizontal },
  { to: '/admin/catalogue', label: 'Catalogue', short: 'Catalogue', icon: LayoutGrid },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', short: 'Clients', icon: Users },
]

const TABS: NavItem[] = [...NAV, { to: '/', label: 'Espace client', short: 'Site', icon: House, end: true }]

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
      sidebarExtra={
        <Link to="/" className={cn(sidebarItem, sidebarIdle, 'mt-3')}>
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} aria-hidden />
          Espace client
        </Link>
      }
    />
  )
}
