import { describe, expect, it } from 'vitest'
import { safeRedirect, withRedirect } from './redirect'

describe('safeRedirect', () => {
  it('accepte un chemin interne avec paramètres', () => {
    expect(safeRedirect('/service/whatsapp?pays=france')).toBe('/service/whatsapp?pays=france')
    expect(safeRedirect('/wallet')).toBe('/wallet')
  })

  it('refuse les destinations externes ou ambiguës', () => {
    for (const raw of ['https://evil.example', '//evil.example', '/\\evil.example', 'evil.example', '/\u0000x', '/a\\b', '', null, undefined]) {
      expect(safeRedirect(raw)).toBeNull()
    }
  })

  it('refuse de renvoyer vers les pages de connexion et d’inscription', () => {
    expect(safeRedirect('/connexion')).toBeNull()
    expect(safeRedirect('/inscription?redirect=%2Fwallet')).toBeNull()
  })

  it('refuse les chemins démesurés', () => {
    expect(safeRedirect('/' + 'a'.repeat(600))).toBeNull()
  })
})

describe('withRedirect', () => {
  it('encode la destination', () => {
    expect(withRedirect('/connexion', '/service/telegram?pays=germany')).toBe('/connexion?redirect=%2Fservice%2Ftelegram%3Fpays%3Dgermany')
  })

  it('ignore une destination invalide', () => {
    expect(withRedirect('/inscription', '//evil.example')).toBe('/inscription')
    expect(withRedirect('/inscription', null)).toBe('/inscription')
  })
})
