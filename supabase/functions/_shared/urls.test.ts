import { describe, expect, it } from 'vitest'
import { resolveAppOrigin, sanitizeCheckoutUrl } from './urls.ts'

describe('resolveAppOrigin', () => {
  it('garde une origine connue (production ou preview Vercel)', () => {
    expect(resolveAppOrigin('https://numflash-rose.vercel.app')).toBe('https://numflash-rose.vercel.app')
    expect(
      resolveAppOrigin('https://numflash-git-claude-jolly-f-3447b7-osecapoch-gmailcoms-projects.vercel.app'),
    ).toBe('https://numflash-git-claude-jolly-f-3447b7-osecapoch-gmailcoms-projects.vercel.app')
    expect(resolveAppOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('remplace une origine inconnue par l’URL configurée', () => {
    expect(resolveAppOrigin('https://evil.example.com')).toBe('https://numflash-rose.vercel.app')
    expect(resolveAppOrigin('https://numflash-rose.vercel.app.evil.com')).toBe('https://numflash-rose.vercel.app')
    expect(resolveAppOrigin(null, 'https://app.numflash.com/')).toBe('https://app.numflash.com')
  })
})

describe('sanitizeCheckoutUrl', () => {
  it('accepte une URL SasPay en https', () => {
    expect(sanitizeCheckoutUrl('https://pay.saspay.me/checkout/abc')).toBe('https://pay.saspay.me/checkout/abc')
  })

  it('renvoie une chaîne vide quand il n’y a pas d’URL (flux push)', () => {
    expect(sanitizeCheckoutUrl('')).toBe('')
    expect(sanitizeCheckoutUrl(null)).toBe('')
    expect(sanitizeCheckoutUrl(undefined)).toBe('')
  })

  it('refuse les URL hors SasPay ou non https', () => {
    expect(sanitizeCheckoutUrl('https://evil.com/checkout')).toBeNull()
    expect(sanitizeCheckoutUrl('https://saspay.me.evil.com/x')).toBeNull()
    expect(sanitizeCheckoutUrl('http://pay.saspay.me/checkout/abc')).toBeNull()
    expect(sanitizeCheckoutUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeCheckoutUrl(42)).toBeNull()
  })
})
