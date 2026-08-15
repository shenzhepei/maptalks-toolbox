import { describe, expect, it } from 'vitest'
import { defaultLanguage, resolveLanguage } from './language'

describe('runtime language', () => {
  it('defaults to English for missing and invalid preferences', () => {
    expect(resolveLanguage(null)).toBe(defaultLanguage)
    expect(resolveLanguage('zh')).toBe('en')
  })

  it('restores an explicit Simplified Chinese preference', () => {
    expect(resolveLanguage('zh-CN')).toBe('zh-CN')
  })
})
