// admin-fivesim-balance : solde du compte 5sim (GET /user/profile) pour le tableau de bord admin.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'zod'
import { getAdminUserId } from '../_shared/admin-auth.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createFivesimClient, FivesimError } from '../_shared/fivesim-client.ts'
import { compareDecimal } from '../_shared/money.ts'

const Body = z.object({}).strict()

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed', message: 'Méthode non autorisée.' }, 405)

  if (!Body.safeParse(await req.json().catch(() => ({}))).success) {
    return json({ error: 'invalid_request', message: 'Requête invalide.' }, 400)
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  if (!(await getAdminUserId(admin, req))) {
    return json({ error: 'forbidden', message: 'Accès réservé aux administrateurs.' }, 403)
  }

  const { data: setting } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'fivesim_low_balance_threshold')
    .maybeSingle()
  const threshold = Number(setting?.value ?? 10)

  const token = Deno.env.get('FIVESIM_API_KEY')
  if (!token) return json({ configured: false, threshold }, 200)

  try {
    const profile = await createFivesimClient({ token }).getProfile()
    const balance = Number(profile.balance)
    return json(
      {
        configured: true,
        balance,
        frozen_balance: Number(profile.frozen_balance ?? 0),
        threshold,
        low: compareDecimal(balance, threshold) < 0,
      },
      200,
    )
  } catch (err) {
    if (err instanceof FivesimError) {
      return json({ configured: true, error: err.userMessage, raw: err.raw, http_status: err.httpStatus }, 502)
    }
    return json({ configured: true, error: 'Impossible de joindre 5sim.' }, 502)
  }
})
