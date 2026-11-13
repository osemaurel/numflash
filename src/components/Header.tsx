import { Link } from 'react-router-dom'
import { LogOut, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { useProfile } from '@/hooks/useProfile'
import { formatFCFA } from '@/lib/utils'

export default function Header() {
  const { balance, loading } = useBalance()
  const { isAdmin } = useProfile()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link to="/" className="text-lg font-semibold text-primary">
          Numflash
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button asChild variant="ghost" size="icon" aria-label="Administration">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <Link
            to="/wallet"
            className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium tabular-nums transition-colors hover:border-primary"
            aria-label="Votre solde, ouvrir le portefeuille"
          >
            <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>{loading ? '…' : formatFCFA(balance)}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
