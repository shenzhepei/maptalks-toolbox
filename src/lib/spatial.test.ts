import { describe, expect, it } from 'vitest'
import type { GeoJsonFeature } from './geojson'
import { pointInPolygonFeature } from './spatial'

const polygon: GeoJsonFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ],
  },
}

describe('spatial analysis', () => {
  it('tests polygon interiors, holes, boundaries, and multipolygons', () => {
    expect(pointInPolygonFeature([2, 2], polygon)).toBe(true)
    expect(pointInPolygonFeature([5, 5], polygon)).toBe(false)
    expect(pointInPolygonFeature([0, 5], polygon)).toBe(true)
    expect(pointInPolygonFeature([12, 2], polygon)).toBe(false)
    expect(pointInPolygonFeature([22, 2], {
      ...polygon,
      geometry: { type: 'MultiPolygon', coordinates: [polygon.geometry.coordinates as any, [[[20, 0], [30, 0], [30, 10], [20, 0]]]] },
    })).toBe(true)
  })

  it('rejects non-polygon features', () => {
    expect(() => pointInPolygonFeature([0, 0], { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } })).toThrow('Polygon')
  })
})
