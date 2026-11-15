import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import type { OrderStatus } from '@/hooks/useOrders'
import { supabase } from '@/lib/supabase'
import { uuidv4 } from '@/lib/utils'
import {
  NETWORK_ERROR,
  actionErrorMessage,
  purchaseErrorMessage,
  safeInt,
  type ErrorBody,
  type OrderActionResult,
  type PlaceOrderResult,
} from './orders'

// Appels aux Edge Functions d'achat (order-create, order-action). Aucune clé fournisseur ici.

async function readError(error: unknown): Promise<{ status: number | null; body: ErrorBody | null; network: boolean }> {
  if (error instanceof FunctionsHttpError) {
    const body = (await error.context.json().catch(() => null)) as ErrorBody | null
    return { status: error.context.status, body, network: false }
  }
  return { status: null, body: null, network: error instanceof FunctionsFetchError || error instanceof FunctionsRelayError }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Achat d'un numéro avec le solde. Une clé d'idempotence par achat demandé, réutilisée seulement
 * pour les nouvelles tentatives réseau du même achat : une coupure ne peut pas débiter deux fois.
 */
export async function placeOrder(selection: { service: string; country: string; expectedPriceXof: number }): Promise<PlaceOrderResult> {
  const idempotencyKey = uuidv4()
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { data, error } = await supabase.functions.invoke<{ order_id: string }>('order-create', {
      body: {
        service: selection.service,
        country: selection.country,
        expected_price_xof: selection.expectedPriceXof,
        idempotency_key: idempotencyKey,
      },
    })
    if (!error && data?.order_id) return { ok: true, orderId: data.order_id }

    const { status, body, network } = await readError(error)
    const inProgress = status === 409 && body?.error === 'in_progress'
    if ((network || inProgress) && attempt < 4) {
      await sleep(1500 * attempt)
      continue
    }
    if (network) return { ok: false, message: NETWORK_ERROR }
    return {
      ok: false,
      message: purchaseErrorMessage(body),
      code: typeof body?.error === 'string' ? body.error : undefined,
      priceXof: safeInt(body?.price_xof),
      refunded: body?.refunded === true,
    }
  }
  return { ok: false, message: NETWORK_ERROR }
}

/** Annuler (remboursement) ou terminer une commande. */
export async function orderAction(orderId: string, action: 'cancel' | 'finish'): Promise<OrderActionResult> {
  const { data, error } = await supabase.functions.invoke<{ status: OrderStatus; refunded: boolean }>('order-action', {
    body: { order_id: orderId, action },
  })
  if (!error && data?.status) return { ok: true, status: data.status, refunded: Boolean(data.refunded) }
  const { body, network } = await readError(error)
  if (network) return { ok: false, message: NETWORK_ERROR }
  return { ok: false, message: actionErrorMessage(body), code: typeof body?.error === 'string' ? body.error : undefined }
}
