import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import Home from '@/pages/Home'
import Service from '@/pages/Service'
import TopupStatus from '@/pages/TopupStatus'
import Wallet from '@/pages/Wallet'

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
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
