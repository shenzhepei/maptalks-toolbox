import type { GeoJsonFeature, GeoJsonPosition } from './geojson'

function pointOnSegment(point: GeoJsonPosition, start: GeoJsonPosition, end: GeoJsonPosition) {
  const squaredLength = (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2
  if (squaredLength < 1e-20) return point[0] === start[0] && point[1] === start[1]
  const cross = (point[1] - start[1]) * (end[0] - start[0]) - (point[0] - start[0]) * (end[1] - start[1])
  if (Math.abs(cross) > 1e-10) return false
  const dot = (point[0] - start[0]) * (end[0] - start[0]) + (point[1] - start[1]) * (end[1] - start[1])
  if (dot < 0) return false
  return dot <= squaredLength
}

function pointInRing(point: GeoJsonPosition, ring: GeoJsonPosition[]) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const start = ring[previous]
    const end = ring[index]
    if (pointOnSegment(point, start, end)) return true
    const intersects = (end[1] > point[1]) !== (start[1] > point[1])
      && point[0] < ((start[0] - end[0]) * (point[1] - end[1])) / (start[1] - end[1]) + end[0]
    if (intersects) inside = !inside
  }
  return inside
}

function pointInPolygonCoordinates(point: GeoJsonPosition, polygon: GeoJsonPosition[][]) {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false
  return !polygon.slice(1).some((hole) => pointInRing(point, hole))
}

export function pointInPolygonFeature(point: GeoJsonPosition, feature: GeoJsonFeature) {
  if (feature.geometry.type === 'Polygon') {
    return pointInPolygonCoordinates(point, feature.geometry.coordinates as GeoJsonPosition[][])
  }
  if (feature.geometry.type === 'MultiPolygon') {
    return (feature.geometry.coordinates as GeoJsonPosition[][][]).some((polygon) => pointInPolygonCoordinates(point, polygon))
  }
  throw new Error('Select a Polygon or MultiPolygon feature.')
}
