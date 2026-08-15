import { describe, expect, it } from 'vitest'
import { appendFeatures, createWorkspaceSnapshot, loadWorkspace, saveWorkspace, workspaceStorageKey } from './map-workspace'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  }
}

describe('map workspace persistence', () => {
  it('adds stable feature ids and round-trips local storage', () => {
    const storage = memoryStorage()
    const initial = createWorkspaceSnapshot()
    expect(initial.sourceCrs).toBe('wgs84')
    expect(initial.targetCrs).toBe('wgs84')
    const next = appendFeatures(initial, [{ type: 'Feature', properties: { name: 'A' }, geometry: { type: 'Point', coordinates: [120, 30] } }])
    expect(next.collection.features[0].id).toBeTruthy()
    saveWorkspace(next, storage)
    expect(storage.getItem(workspaceStorageKey)).toContain('Point')
    expect(loadWorkspace(storage)).toEqual(next)
  })

  it('falls back to defaults for invalid saved state and unavailable storage', () => {
    const storage = memoryStorage()
    storage.setItem(workspaceStorageKey, '{invalid')
    expect(loadWorkspace(storage).collection.features).toEqual([])
    expect(loadWorkspace(undefined).style.strokeWidth).toBe(3)
  })
})
