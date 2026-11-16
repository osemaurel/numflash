// Réseaux et frais SasPay, mis en cache en base (30 min) pour ménager la limite de requêtes du compte.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { paymentOptionsFromRates, type PaymentCountry } from './payment-options.ts'
import type { SaspayClient } from './saspay-client.ts'

const KEY = 'saspay_my_rates'
const TTL_MS = 30 * 60_000

export async function loadPaymentOptions(
  admin: SupabaseClient,
  saspay: Pick<SaspayClient, 'myRates'>,
  opts: { forceRefresh?: boolean } = {},
): Promise<PaymentCountry[]> {
  const { data: cached } = await admin.from('provider_cache').select('value, fetched_at').eq('key', KEY).maybeSingle()
  const fresh = cached && Date.now() - new Date(cached.fetched_at as string).getTime() < TTL_MS
  if (cached && fresh && !opts.forceRefresh) return paymentOptionsFromRates(cached.value)

  try {
    const rates = await saspay.myRates()
    await admin.from('provider_cache').upsert({ key: KEY, value: rates, fetched_at: new Date().toISOString() })
    return paymentOptionsFromRates(rates)
  } catch (err) {
    // SasPay indisponible : la dernière liste connue reste utilisable.
    if (cached) return paymentOptionsFromRates(cached.value)
    throw err
  }
}
