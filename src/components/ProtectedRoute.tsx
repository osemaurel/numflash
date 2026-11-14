import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { withRedirect } from '@/lib/redirect'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (!session) {
    // Après connexion, retour sur la page demandée.
    return <Navigate to={withRedirect('/connexion', location.pathname + location.search)} replace />
  }

  return <>{children}</>
}
