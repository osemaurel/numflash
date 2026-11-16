// topup-pay : recharge par paiement direct Mobile Money depuis la page de paiement Numflash.
// Appelée avec le JWT de l'utilisateur (verify_jwt = true). Aucune redirection vers SasPay :
// la demande de paiement part directement sur le téléphone du client (POST /payments/softpay/).
// N'écrit jamais dans wallet_transactions : seul le webhook vérifié crédite le solde.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { z } from 'zod'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticatedUserId, describeError, fail, json, requestMeta, serviceClient } from '../_shared/http.ts'
import { xofToDecimalString } from '../_shared/money.ts'
import { loadPaymentOptions } from '../_shared/payment-cache.ts'
import { providerContactEmail } from '../_shared/provider-contact.ts'
import { findNetwork } from '../_shared/payment-options.ts'
import { createSaspayClient, SaspayError } from '../_shared/saspay-client.ts'
import { describeSaspayError } from '../_shared/saspay-errors.ts'
import { sanitizeProviderUrl } from '../_shared/urls.ts'

const Name = z.string().trim().min(1).max(60).regex(/^[^<>"{}\\]+$/)
const Body = z
  .object({
    amount_xof: z.number().int().positive().max(10_000_000),
    idempotency_key: z.string().uuid(),
    first_name: Name,
    last_name: Name,
    email: z.string().trim().email().max(254),
    country: z.string().regex(/^[A-Z]{2}$/),
    network: z.string().regex(/^[a-z0-9_-]{2,40}$/),
    phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/),
    otp: z.string().regex(/^[0-9A-Za-z]{3,12}$/).optional(),
  })
  .strict()

const RATE_LIMIT_WINDOW_MS = 15 * 60_000
const RATE_LIMIT_MAX = 5

const TOPUP_COLUMNS = 'id, user_id, amount_xof, status, channel, saspay_payment_id, saspay_checkout_url, payer_network, created_at'

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
    // 1. Entrées validées avant tout accès base ou appel externe.
    const parsed = Body.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      await audit('topup_pay_invalid', null, { issues: parsed.error.issues.slice(0, 5).map((i) => ({ path: i.path, code: i.code })) })
      return fail(400, 'invalid_request', 'Certaines informations sont invalides. Vérifiez le formulaire.')
    }
    const input = parsed.data

    // 2. Authentification et compte.
    const userId = await authenticatedUserId(admin, req)
    if (!userId) return fail(401, 'unauthorized', 'Votre session a expiré. Veuillez vous reconnecter.')
    actor = `user:${userId}`

    const { data: profile } = await admin.from('profiles').select('is_blocked').eq('id', userId).maybeSingle()
    if (!profile || profile.is_blocked) {
      await audit('topup_pay_refused', null, { reason: profile ? 'blocked' : 'no_profile' })
      return fail(403, 'forbidden', 'Votre compte ne permet pas cette opération. Contactez le support.')
    }

    const secretKey = Deno.env.get('SASPAY_SECRET_KEY')
    if (!secretKey) {
      await audit('topup_pay_unconfigured', null)
      return fail(503, 'payment_unavailable', 'Le paiement est momentanément indisponible. Réessayez plus tard.')
    }
    const saspay = createSaspayClient({ secretKey, timeoutMs: 25_000 })

    // 3. Montant = palier configuré ; réseau ouvert au paiement dans ce pays.
    const { data: tiersRow } = await admin.from('settings').select('value').eq('key', 'topup_tiers').maybeSingle()
    const tiers = Array.isArray(tiersRow?.value) ? (tiersRow.value as unknown[]).filter(Number.isInteger) : []
    if (!tiers.includes(input.amount_xof)) {
      await audit('topup_pay_invalid_tier', null, { amount_xof: input.amount_xof })
      return fail(400, 'invalid_amount', "Ce montant de recharge n'est pas disponible.")
    }

    const network = findNetwork(await loadPaymentOptions(admin, saspay), input.country, input.network)
    if (!network) {
      await audit('topup_pay_invalid_network', null, { country: input.country, network: input.network })
      return fail(400, 'invalid_network', 'Ce moyen de paiement n’est pas disponible. Choisissez-en un autre.')
    }
    if (network.otp_required && !input.otp) {
      return fail(400, 'otp_required', 'Saisissez le code de paiement obtenu sur votre téléphone.', {
        otp_instructions: network.otp_instructions,
      })
    }

    // Confidentialité : le prestataire reçoit l'adresse fixée par l'administrateur, jamais celle du client
    // (tant qu'elle n'est pas fixée, l'adresse saisie par le client est utilisée).
    const contactEmail = await providerContactEmail(admin)

    // 4. Retry réseau d'une même demande : on ne crée pas de deuxième recharge.
    const { data: existing } = await admin
      .from('topups')
      .select(TOPUP_COLUMNS)
      .eq('idempotency_key', input.idempotency_key)
      .maybeSingle()

    if (existing) {
      if (existing.user_id !== userId || existing.amount_xof !== input.amount_xof || existing.channel !== 'direct') {
        await audit('topup_pay_idempotency_conflict', `topup:${existing.id}`, { amount_xof: input.amount_xof })
        return fail(409, 'idempotency_conflict', 'Cette demande a déjà été utilisée. Veuillez recommencer.')
      }
      if (existing.saspay_payment_id) {
        return json(
          {
            topup_id: existing.id,
            checkout_url: existing.saspay_checkout_url ?? '',
            confirm_otp: network.confirm_otp,
            replayed: true,
          },
          200,
        )
      }
      if (existing.status !== 'pending') {
        return fail(409, 'topup_closed', "Ce paiement n'a pas pu être lancé. Veuillez recommencer.")
      }
      // Recharge en attente sans identifiant SasPay : on rejoue la demande avec la même clé,
      // SasPay renvoie la réponse d'origine (ou 409 si le premier appel est encore en cours).
    } else {
      const { count } = await admin
        .from('topups')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString())
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        await audit('topup_pay_rate_limited', null, { recent_count: count })
        return fail(429, 'rate_limited', 'Trop de tentatives de recharge. Réessayez dans quelques minutes.')
      }
    }

    // 5. Recharge pending (la contrainte unique sur idempotency_key arbitre les courses).
    let topup = existing
    if (!topup) {
      const { data: inserted, error: insErr } = await admin
        .from('topups')
        .insert({
          user_id: userId,
          amount_xof: input.amount_xof,
          idempotency_key: input.idempotency_key,
          status: 'pending',
          channel: 'direct',
          payer_country: input.country,
          payer_network: input.network,
          payer_phone: input.phone,
          payer_name: `${input.first_name} ${input.last_name}`.slice(0, 130),
          payer_email: input.email.toLowerCase(),
        })
        .select(TOPUP_COLUMNS)
        .single()
      if (insErr) {
        if (insErr.code === '23505') return fail(409, 'in_progress', 'Votre paiement est en cours de traitement.')
        throw new Error(`insert topup: ${insErr.message}`)
      }
      topup = inserted
    }
    const target = `topup:${topup.id}`
    const markFailed = () =>
      admin.from('topups').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', topup!.id).eq('status', 'pending')

    // 6. Demande de paiement directe. La même clé d'idempotence n'est réutilisée que pour un retry
    //    réseau de cette même demande : SasPay renvoie alors la réponse d'origine, sans nouveau débit.
    let payment
    try {
      payment = await saspay.softpay(
        {
          amount: xofToDecimalString(input.amount_xof),
          currency: 'XOF',
          country: input.country,
          network: input.network,
          description: `Recharge Numflash de ${input.amount_xof} FCFA`,
          customer: { email: contactEmail ?? input.email, first_name: input.first_name, last_name: input.last_name, phone: input.phone },
          metadata: { topup_id: topup.id, user_id: userId },
          fee_charge_mode: 'ADD_ON',
          ...(input.otp ? { otp: input.otp } : {}),
        },
        input.idempotency_key,
      )
    } catch (err) {
      if (err instanceof SaspayError) {
        const info = describeSaspayError(err.code, err.httpStatus)
        if (info.final) await markFailed()
        await audit('topup_pay_saspay_error', target, {
          http_status: err.httpStatus,
          code: err.code,
          error: err.message.slice(0, 300),
          network: input.network,
          marked_failed: info.final,
        })
        return fail(info.final ? 422 : 409, info.final ? 'payment_refused' : 'in_progress', info.message, {
          retryable: !info.final,
        })
      }
      // Délai dépassé : la demande a peut-être abouti. Le client réessaie avec la même clé.
      await audit('topup_pay_no_answer', target, { error: describeError(err).slice(0, 300), network: input.network })
      return fail(504, 'in_progress', 'Le service de paiement tarde à répondre. Nouvelle tentative…', { retryable: true })
    }

    const checkoutUrl = sanitizeProviderUrl(payment?.checkout_url)
    if (payment?.id == null || checkoutUrl === null) {
      await markFailed()
      await audit('topup_pay_bad_response', target, {
        saspay_payment_id: payment?.id ?? null,
        checkout_url: typeof payment?.checkout_url === 'string' ? payment.checkout_url.slice(0, 300) : null,
      })
      return fail(502, 'payment_provider_error', 'Le service de paiement ne répond pas correctement. Réessayez dans quelques instants.')
    }
    const paymentId = String(payment.id)
    const status = String(payment.status ?? '').toUpperCase()

    // 7. L'identifiant SasPay relie le webhook à cette recharge.
    const { error: updErr } = await admin
      .from('topups')
      .update({ saspay_payment_id: paymentId, saspay_checkout_url: checkoutUrl || null, updated_at: new Date().toISOString() })
      .eq('id', topup.id)
    if (updErr) {
      await audit('topup_pay_store_failed', target, { saspay_payment_id: paymentId, error: updErr.message })
      return fail(500, 'internal_error', 'Une erreur est survenue. Si une demande de paiement apparaît sur votre téléphone, validez-la : votre solde sera crédité.')
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      await admin.rpc('fail_topup_if_pending', {
        p_topup_id: topup.id,
        p_saspay_payment_id: paymentId,
        p_actor: actor,
        p_payload: { ...meta, source: 'softpay_response', status },
      })
      await audit('topup_pay_refused_by_operator', target, { saspay_payment_id: paymentId, status })
      return fail(422, 'payment_refused', 'L’opérateur a refusé le paiement. Vérifiez votre numéro et votre solde Mobile Money, puis réessayez.')
    }

    await audit('topup_pay_created', target, {
      amount_xof: input.amount_xof,
      saspay_payment_id: paymentId,
      status,
      country: input.country,
      network: input.network,
      flow: checkoutUrl ? 'redirect' : 'push',
      redirect_host: checkoutUrl ? new URL(checkoutUrl).hostname : null,
      prepayment_otp: Boolean(input.otp),
      customer_email_masked: contactEmail !== null,
    })
    return json({ topup_id: topup.id, checkout_url: checkoutUrl, confirm_otp: network.confirm_otp }, 200)
  } catch (err) {
    await audit('topup_pay_error', null, { error: describeError(err).slice(0, 300) })
    return fail(500, 'internal_error', 'Une erreur est survenue. Réessayez.')
  }
})
