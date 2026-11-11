import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenue sur Numflash. Vos achats et SMS reçus apparaîtront ici.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Rien à afficher pour le moment</CardTitle>
          <CardDescription>
            Rechargez votre compte, puis réservez un numéro adapté au service de votre choix.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Les fonctionnalités de recharge, de catalogue et de réception de SMS arrivent dans les prochaines phases.
        </CardContent>
      </Card>
    </div>
  )
}
