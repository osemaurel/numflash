import { Navigate, NavLink, Outlet } from 'react-router-dom'
import PageLoader from '@/components/PageLoader'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/reglages', label: 'Réglages', end: false },
  { to: '/admin/catalogue', label: 'Catalogue', end: false },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', end: false },
]

export default function AdminLayout() {
  const { loading, isAdmin } = useProfile()

  if (loading) return <PageLoader />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Administration</h1>
      </div>
      <nav className="-mx-4 overflow-x-auto px-4" aria-label="Sections d'administration">
        <ul className="flex min-w-max gap-2 border-b">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    '-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  )
}
