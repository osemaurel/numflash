// Pays et réseaux Mobile Money proposés sur la page de paiement Numflash, à partir de
// GET /pricing/my-rates/ (SasPay). Logique pure, testée par Vitest.

import { z } from 'zod'
import type { NetworkRate } from './saspay-client.ts'

const Decimal = z.union([z.string().regex(/^\d{1,12}(\.\d{1,6})?$/), z.number().finite().nonnegative()])

const Tier = z
  .object({
    min_amount: Decimal.nullish(),
    max_amount: Decimal.nullish(),
    percent: Decimal.nullish(),
    fixed: Decimal.nullish(),
    floor_amount: Decimal.nullish(),
    cap_amount: Decimal.nullish(),
    fee_charge_mode: z.string().max(20).nullish(),
  })
  .passthrough()

const Rate = z
  .object({
    country_code: z.string().regex(/^[A-Za-z]{2}$/),
    country_name: z.string().max(80).nullish(),
    currency: z.string().max(5).nullish(),
    network_code: z.string().regex(/^[a-z0-9_-]{2,40}$/),
    network_name: z.string().max(80).nullish(),
    payin: z
      .object({
        available: z.boolean().nullish(),
        otp_required: z.boolean().nullish(),
        otp_instructions: z.string().max(500).nullish(),
        tiers: z.array(Tier).max(50).nullish(),
      })
      .passthrough()
      .nullish(),
  })
  .passthrough()

export interface FeeTier {
  min: string
  max: string | null
  percent: string
  fixed: string
  floor: string
  cap: string | null
  mode: 'ADD_ON' | 'DEDUCTED'
}

export interface PaymentNetwork {
  code: string
  name: string
  /** Code à obtenir AVANT le paiement (USSD), à saisir sur la page (Orange Money CI, BF…). */
  otp_required: boolean
  otp_instructions: string | null
  /** Code de confirmation reçu APRÈS la demande de paiement (Wizall, Coris…). */
  confirm_otp: boolean
  fees: FeeTier[]
}

export interface PaymentCountry {
  code: string
  name: string
  currency: string
  networks: PaymentNetwork[]
}

const dec = (v: unknown, fallback: string) => (v == null || v === '' ? fallback : String(v))

// La documentation SasPay cite Wizall (Sénégal) et Coris (Bénin) parmi les réseaux qui envoient
// un code de confirmation après la demande ; la liste complète n'est pas publiée.
const CONFIRM_OTP_RE = /wizall|coris/

// Le solde Numflash est en FCFA : seuls les pays des zones franc CFA (XOF, XAF, parité fixe 1:1)
// sont proposés. Les pseudo-pays SasPay (carte, crypto, USD : codes en X) sont exclus.
const FCFA = new Set(['XOF', 'XAF'])

/** Réseaux ouverts au paiement entrant en FCFA, regroupés par pays (pays et réseaux triés par nom). */
export function paymentOptionsFromRates(raw: unknown): PaymentCountry[] {
  const results = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { results?: unknown }).results : null
  const rows = Array.isArray(raw) ? raw : Array.isArray(results) ? results : []
  const byCountry = new Map<string, PaymentCountry>()
  for (const item of rows) {
    const parsed = Rate.safeParse(item)
    if (!parsed.success) continue
    const r = parsed.data
    if (!r.payin?.available) continue
    const code = r.country_code.toUpperCase()
    if (code.startsWith('X') || !FCFA.has((r.currency ?? '').toUpperCase())) continue
    const country = byCountry.get(code) ?? {
      code,
      name: r.country_name?.trim() || code,
      currency: (r.currency ?? 'XOF').toUpperCase(),
      networks: [],
    }
    if (country.networks.some((n) => n.code === r.network_code)) continue
    country.networks.push({
      code: r.network_code,
      name: r.network_name?.trim() || r.network_code,
      otp_required: Boolean(r.payin.otp_required),
      otp_instructions: r.payin.otp_instructions?.trim() || null,
      confirm_otp: CONFIRM_OTP_RE.test(r.network_code),
      fees: (r.payin.tiers ?? []).map((t) => ({
        min: dec(t.min_amount, '0'),
        max: t.max_amount == null || t.max_amount === '' ? null : String(t.max_amount),
        percent: dec(t.percent, '0'),
        fixed: dec(t.fixed, '0'),
        floor: dec(t.floor_amount, '0'),
        cap: t.cap_amount == null || t.cap_amount === '' ? null : String(t.cap_amount),
        mode: t.fee_charge_mode === 'DEDUCTED' ? 'DEDUCTED' : 'ADD_ON',
      })),
    })
    byCountry.set(code, country)
  }
  const collator = new Intl.Collator('fr')
  return [...byCountry.values()]
    .map((c) => ({ ...c, networks: c.networks.sort((a, b) => collator.compare(a.name, b.name)) }))
    .sort((a, b) => collator.compare(a.name, b.name))
}

export function findNetwork(options: PaymentCountry[], country: string, network: string): PaymentNetwork | null {
  return options.find((c) => c.code === country)?.networks.find((n) => n.code === network) ?? null
}

export type { NetworkRate }
