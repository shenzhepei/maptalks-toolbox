import { describe, expect, it } from 'vitest'
import { features, findFeature } from './features'

describe('feature registry', () => {
  it('contains unique, discoverable feature modules', () => {
    expect(features.map((feature) => feature.id)).toEqual(['explore', 'geojson-studio', 'layer-lab', 'gis-export'])
    expect(new Set(features.map((feature) => feature.id)).size).toBe(features.length)
    expect(findFeature('gis-export')?.label).toBe('GIS to image')
    expect(findFeature('geojson-studio')?.label).toBe('GeoJSON studio')
    expect(findFeature('layer-lab')?.label).toBe('Layer lab')
    expect(findFeature('missing')).toBeUndefined()
  })
})
