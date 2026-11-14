import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container flex-1 py-6">{children ?? <Outlet />}</main>
    </div>
  )
}
