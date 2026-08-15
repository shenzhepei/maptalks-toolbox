import type { ExportPlan } from './map-export'
import type { ExportTileStore } from './tile-store'

export interface CanvasSurface<TCanvas = unknown, TContext = unknown, TImage = unknown> {
  canvas: TCanvas
  context: TContext
  drawImage: (image: TImage, sourceWidth: number, sourceHeight: number, x: number, y: number, width: number, height: number) => void
}

export interface CanvasAdapter<TCanvas = unknown, TContext = unknown, TImage = unknown> {
  create: (width: number, height: number) => CanvasSurface<TCanvas, TContext, TImage>
  decode: (blob: Blob) => Promise<TImage>
  encode: (canvas: TCanvas) => Promise<Blob>
  close?: (image: TImage) => void
}

export function createBrowserCanvasAdapter(): CanvasAdapter<HTMLCanvasElement, CanvasRenderingContext2D, ImageBitmap> {
  return {
    create(width, height) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('The browser could not create the output canvas.')
      return {
        canvas,
        context,
        drawImage: (image, sourceWidth, sourceHeight, x, y, targetWidth, targetHeight) => {
          context.drawImage(image, 0, 0, sourceWidth, sourceHeight, x, y, targetWidth, targetHeight)
        },
      }
    },
    async decode(blob) {
      if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot decode captured map tiles.')
      return createImageBitmap(blob)
    },
    encode(canvas) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the PNG.'))), 'image/png')
      })
    },
    close: (image) => image.close(),
  }
}

export async function composeStoredTiles<TCanvas, TContext, TImage>(
  plan: ExportPlan,
  store: ExportTileStore,
  adapter: CanvasAdapter<TCanvas, TContext, TImage>,
  onTile?: (completed: number) => void,
) {
  const surface = adapter.create(plan.width, plan.height)
  for (let index = 0; index < plan.tiles.length; index += 1) {
    const tile = plan.tiles[index]
    const image = await adapter.decode(await store.get(index))
    surface.drawImage(image, tile.width, tile.height, tile.x, tile.y, tile.width, tile.height)
    adapter.close?.(image)
    onTile?.(index + 1)
  }
  return surface
}
