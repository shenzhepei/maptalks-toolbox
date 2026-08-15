import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { createExportTileStore } from './tile-store'

describe('export tile storage', () => {
  it('stores tiles in IndexedDB and deletes its temporary database', async () => {
    const store = await createExportTileStore(new IDBFactory())
    const tile = new Blob(['tile'], { type: 'image/png' })
    expect(store.kind).toBe('indexeddb')
    await store.put(0, tile)
    expect(await (await store.get(0)).text()).toBe('tile')
    await expect(store.get(1)).rejects.toThrow('tile 2 is missing')
    await store.dispose()
  })

  it('falls back to memory when IndexedDB is unavailable', async () => {
    const store = await createExportTileStore(undefined)
    const tile = new Blob(['fallback'])
    expect(store.kind).toBe('memory')
    await store.put(0, tile)
    expect(await (await store.get(0)).text()).toBe('fallback')
    await store.dispose()
    await expect(store.get(0)).rejects.toThrow('tile 1 is missing')
  })
})
