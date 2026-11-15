// order-action : annuler (et être remboursé) ou terminer une commande, par son propriétaire.
// Appelée depuis le navigateur avec le JWT de l'utilisateur (verify_jwt = true).
//
// Annulation : les garde-fous (délai minimum, plafond horaire) sont vérifiés en base AVANT
// l'annulation chez 5sim ; le remboursement est appliqué ensuite selon la réponse de 5sim.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'zod'
import { corsHeaders } from '../_shared/cors.ts'
import { createFivesimClient, FivesimError } from '../_shared/fivesim-client.ts'
import { authenticatedUserId, describeError, fail, json, requestMeta, serviceClient } from '../_shared/http.ts'
import { parseFivesimOrder, type ProviderOrder } from '../_shared/order-core.ts'
import { orderErrorResponse } from '../_shared/order-errors.ts'

const Body = z
  .object({
    order_id: z.string().uuid(),
    action: z.enum(['cancel', 'finish']),
  })
  .strict()

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Méthode non autorisée.')

  const admin = serviceClient()
  const meta = requestMeta(req)
  let actor = 'anonymous'
  const audit = async (action: string, target: string | null, payload: Record<string, unknown> = {}) => {
    const { error } = await admin.from('audit_log').insert({ actor, action, target, payload: { ...meta, ...payload } })
    if (error) console.error('audit_log insert failed', action, error.message)
  }

  try {
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      await audit('order_action_invalid', null, { issues: parsed.error.issues.slice(0, 5) })
      return fail(400, 'invalid_request', 'Requête invalide.')
    }
    const { order_id, action } = parsed.data

    const userId = await authenticatedUserId(admin, req)
    if (!userId) return fail(401, 'unauthorized', 'Votre session a expiré. Veuillez vous reconnecter.')
    actor = `user:${userId}`
    const target = `order:${order_id}`

    const { data: order } = await admin
      .from('orders')
      .select('id, user_id, status, fivesim_order_id')
      .eq('id', order_id)
      .maybeSingle()
    if (!order || order.user_id !== userId) return fail(404, 'not_found', 'Commande introuvable.')
    if (order.fivesim_order_id == null) {
      return fail(409, 'not_assigned', 'Le numéro n’a pas encore été attribué. Patientez quelques secondes.')
    }

    const token = Deno.env.get('FIVESIM_API_KEY')
    if (!token) return fail(503, 'provider_unavailable', 'Le service est momentanément indisponible. Réessayez dans quelques minutes.')
    const client = createFivesimClient({ token, timeoutMs: 15_000 })
    const fivesimId = Number(order.fivesim_order_id)

    const applyState = async (remote: ProviderOrder, canceledBy: 'user' | 'system') => {
      const { data, error } = await admin.rpc('order_apply_provider_state', {
        p_order_id: order_id,
        p_provider_status: remote.status,
        p_sms: remote.sms,
        p_canceled_by: canceledBy,
        p_actor: actor,
        p_payload: { ...meta, fivesim_order_id: fivesimId, via: `order-action:${action}` },
      })
      if (error) throw new Error(`apply: ${error.message}`)
      return data as { status: string; refunded: boolean }
    }

    // État courant chez 5sim, appliqué en base (utile quand l'action est refusée par 5sim).
    const refresh = async () => {
      try {
        return await applyState(parseFivesimOrder(await client.checkOrder(fivesimId)), 'system')
      } catch {
        return null
      }
    }

    if (action === 'cancel') {
      const { error: guardErr } = await admin.rpc('order_cancel_precheck', { p_order_id: order_id, p_user_id: userId })
      if (guardErr) {
        const mapped = orderErrorResponse(guardErr)
        await audit(mapped.unexpected ? 'order_cancel_error' : 'order_cancel_refused', target, {
          code: guardErr.message,
          details: guardErr.details ?? null,
        })
        return json(mapped.body, mapped.status)
      }

      let remote: ProviderOrder
      try {
        remote = parseFivesimOrder(await client.cancelOrder(fivesimId))
      } catch (err) {
        if (err instanceof FivesimError) {
          await audit('order_cancel_provider_refused', target, { kind: err.kind, raw: err.raw.slice(0, 200) })
          const state = await refresh()
          if (err.kind === 'has_sms') {
            return fail(409, 'has_sms', 'Un SMS vient d’arriver : la commande ne peut plus être annulée.', { status: state?.status })
          }
          if (err.kind === 'expired') {
            return fail(409, 'expired', 'Cette commande a expiré : elle est remboursée automatiquement si aucun SMS n’a été reçu.', {
              status: state?.status,
            })
          }
          return fail(502, 'provider_error', err.userMessage)
        }
        // Sans réponse, l'annulation a pu aboutir : la synchronisation remboursera dans ce cas.
        await audit('order_cancel_provider_no_answer', target, { error: describeError(err) })
        return fail(504, 'provider_timeout', 'Le fournisseur n’a pas répondu. Vérifiez l’état de la commande dans quelques instants.')
      }

      const state = await applyState(remote, 'user')
      return json({ order_id, status: state.status, refunded: state.refunded }, 200)
    }

    // action === 'finish'
    if (order.status !== 'received') {
      return fail(409, 'not_finishable', 'Seule une commande dont le code a été reçu peut être terminée.')
    }
    try {
      const remote = parseFivesimOrder(await client.finishOrder(fivesimId))
      const state = await applyState(remote, 'system')
      return json({ order_id, status: state.status, refunded: state.refunded }, 200)
    } catch (err) {
      if (err instanceof FivesimError) {
        const state = await refresh()
        if (state && state.status !== 'received') return json({ order_id, status: state.status, refunded: state.refunded }, 200)
        return fail(502, 'provider_error', err.userMessage)
      }
      throw err
    }
  } catch (err) {
    await audit('order_action_error', null, { error: describeError(err) })
    return fail(500, 'internal_error', 'Une erreur est survenue. Réessayez.')
  }
})
