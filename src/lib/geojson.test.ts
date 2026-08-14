import { describe, expect, it } from 'vitest'
import { parseGeoJson, sampleGeoJson } from './geojson'

describe('GeoJSON parsing', () => {
  it('accepts a FeatureCollection', () => {
    expect(parseGeoJson(JSON.stringify(sampleGeoJson)).features).toHaveLength(2)
  })

  it('rejects unsupported roots and invalid features', () => {
    expect(() => parseGeoJson('{"type":"Point","coordinates":[0,0]}')).toThrow('FeatureCollection')
    expect(() => parseGeoJson('{"type":"FeatureCollection","features":[{}]}')).toThrow('valid GeoJSON')
  })
})
