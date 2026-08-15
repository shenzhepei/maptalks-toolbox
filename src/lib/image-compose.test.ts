import { createCanvas, loadImage } from '@napi-rs/canvas'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeStoredTiles, createBrowserCanvasAdapter, type CanvasAdapter } from './image-compose'
import type { ExportPlan } from './map-export'
import { createExportTileStore } from './tile-store'

function createNodeCanvasAdapter(): CanvasAdapter<any, any, any> {
  return {
    create(width, height) {
      const canvas = createCanvas(width, height)
      const context = canvas.getContext('2d')
      return {
        canvas,
        context,
        drawImage: (image, sourceWidth, sourceHeight, x, y, width, height) => {
          context.drawImage(image, 0, 0, sourceWidth, sourceHeight, x, y, width, height)
        },
      }
    },
    async decode(blob) {
      return loadImage(Buffer.from(await blob.arrayBuffer()))
    },
    async encode(canvas) {
      return new Blob([canvas.toBuffer('image/png')], { type: 'image/png' })
    },
  }
}

function colorTile(color: string) {
  const canvas = createCanvas(2, 2)
  const context = canvas.getContext('2d')
  context.fillStyle = color
  context.fillRect(0, 0, 2, 2)
  return canvas
}

describe('stored Canvas tile composition', () => {
  it('encodes real Canvas tiles, stores them in IndexedDB, and produces a nonblank PNG', async () => {
    const adapter = createNodeCanvasAdapter()
    const store = await createExportTileStore(new IDBFactory())
    await store.put(0, await adapter.encode(colorTile('#ff0000')))
    await store.put(1, await adapter.encode(colorTile('#0066ff')))

    const plan: ExportPlan = {
      width: 4,
      height: 2,
      columns: 2,
      rows: 1,
      tiles: [
        { column: 0, row: 0, x: 0, y: 0, width: 2, height: 2, center: { lng: 0, lat: 0 } },
        { column: 1, row: 0, x: 2, y: 0, width: 2, height: 2, center: { lng: 1, lat: 0 } },
      ],
    }
    const progress: number[] = []
    const output = await composeStoredTiles(plan, store, adapter, (completed) => progress.push(completed))
    const pixels = output.context.getImageData(0, 0, 4, 2).data

    expect(Array.from(pixels.slice(0, 4))).toEqual([255, 0, 0, 255])
    expect(Array.from(pixels.slice(8, 12))).toEqual([0, 102, 255, 255])
    expect(new Set(Array.from(pixels))).not.toEqual(new Set([0]))
    expect(progress).toEqual([1, 2])

    const png = await adapter.encode(output.canvas)
    const decoded = await loadImage(Buffer.from(await png.arrayBuffer()))
    expect(png.size).toBeGreaterThan(50)
    expect([decoded.width, decoded.height]).toEqual([4, 2])
    await store.dispose()
  })

  it('uses the browser Canvas adapter and reports browser capability failures', async () => {
    const drawImage = vi.fn()
    const close = vi.fn()
    const canvas = {
      getContext: vi.fn(() => ({ drawImage })),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(new Blob(['png']))),
      width: 0,
      height: 0,
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close })))
    const adapter = createBrowserCanvasAdapter()
    const surface = adapter.create(8, 6)
    surface.drawImage({} as ImageBitmap, 2, 2, 1, 2, 3, 4)
    expect([canvas.width, canvas.height]).toEqual([8, 6])
    expect(drawImage).toHaveBeenCalledWith({}, 0, 0, 2, 2, 1, 2, 3, 4)
    expect((await adapter.encode(canvas as unknown as HTMLCanvasElement)).size).toBe(3)
    const image = await adapter.decode(new Blob(['image']))
    adapter.close?.(image)
    expect(close).toHaveBeenCalled()

    vi.stubGlobal('createImageBitmap', undefined)
    await expect(adapter.decode(new Blob())).rejects.toThrow('cannot decode')
    canvas.toBlob.mockImplementationOnce((callback) => callback(null))
    await expect(adapter.encode(canvas as unknown as HTMLCanvasElement)).rejects.toThrow('could not encode')
    canvas.getContext.mockImplementationOnce(() => null as any)
    expect(() => adapter.create(1, 1)).toThrow('output canvas')
  })
})

afterEach(() => vi.unstubAllGlobals())
