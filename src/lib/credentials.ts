export interface AMapCredentials {
  apiKey: string
  securityCode: string
}

const storageKey = 'amap-toolbox.credentials'

const getSessionStorage = (): Storage | undefined =>
  typeof window === 'undefined' ? undefined : window.sessionStorage

export function readCredentials(storage = getSessionStorage()): AMapCredentials | null {
  if (!storage) return null
  try {
    const value = JSON.parse(storage.getItem(storageKey) ?? '') as Partial<AMapCredentials>
    if (!value.apiKey?.trim() || !value.securityCode?.trim()) return null
    return { apiKey: value.apiKey.trim(), securityCode: value.securityCode.trim() }
  } catch {
    return null
  }
}

export function saveCredentials(credentials: AMapCredentials, storage = getSessionStorage()) {
  const normalized = {
    apiKey: credentials.apiKey.trim(),
    securityCode: credentials.securityCode.trim(),
  }
  if (!normalized.apiKey || !normalized.securityCode) {
    throw new Error('Both the JS API key and security code are required.')
  }
  storage?.setItem(storageKey, JSON.stringify(normalized))
  return normalized
}

export function clearCredentials(storage = getSessionStorage()) {
  storage?.removeItem(storageKey)
}
