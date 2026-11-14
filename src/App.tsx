import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import PageLoader from '@/components/PageLoader'
import { useAuth } from '@/hooks/useAuth'

// L'administration est chargée à la demande : les clients ne téléchargent jamais ce code.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminCatalog = lazy(() => import('@/pages/admin/AdminCatalog'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
// Maquette « Glow » (base du design) : publique, isolée et chargée à la demande.
const GlowPage = lazy(() => import('@/pages/glow/GlowPage'))
// Landing publique : chargée seulement pour les visiteurs non connectés.
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'))
// Connexion et inscription : même design (et mêmes ressources) que la landing, donc chargées avec elles.
const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))
// Espace client, dans le même design.
const ClientShell = lazy(() => import('@/pages/client/ClientShell'))
const Dashboard = lazy(() => import('@/pages/client/Dashboard'))
const Buy = lazy(() => import('@/pages/client/Buy'))
const LegacyServiceRedirect = lazy(() => import('@/pages/client/Buy').then((m) => ({ default: m.LegacyServiceRedirect })))
const Numbers = lazy(() => import('@/pages/client/Numbers'))
const Wallet = lazy(() => import('@/pages/client/Wallet'))
const TopupStatus = lazy(() => import('@/pages/client/TopupStatus'))
const Profile = lazy(() => import('@/pages/client/Profile'))

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>
/** Pages au design de la landing : le fond reste celui de la page pendant le chargement. */
const lazyGlow = (node: ReactNode) => <Suspense fallback={<div className="min-h-screen bg-[#f8f7f7]" />}>{node}</Suspense>

/** « / » : la landing pour les visiteurs, l'accueil de l'espace client une fois connecté. */
function HomeEntry() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-[#f8f7f7]" />
  if (!session) return lazyGlow(<LandingPage />)
  return lazyGlow(
    <ClientShell>
      <Dashboard />
    </ClientShell>,
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={lazyGlow(<Login />)} />
      <Route path="/inscription" element={lazyGlow(<Signup />)} />
      <Route path="/glow" element={lazyPage(<GlowPage />)} />
      <Route path="/" element={<HomeEntry />} />
      <Route element={<ProtectedRoute>{lazyGlow(<ClientShell />)}</ProtectedRoute>}>
        <Route path="/acheter" element={<Buy />} />
        <Route path="/service/:slug" element={<LegacyServiceRedirect />} />
        <Route path="/numeros" element={<Numbers />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/wallet/recharge/:topupId" element={<TopupStatus />} />
        <Route path="/profil" element={<Profile />} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute>{lazyGlow(<AdminLayout />)}</ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="reglages" element={<AdminSettings />} />
        <Route path="catalogue" element={<AdminCatalog />} />
        <Route path="utilisateurs" element={<AdminUsers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
