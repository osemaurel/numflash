// payment-options : pays et réseaux Mobile Money disponibles pour la page de paiement Numflash.
// Lecture seule. Appelée avec le JWT de l'utilisateur (verify_jwt = true).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'zod'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticatedUserId, describeError, fail, json, serviceClient } from '../_shared/http.ts'
import { loadPaymentOptions } from '../_shared/payment-cache.ts'
import { providerContactEmail } from '../_shared/provider-contact.ts'
import { createSaspayClient } from '../_shared/saspay-client.ts'

const Body = z.object({}).strict()

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.')
  if (!Body.safeParse(await req.json().catch(() => ({}))).success) return fail(400, 'invalid_request', 'Requête invalide.')

  const admin = serviceClient()
  if (!(await authenticatedUserId(admin, req))) {
    return fail(401, 'unauthorized', 'Votre session a expiré. Veuillez vous reconnecter.')
  }

  const secretKey = Deno.env.get('SASPAY_SECRET_KEY')
  if (!secretKey) return fail(503, 'payment_unavailable', 'Le paiement est momentanément indisponible. Réessayez plus tard.')

  try {
    const countries = await loadPaymentOptions(admin, createSaspayClient({ secretKey, timeoutMs: 10_000 }))
    // Indique à la page de paiement si l'e-mail du client reste chez Numflash.
    const emailPrivate = (await providerContactEmail(admin)) !== null
    return json({ countries, email_private: emailPrivate }, 200)
  } catch (err) {
    await admin.from('audit_log').insert({
      actor: 'edge:payment-options',
      action: 'payment_options_failed',
      target: 'saspay',
      payload: { error: describeError(err).slice(0, 300) },
    })
    return fail(502, 'payment_unavailable', 'Les moyens de paiement sont momentanément indisponibles. Réessayez dans quelques instants.')
  }
})
