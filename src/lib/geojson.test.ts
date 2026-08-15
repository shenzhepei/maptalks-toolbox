import { describe, expect, it } from 'vitest'
import {
  convertGeoJsonFromGcj02,
  parseGeoJson,
  sampleGeoJson,
  type GeoJsonFeatureCollection,
  type GeoJsonPosition,
} from './geojson'

describe('GeoJSON parsing', () => {
  it('accepts a FeatureCollection', () => {
    expect(parseGeoJson(JSON.stringify(sampleGeoJson)).features).toHaveLength(2)
  })

  it('rejects unsupported roots and invalid features', () => {
    expect(() => parseGeoJson('{"type":"Point","coordinates":[0,0]}')).toThrow('FeatureCollection')
    expect(() => parseGeoJson('{"type":"FeatureCollection","features":[{}]}')).toThrow('valid GeoJSON')
  })

  it('converts nested positions while preserving altitude and properties', () => {
    const source: GeoJsonFeatureCollection = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: { name: 'area' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [120.15, 30.25, 18],
                [120.16, 30.25, 20],
                [120.15, 30.25, 18],
              ],
            ],
          },
        },
      ],
    }
    const converted = convertGeoJsonFromGcj02(source, 'bd09')
    const position = (converted.features[0].geometry.coordinates as GeoJsonPosition[][])[0][0]
    expect(position[0]).not.toBe(120.15)
    expect(position[2]).toBe(18)
    expect(converted.features[0].properties).toEqual({ name: 'area' })
    expect((source.features[0].geometry.coordinates as GeoJsonPosition[][])[0][0][0]).toBe(120.15)
  })

  it('keeps GCJ-02 coordinates unchanged in a new collection', () => {
    const converted = convertGeoJsonFromGcj02(sampleGeoJson, 'gcj02')
    expect(converted).toEqual(sampleGeoJson)
    expect(converted).not.toBe(sampleGeoJson)
  })

  it('rejects non-array geometry coordinates during conversion', () => {
    const invalid = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: null } }],
    } as unknown as GeoJsonFeatureCollection
    expect(() => convertGeoJsonFromGcj02(invalid, 'wgs84')).toThrow('coordinates must be arrays')
  })
})
