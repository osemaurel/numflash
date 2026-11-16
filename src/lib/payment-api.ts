import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'
import type { PaymentCountry } from './payment'

// Appels aux Edge Functions de paiement direct (payment-options, topup-pay, topup-confirm-otp).
// Aucune clé SasPay ici : le navigateur ne parle qu'à nos fonctions.

interface ErrorBody {
  error?: unknown
  message?: unknown
  retryable?: unknown
  otp_instructions?: unknown
}

const NETWORK_ERROR = 'Connexion impossible. Vérifiez votre connexion internet et réessayez.'

async function readError(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as ErrorBody | null
    return { status: error.context.status as number | null, body, network: false }
  }
  return { status: null, body: null as ErrorBody | null, network: error instanceof FunctionsFetchError || error instanceof FunctionsRelayError }
}

const messageOf = (body: ErrorBody | null, fallback: string) => (typeof body?.message === 'string' && body.message ? body.message : fallback)

let optionsCache: { countries: PaymentCountry[]; at: number } | null = null

/** Pays et réseaux Mobile Money disponibles (gardés 10 min en mémoire). */
export async function fetchPaymentOptions(): Promise<PaymentCountry[]> {
  if (optionsCache && Date.now() - optionsCache.at < 10 * 60_000) return optionsCache.countries
  const { data, error } = await supabase.functions.invoke<{ countries: PaymentCountry[] }>('payment-options', { body: {} })
  if (error || !data) {
    const { body } = await readError(error)
    throw new Error(messageOf(body, 'Les moyens de paiement sont momentanément indisponibles. Réessayez dans quelques instants.'))
  }
  optionsCache = { countries: data.countries ?? [], at: Date.now() }
  return optionsCache.countries
}

export interface PayInput {
  amountXof: number
  firstName: string
  lastName: string
  email: string
  country: string
  network: string
  phone: string
  otp?: string
}

export type PayResult =
  | { ok: true; topupId: string; checkoutUrl: string; confirmOtp: boolean }
  | { ok: false; message: string; code?: string }

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Lance le paiement. Une clé d'idempotence par paiement demandé ; elle n'est réutilisée que pour
 * les nouvelles tentatives réseau de ce même paiement (jamais pour un nouveau paiement).
 */
export async function payTopup(input: PayInput): Promise<PayResult> {
  const idempotencyKey = uuidv4()
  const body = {
    amount_xof: input.amountXof,
    idempotency_key: idempotencyKey,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    country: input.country,
    network: input.network,
    phone: input.phone,
    ...(input.otp ? { otp: input.otp } : {}),
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { data, error } = await supabase.functions.invoke<{ topup_id: string; checkout_url: string; confirm_otp: boolean }>('topup-pay', { body })
    if (!error && data?.topup_id) {
      return { ok: true, topupId: data.topup_id, checkoutUrl: data.checkout_url ?? '', confirmOtp: Boolean(data.confirm_otp) }
    }
    const { body: err, network } = await readError(error)
    const retryable = network || err?.retryable === true || err?.error === 'in_progress'
    if (retryable && attempt < 4) {
      await sleep(2000 * attempt)
      continue
    }
    if (network) return { ok: false, message: NETWORK_ERROR }
    return {
      ok: false,
      message: messageOf(err, 'Le paiement n’a pas pu être lancé. Réessayez.'),
      code: typeof err?.error === 'string' ? err.error : undefined,
    }
  }
  return {
    ok: false,
    message: 'Le service de paiement tarde à répondre. Si une demande de paiement apparaît sur votre téléphone, validez-la : votre solde sera crédité.',
  }
}

/** Code de confirmation reçu par SMS après la demande de paiement (certains réseaux). */
export async function confirmTopupOtp(topupId: string, otp: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.functions.invoke<{ status: string }>('topup-confirm-otp', { body: { topup_id: topupId, otp } })
  if (!error && data) return { ok: true }
  const { body, network } = await readError(error)
  if (network) return { ok: false, message: NETWORK_ERROR }
  return { ok: false, message: messageOf(body, 'Le code n’a pas pu être vérifié. Réessayez.') }
}
