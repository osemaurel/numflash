import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Home from '@/pages/Home'
import Service from '@/pages/Service'
import TopupStatus from '@/pages/TopupStatus'
import Wallet from '@/pages/Wallet'
import PageLoader from '@/components/PageLoader'
import { useAuth } from '@/hooks/useAuth'

// L'administration est chargée à la demande : les clients ne téléchargent jamais ce code.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminCatalog = lazy(() => import('@/pages/admin/AdminCatalog'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
// Maquette « Glow » (base du futur design) : publique, isolée et chargée à la demande.
const GlowPage = lazy(() => import('@/pages/glow/GlowPage'))
// Landing publique : chargée seulement pour les visiteurs non connectés.
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'))
// Connexion et inscription : même design (et mêmes ressources) que la landing, donc chargée avec elles.
const Login = lazy(() => import('@/pages/Login'))
const Signup = lazy(() => import('@/pages/Signup'))

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>
/** Pages au design de la landing : le fond reste celui de la page pendant le chargement. */
const lazyGlow = (node: ReactNode) => <Suspense fallback={<div className="min-h-screen bg-[#f8f7f7]" />}>{node}</Suspense>

/** « / » : la landing pour les visiteurs, le catalogue pour les clients connectés. */
function HomeEntry() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-background" />
  if (!session) return lazyGlow(<LandingPage />)
  return (
    <Layout>
      <Home />
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={lazyGlow(<Login />)} />
      <Route path="/inscription" element={lazyGlow(<Signup />)} />
      <Route path="/glow" element={lazyPage(<GlowPage />)} />
      <Route path="/" element={<HomeEntry />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/service/:slug" element={<Service />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/wallet/recharge/:topupId" element={<TopupStatus />} />
        <Route path="/admin" element={lazyPage(<AdminLayout />)}>
          <Route index element={lazyPage(<AdminDashboard />)} />
          <Route path="reglages" element={lazyPage(<AdminSettings />)} />
          <Route path="catalogue" element={lazyPage(<AdminCatalog />)} />
          <Route path="utilisateurs" element={lazyPage(<AdminUsers />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
