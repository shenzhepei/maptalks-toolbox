export interface AMapCredentials {
  apiKey: string
  securityCode: string
}

const storageKey = 'amap-toolbox.credentials'

const getLocalStorage = (): Storage | undefined =>
  typeof window === 'undefined' ? undefined : window.localStorage

export function readCredentials(storage = getLocalStorage()): AMapCredentials | null {
  if (!storage) return null
  try {
    const value = JSON.parse(storage.getItem(storageKey) ?? '') as Partial<AMapCredentials>
    if (!value.apiKey?.trim() || !value.securityCode?.trim()) return null
    return { apiKey: value.apiKey.trim(), securityCode: value.securityCode.trim() }
  } catch {
    return null
  }
}

export function saveCredentials(credentials: AMapCredentials, storage = getLocalStorage()) {
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

export function clearCredentials(storage = getLocalStorage()) {
  storage?.removeItem(storageKey)
}
