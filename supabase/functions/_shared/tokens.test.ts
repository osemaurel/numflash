import { describe, expect, it } from 'vitest'
import { timingSafeEqual } from './tokens.ts'

describe('timingSafeEqual', () => {
  it('compare des jetons identiques ou différents', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true)
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false)
    expect(timingSafeEqual('abc123', 'abc12')).toBe(false)
    expect(timingSafeEqual('', 'x')).toBe(false)
    expect(timingSafeEqual('', '')).toBe(true)
  })
})
