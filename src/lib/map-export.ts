export interface LngLatValue {
  lng: number
  lat: number
}

export interface ExportBounds {
  southWest: LngLatValue
  northEast: LngLatValue
}

export interface ExportTile {
  column: number
  row: number
  x: number
  y: number
  width: number
  height: number
  center: LngLatValue
}

export interface ExportPlan {
  width: number
  height: number
  columns: number
  rows: number
  tiles: ExportTile[]
}

const tileSize = 256
const maxLatitude = 85.05112878
export const maxExportPixels = 64_000_000
export const maxExportDimension = 16_384
export const maxExportTiles = 256

export function lngLatToWorldPixel(value: LngLatValue, zoom: number) {
  const scale = tileSize * 2 ** zoom
  const latitude = Math.max(-maxLatitude, Math.min(maxLatitude, value.lat))
  const sinLatitude = Math.sin((latitude * Math.PI) / 180)
  return {
    x: ((value.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale,
  }
}

export function worldPixelToLngLat(value: { x: number; y: number }, zoom: number): LngLatValue {
  const scale = tileSize * 2 ** zoom
  const longitude = (value.x / scale) * 360 - 180
  const mercator = Math.PI * (1 - (2 * value.y) / scale)
  return {
    lng: longitude,
    lat: (Math.atan(Math.sinh(mercator)) * 180) / Math.PI,
  }
}

export function createExportPlan(
  bounds: ExportBounds,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): ExportPlan {
  if (!Number.isFinite(zoom) || zoom < 3 || zoom > 20) {
    throw new Error('Export zoom must be between 3 and 20.')
  }
  if (viewportWidth < 1 || viewportHeight < 1) {
    throw new Error('The map viewport is not ready for export.')
  }

  const northWestPixel = lngLatToWorldPixel({ lng: bounds.southWest.lng, lat: bounds.northEast.lat }, zoom)
  const southEastPixel = lngLatToWorldPixel({ lng: bounds.northEast.lng, lat: bounds.southWest.lat }, zoom)
  const width = Math.max(1, Math.ceil(southEastPixel.x - northWestPixel.x))
  const height = Math.max(1, Math.ceil(southEastPixel.y - northWestPixel.y))

  if (width > maxExportDimension || height > maxExportDimension || width * height > maxExportPixels) {
    throw new Error(`Output ${width} x ${height}px is too large. Reduce the export zoom or area.`)
  }

  const columns = Math.ceil(width / viewportWidth)
  const rows = Math.ceil(height / viewportHeight)
  if (columns * rows > maxExportTiles) {
    throw new Error(`Export requires ${columns * rows} tiles. Reduce the export zoom or area.`)
  }

  const tiles: ExportTile[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * viewportWidth
      const y = row * viewportHeight
      const tileWidth = Math.min(viewportWidth, width - x)
      const tileHeight = Math.min(viewportHeight, height - y)
      tiles.push({
        column,
        row,
        x,
        y,
        width: tileWidth,
        height: tileHeight,
        center: worldPixelToLngLat(
          {
            x: northWestPixel.x + x + viewportWidth / 2,
            y: northWestPixel.y + y + viewportHeight / 2,
          },
          zoom,
        ),
      })
    }
  }

  return { width, height, columns, rows, tiles }
}
