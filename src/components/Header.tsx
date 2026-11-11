import { Link } from 'react-router-dom'
import { LogOut, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/hooks/useAuth'
import { useBalance } from '@/hooks/useBalance'
import { formatFCFA } from '@/lib/utils'

export default function Header() {
  const { balance, loading } = useBalance()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link to="/" className="text-lg font-semibold text-primary">
          Numflash
        </Link>
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium tabular-nums"
            aria-label="Votre solde"
          >
            <Wallet className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span>{loading ? '…' : formatFCFA(balance)}</span>
          </div>
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
