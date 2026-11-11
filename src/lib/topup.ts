import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'

export interface TopupCreateResult {
  topup_id: string
  checkout_url: string
}

const GENERIC_ERROR = 'Impossible de lancer la recharge. Vérifiez votre connexion et réessayez.'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// Une clé par intention de paiement, réutilisée uniquement pour les nouvelles tentatives réseau.
export async function createTopup(amountXof: number): Promise<TopupCreateResult> {
  const idempotencyKey = uuidv4()

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase.functions.invoke<TopupCreateResult>('topup-create', {
      body: { amount_xof: amountXof, idempotency_key: idempotencyKey },
    })
    if (!error && data?.topup_id) return data

    let message = GENERIC_ERROR
    let retryable = false
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null)
      if (typeof body?.message === 'string') message = body.message
      retryable = error.context.status === 409 && body?.error === 'in_progress'
    } else if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      retryable = true
    }

    if (!retryable || attempt === 3) throw new Error(message)
    await sleep(1500 * attempt)
  }
  throw new Error(GENERIC_ERROR)
}
