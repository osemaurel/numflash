import { describe, expect, it } from 'vitest'
import { findNetwork, paymentOptionsFromRates } from './payment-options.ts'

const tier = (percent: string, extra: Record<string, string> = {}) => ({
  min_amount: '200',
  max_amount: '100000000',
  percent,
  fixed: '0',
  floor_amount: '0',
  cap_amount: null,
  fee_charge_mode: 'ADD_ON',
  ...extra,
})

const RATES = [
  { country_code: 'CI', country_name: "Côte d'Ivoire", currency: 'XOF', network_code: 'orange_ci', network_name: 'Orange Money CI', payin: { available: true, otp_required: true, otp_instructions: 'Composez #144*82#', tiers: [tier('3.9')] } },
  { country_code: 'CI', country_name: "Côte d'Ivoire", currency: 'XOF', network_code: 'mtn_ci', network_name: 'MTN MoMo CI', payin: { available: true, otp_required: false, tiers: [tier('3.9')] } },
  { country_code: 'BJ', country_name: 'Bénin', currency: 'XOF', network_code: 'mtn_bj', network_name: 'MTN MoMo Benin', payin: { available: true, tiers: [tier('3.5')] } },
  { country_code: 'BJ', country_name: 'Bénin', currency: 'XOF', network_code: 'moov_bj', network_name: 'Moov Money Benin', payin: { available: false } },
  { country_code: 'SN', country_name: 'Sénégal', currency: 'XOF', network_code: 'wizall_sn', network_name: 'Wizall Senegal', payin: { available: true, tiers: [] } },
  { country_code: 'CM', country_name: 'Cameroun', currency: 'XAF', network_code: 'mtn_cm', network_name: 'MTN MoMo Cameroon', payin: { available: true, tiers: [tier('4.75')] } },
  { country_code: 'GH', country_name: 'Ghana', currency: 'GHS', network_code: 'mtn_gh', network_name: 'MTN MoMo Ghana', payin: { available: true } },
  { country_code: 'XX', country_name: 'International (USD)', currency: 'USD', network_code: 'card', payin: { available: true } },
  { country_code: 'BJ', network_code: 'BAD CODE', payin: { available: true } },
]

describe('paymentOptionsFromRates', () => {
  const options = paymentOptionsFromRates(RATES)

  it('garde les pays en FCFA et les réseaux ouverts au paiement, triés par nom', () => {
    expect(options.map((c) => c.code)).toEqual(['BJ', 'CM', 'CI', 'SN'])
    expect(options.find((c) => c.code === 'BJ')!.networks.map((n) => n.code)).toEqual(['mtn_bj'])
    expect(options.find((c) => c.code === 'CI')!.networks.map((n) => n.code)).toEqual(['mtn_ci', 'orange_ci'])
  })

  it('signale le code préalable (USSD) et le code de confirmation', () => {
    const orange = findNetwork(options, 'CI', 'orange_ci')!
    expect(orange.otp_required).toBe(true)
    expect(orange.otp_instructions).toBe('Composez #144*82#')
    expect(findNetwork(options, 'SN', 'wizall_sn')!.confirm_otp).toBe(true)
    expect(findNetwork(options, 'CI', 'mtn_ci')!.confirm_otp).toBe(false)
  })

  it('normalise les frais sans flottant', () => {
    expect(findNetwork(options, 'CM', 'mtn_cm')!.fees).toEqual([
      { min: '200', max: '100000000', percent: '4.75', fixed: '0', floor: '0', cap: null, mode: 'ADD_ON' },
    ])
  })

  it('accepte une réponse paginée et ignore une réponse inattendue', () => {
    expect(paymentOptionsFromRates({ results: RATES }).length).toBe(4)
    expect(paymentOptionsFromRates({ oops: true })).toEqual([])
    expect(paymentOptionsFromRates(null)).toEqual([])
  })
})
