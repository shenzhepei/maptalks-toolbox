import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCredentials, readCredentials, saveCredentials } from './credentials'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('credential storage', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses browser localStorage by default', () => {
    const storage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage: storage })
    saveCredentials({ apiKey: 'persistent-key', securityCode: 'persistent-code' })
    expect(readCredentials()).toEqual({ apiKey: 'persistent-key', securityCode: 'persistent-code' })
    clearCredentials()
    expect(storage.length).toBe(0)
  })

  it('normalizes, stores, and reads both credentials', () => {
    const storage = new MemoryStorage()
    expect(saveCredentials({ apiKey: ' key ', securityCode: ' code ' }, storage)).toEqual({
      apiKey: 'key',
      securityCode: 'code',
    })
    expect(readCredentials(storage)).toEqual({ apiKey: 'key', securityCode: 'code' })
  })

  it('rejects incomplete values', () => {
    const storage = new MemoryStorage()
    expect(() => saveCredentials({ apiKey: 'key', securityCode: ' ' }, storage)).toThrow()
    storage.setItem('amap-toolbox.credentials', JSON.stringify({ apiKey: 'key' }))
    expect(readCredentials(storage)).toBeNull()
  })

  it('handles invalid storage and clearing', () => {
    const storage = new MemoryStorage()
    storage.setItem('amap-toolbox.credentials', '{')
    expect(readCredentials(storage)).toBeNull()
    clearCredentials(storage)
    expect(storage.length).toBe(0)
    expect(readCredentials(undefined)).toBeNull()
  })
})
