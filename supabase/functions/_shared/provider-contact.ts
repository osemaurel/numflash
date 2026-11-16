// Confidentialité des clients : le prestataire de paiement reçoit l'adresse e-mail fixée par
// l'administrateur (réglage saspay_customer_email) à la place de celle du client.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeContactEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null
}

/** Adresse à transmettre au prestataire, ou null si l'administrateur ne l'a pas encore fixée. */
export async function providerContactEmail(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from('settings').select('value').eq('key', 'saspay_customer_email').maybeSingle()
  return normalizeContactEmail(data?.value)
}
