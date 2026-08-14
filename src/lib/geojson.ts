export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties?: Record<string, unknown>
    geometry: {
      type: string
      coordinates: unknown
    }
  }>
}

export function parseGeoJson(value: string): GeoJsonFeatureCollection {
  const parsed = JSON.parse(value) as Partial<GeoJsonFeatureCollection>
  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('The file must contain a GeoJSON FeatureCollection.')
  }
  if (parsed.features.some((feature) => feature?.type !== 'Feature' || !feature.geometry)) {
    throw new Error('Every item must be a valid GeoJSON Feature.')
  }
  return parsed as GeoJsonFeatureCollection
}

export const sampleGeoJson: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'West Lake demo route' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [120.1393, 30.2517],
          [120.1481, 30.2448],
          [120.1568, 30.2372],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Demo point' },
      geometry: { type: 'Point', coordinates: [120.1481, 30.2448] },
    },
  ],
}
