import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container flex-1 py-6">
        <Outlet />
      </main>
    </div>
  )
}
