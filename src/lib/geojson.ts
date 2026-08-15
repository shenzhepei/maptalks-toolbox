import { convertCoordinateFromGcj02, type CoordinateSystem } from './coordinates'

export type GeoJsonPosition = [number, number, ...number[]]
export type GeoJsonCoordinates =
  | GeoJsonPosition
  | GeoJsonPosition[]
  | GeoJsonPosition[][]
  | GeoJsonPosition[][][]

export interface GeoJsonFeature {
  type: 'Feature'
  properties?: Record<string, unknown>
  geometry: {
    type: string
    coordinates: GeoJsonCoordinates
  }
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
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

function isPosition(value: unknown[]): value is GeoJsonPosition {
  return typeof value[0] === 'number' && typeof value[1] === 'number'
}

function convertCoordinates(coordinates: unknown, target: CoordinateSystem): GeoJsonCoordinates {
  if (!Array.isArray(coordinates)) throw new Error('GeoJSON coordinates must be arrays.')
  if (isPosition(coordinates)) {
    const [longitude, latitude, ...rest] = coordinates
    const converted = convertCoordinateFromGcj02([longitude, latitude], target)
    return [...converted, ...rest]
  }
  return coordinates.map((child) => convertCoordinates(child, target)) as GeoJsonCoordinates
}

export function convertGeoJsonFromGcj02(
  collection: GeoJsonFeatureCollection,
  target: CoordinateSystem,
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature) => ({
      ...feature,
      properties: feature.properties ? { ...feature.properties } : undefined,
      geometry: {
        ...feature.geometry,
        coordinates: convertCoordinates(feature.geometry.coordinates, target),
      },
    })),
  }
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
