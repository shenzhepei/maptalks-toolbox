import gcoord from 'gcoord'

export interface CoordinateSet {
  gcj02: [number, number]
  wgs84: [number, number]
  cgcs2000: [number, number]
  bd09: [number, number]
}

export type CoordinateSystem = keyof CoordinateSet

export function parseCoordinate(value: string): [number, number] | null {
  const parts = value.split(',').map((part) => Number(part.trim()))
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return null
  const [longitude, latitude] = parts
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null
  return [longitude, latitude]
}

export function convertFromGcj02(coordinate: [number, number]): CoordinateSet {
  const wgs84 = gcoord.transform(coordinate, gcoord.GCJ02, gcoord.WGS84) as [number, number]
  return {
    gcj02: coordinate,
    wgs84,
    // At six decimal places, geographic CGCS2000 is represented by the de-offset WGS84 position.
    cgcs2000: [...wgs84],
    bd09: gcoord.transform(coordinate, gcoord.GCJ02, gcoord.BD09) as [number, number],
  }
}

export function convertCoordinateFromGcj02(coordinate: [number, number], target: CoordinateSystem) {
  return convertFromGcj02(coordinate)[target]
}

export function formatCoordinate(coordinate: [number, number]) {
  return coordinate.map((value) => value.toFixed(6)).join(', ')
}
