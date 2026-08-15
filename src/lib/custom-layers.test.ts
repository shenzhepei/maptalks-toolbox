import { describe, expect, it, vi } from 'vitest'
import { createCustomLayer, customLayersStorageKey, loadCustomLayers, saveCustomLayers } from './custom-layers'

describe('custom layers', () => {
  it('validates and normalizes layer definitions', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'layer-id' })
    expect(createCustomLayer({
      name: ' Streets ', type: 'xyz', url: 'https://tiles.example.com/{z}/{x}/{y}.png',
    })).toMatchObject({ id: 'layer-id', name: 'Streets', type: 'xyz', visible: true, opacity: 1 })
    expect(createCustomLayer({
      name: 'ArcGIS', type: 'arcgis', url: 'https://example.com/arcgis/rest/services/demo/MapServer/',
    }).url).toBe('https://example.com/arcgis/rest/services/demo/MapServer/tile/{z}/{y}/{x}')
    expect(createCustomLayer({
      name: 'ArcGIS template', type: 'arcgis', url: 'https://example.com/tile/{z}/{y}/{x}',
    }).url).toBe('https://example.com/tile/{z}/{y}/{x}')
    expect(createCustomLayer({
      name: 'WMS', type: 'wms', url: 'https://example.com/wms', wmsLayers: ' demo:roads ',
    }).wmsLayers).toBe('demo:roads')
    expect(() => createCustomLayer({ name: ' ', type: 'wms', url: 'https://example.com/wms', wmsLayers: 'roads' })).toThrow('layer name')
    expect(() => createCustomLayer({ name: 'FTP', type: 'wms', url: 'ftp://example.com/wms', wmsLayers: 'roads' })).toThrow('HTTP')
    expect(() => createCustomLayer({ name: 'Bad', type: 'xyz', url: 'https://example.com/tiles' })).toThrow('{z}')
    expect(() => createCustomLayer({ name: 'WMS', type: 'wms', url: 'https://example.com/wms' })).toThrow('WMS layer')
  })

  it('persists valid local definitions and rejects malformed storage', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } as Storage
    const layer = createCustomLayer({
      name: 'WMS', type: 'wms', url: 'https://example.com/wms', wmsLayers: 'demo:roads',
    })
    saveCustomLayers([layer], storage)
    expect(loadCustomLayers(storage)).toEqual([layer])
    values.set(customLayersStorageKey, JSON.stringify([
      { ...layer, opacity: 4 },
      { id: 1, name: 'Invalid' },
    ]))
    expect(loadCustomLayers(storage)).toMatchObject([{ opacity: 1 }])
    values.set(customLayersStorageKey, '{}')
    expect(loadCustomLayers(storage)).toEqual([])
    values.set(customLayersStorageKey, '{bad json')
    expect(loadCustomLayers(storage)).toEqual([])
    expect(loadCustomLayers(undefined)).toEqual([])
    expect(() => saveCustomLayers([layer], { setItem: () => { throw new Error('blocked') } } as unknown as Storage)).not.toThrow()
  })
})
