import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Votre nom est requis'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{8,}$/, 'Numéro de téléphone invalide'),
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

type FormState = z.infer<typeof schema>

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({ full_name: '', phone: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Formulaire invalide')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone.replace(/\s/g, ''),
        },
      },
    })
    setSubmitting(false)
    if (error) {
      toast.error('Impossible de créer le compte. Vérifiez vos informations.')
      return
    }
    toast.success('Compte créé. Bienvenue !')
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>Quelques instants et c'est prêt.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input
                id="full_name"
                autoComplete="name"
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+229 97 00 00 00"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer mon compte'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Déjà inscrit ?{' '}
              <Link to="/connexion" className="text-primary underline-offset-4 hover:underline">
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
