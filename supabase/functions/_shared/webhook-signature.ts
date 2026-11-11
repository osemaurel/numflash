// Vérification des webhooks SasPay : HMAC-SHA256 (hex) sur "{timestamp}.{corps brut}",
// fenêtre de 300 s. crypto.subtle.verify compare en temps constant.

export type SignatureCheck =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'missing_secret'
        | 'missing_headers'
        | 'invalid_timestamp'
        | 'timestamp_out_of_window'
        | 'invalid_signature_format'
        | 'signature_mismatch'
    }

export interface SignatureInput {
  rawBody: string
  timestamp: string | null
  signature: string | null
  secret: string
  nowSeconds: number
  toleranceSeconds?: number
}

function hexToBytes(hex: string) {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

export async function verifySaspaySignature(input: SignatureInput): Promise<SignatureCheck> {
  const { rawBody, timestamp, signature, secret, nowSeconds, toleranceSeconds = 300 } = input
  if (!secret) return { ok: false, reason: 'missing_secret' }
  if (!timestamp || !signature) return { ok: false, reason: 'missing_headers' }

  const ts = timestamp.trim()
  if (!/^\d{1,12}$/.test(ts)) return { ok: false, reason: 'invalid_timestamp' }
  if (Math.abs(nowSeconds - Number(ts)) > toleranceSeconds) {
    return { ok: false, reason: 'timestamp_out_of_window' }
  }

  const sigHex = signature.trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(sigHex)) return { ok: false, reason: 'invalid_signature_format' }

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const valid = await crypto.subtle.verify('HMAC', key, hexToBytes(sigHex), enc.encode(`${ts}.${rawBody}`))
  return valid ? { ok: true } : { ok: false, reason: 'signature_mismatch' }
}
