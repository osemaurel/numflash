import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Home from '@/pages/Home'
import Service from '@/pages/Service'
import TopupStatus from '@/pages/TopupStatus'
import Wallet from '@/pages/Wallet'
import PageLoader from '@/components/PageLoader'

// L'administration est chargée à la demande : les clients ne téléchargent jamais ce code.
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminCatalog = lazy(() => import('@/pages/admin/AdminCatalog'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))

const lazyPage = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Signup />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
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
