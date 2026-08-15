import { describe, expect, it } from 'vitest'
import {
  createExportPlan,
  lngLatToWorldPixel,
  maxExportDimension,
  worldPixelToLngLat,
} from './map-export'

describe('map export planning', () => {
  it('round-trips Web Mercator coordinates', () => {
    const source = { lng: 120.1551, lat: 30.2741 }
    const pixel = lngLatToWorldPixel(source, 16)
    const restored = worldPixelToLngLat(pixel, 16)
    expect(restored.lng).toBeCloseTo(source.lng, 8)
    expect(restored.lat).toBeCloseTo(source.lat, 8)

    const northLimit = lngLatToWorldPixel({ lng: 0, lat: 90 }, 8)
    const southLimit = lngLatToWorldPixel({ lng: 0, lat: -90 }, 8)
    expect(northLimit.y).toBeCloseTo(0, 3)
    expect(southLimit.y).toBeCloseTo(256 * 2 ** 8, 3)
  })

  it('creates a row-major grid with cropped edge tiles', () => {
    const plan = createExportPlan(
      { southWest: { lng: 120.14, lat: 30.24 }, northEast: { lng: 120.17, lat: 30.28 } },
      16,
      640,
      480,
    )
    expect(plan.width).toBeGreaterThan(640)
    expect(plan.height).toBeGreaterThan(480)
    expect(plan.tiles).toHaveLength(plan.columns * plan.rows)
    expect(plan.tiles[0]).toMatchObject({ column: 0, row: 0, x: 0, y: 0, width: 640, height: 480 })
    expect(plan.tiles.at(-1)!.width).toBeLessThanOrEqual(640)
    expect(plan.tiles.at(-1)!.height).toBeLessThanOrEqual(480)
  })

  it('rejects invalid zooms, viewports, and oversized output', () => {
    const bounds = { southWest: { lng: 120, lat: 30 }, northEast: { lng: 121, lat: 31 } }
    expect(() => createExportPlan(bounds, 2, 800, 600)).toThrow('between 3 and 20')
    expect(() => createExportPlan(bounds, 12, 0, 600)).toThrow('viewport')
    expect(() => createExportPlan(bounds, 20, 800, 600)).toThrow('too large')
    expect(() => createExportPlan(bounds, 10, 1, 1)).toThrow('tiles')
    expect(maxExportDimension).toBe(16_384)
  })
})
