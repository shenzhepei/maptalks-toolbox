export type CustomLayerType = 'xyz' | 'wms' | 'arcgis'

export interface CustomLayerDefinition {
  id: string
  name: string
  type: CustomLayerType
  url: string
  wmsLayers?: string
  visible: boolean
  opacity: number
}

export const customLayersStorageKey = 'amap-toolbox-custom-layers-v1'

function createLayerId() {
  return globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeUrl(type: CustomLayerType, value: string) {
  const url = value.trim()
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Layer URL must use HTTP or HTTPS.')
  if (type === 'xyz' && !['{x}', '{y}', '{z}'].every((token) => url.includes(token))) {
    throw new Error('XYZ URL must contain {z}, {x}, and {y}.')
  }
  if (type === 'arcgis' && !url.includes('{z}')) {
    return `${url.replace(/\/$/, '')}/tile/{z}/{y}/{x}`
  }
  return url
}

export function createCustomLayer(value: {
  name: string
  type: CustomLayerType
  url: string
  wmsLayers?: string
}): CustomLayerDefinition {
  const name = value.name.trim()
  if (!name) throw new Error('Enter a layer name.')
  if (value.type === 'wms' && !value.wmsLayers?.trim()) throw new Error('Enter at least one WMS layer name.')
  return {
    id: createLayerId(),
    name,
    type: value.type,
    url: normalizeUrl(value.type, value.url),
    wmsLayers: value.type === 'wms' ? value.wmsLayers?.trim() : undefined,
    visible: true,
    opacity: 1,
  }
}

function isLayer(value: unknown): value is CustomLayerDefinition {
  if (!value || typeof value !== 'object') return false
  const layer = value as Record<string, unknown>
  return typeof layer.id === 'string'
    && typeof layer.name === 'string'
    && ['xyz', 'wms', 'arcgis'].includes(String(layer.type))
    && typeof layer.url === 'string'
    && typeof layer.visible === 'boolean'
    && typeof layer.opacity === 'number'
}

export function loadCustomLayers(storage: Storage | undefined = globalThis.localStorage) {
  if (!storage) return []
  try {
    const value = storage.getItem(customLayersStorageKey)
    if (!value) return []
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter(isLayer).map((layer) => ({
      ...layer,
      opacity: Math.min(1, Math.max(0, layer.opacity)),
    })) : []
  } catch {
    return []
  }
}

export function saveCustomLayers(layers: CustomLayerDefinition[], storage: Storage | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(customLayersStorageKey, JSON.stringify(layers))
  } catch {
    // Browser privacy settings or quota limits can disable local persistence.
  }
}
