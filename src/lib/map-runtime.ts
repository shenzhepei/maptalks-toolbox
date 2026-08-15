import AMapLoader from '@amap/amap-jsapi-loader'
import html2canvas from 'html2canvas'
import type { AMapCredentials } from './credentials'
import type { GeoJsonFeature, GeoJsonFeatureCollection, GeoJsonPosition } from './geojson'
import { createExportPlan, type ExportBounds, type LngLatValue } from './map-export'
import { createExportTileStore } from './tile-store'

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

export interface PlaceResult {
  id: string
  name: string
  address: string
  position: [number, number]
}

export type GeoJsonDrawingMode = 'Point' | 'LineString' | 'Polygon'

export interface MapExportProgress {
  phase: 'capturing' | 'merging'
  completed: number
  total: number
  width: number
  height: number
}

export interface MapExportOptions {
  selectionOnly: boolean
  zoom: number
  onProgress?: (progress: MapExportProgress) => void
}

export interface MapRuntime {
  AMap: any
  map: any
  destroy: () => void
  setSatellite: (enabled: boolean) => void
  searchPlaces: (keyword: string) => Promise<PlaceResult[]>
  mark: (position: [number, number]) => void
  renderGeoJson: (data: GeoJsonFeatureCollection) => number
  clearGeoJson: () => void
  startGeoJsonDrawing: (mode: GeoJsonDrawingMode) => Promise<GeoJsonFeature>
  clearDrawings: () => void
  startRectangle: () => Promise<any>
  clearRectangle: () => void
  exportPng: (options: MapExportOptions) => Promise<void>
}

export async function createMapRuntime(container: HTMLElement, credentials: AMapCredentials): Promise<MapRuntime> {
  window._AMapSecurityConfig = { securityJsCode: credentials.securityCode }
  const AMap = await AMapLoader.load({
    key: credentials.apiKey,
    version: '2.0',
    plugins: ['AMap.PlaceSearch', 'AMap.ToolBar', 'AMap.Scale', 'AMap.MouseTool', 'AMap.GeoJSON'],
  })
  const map = new AMap.Map(container, {
    center: [120.1551, 30.2741],
    zoom: 11,
    viewMode: '2D',
  })
  map.addControl(new AMap.ToolBar({ position: { right: '18px', bottom: '54px' } }))
  map.addControl(new AMap.Scale())

  let marker: any
  let satellite: any
  let geoJsonLayer: any
  let rectangle: any
  const mouseTool = new AMap.MouseTool(map)
  const drawingMouseTool = new AMap.MouseTool(map)
  const drawnOverlays: any[] = []

  const mark = (position: [number, number]) => {
    if (marker) map.remove(marker)
    marker = new AMap.Marker({ position, anchor: 'bottom-center' })
    map.add(marker)
    map.setCenter(position)
  }

  const clearGeoJson = () => {
    if (geoJsonLayer) map.remove(geoJsonLayer)
    geoJsonLayer = undefined
  }

  const clearRectangle = () => {
    mouseTool.close(true)
    if (rectangle) map.remove(rectangle)
    rectangle = undefined
  }

  const toPosition = (value: any): GeoJsonPosition => [
    Number(value.lng ?? value.getLng()),
    Number(value.lat ?? value.getLat()),
  ]

  const closeRing = (positions: GeoJsonPosition[]) => {
    if (!positions.length) return positions
    const first = positions[0]
    const last = positions.at(-1)!
    return first[0] === last[0] && first[1] === last[1] ? positions : [...positions, [...first]]
  }

  const featureFromOverlay = (mode: GeoJsonDrawingMode, overlay: any): GeoJsonFeature => {
    if (mode === 'Point') {
      return {
        type: 'Feature',
        properties: {},
        geometry: { type: mode, coordinates: toPosition(overlay.getPosition()) },
      }
    }
    const path = overlay.getPath().map(toPosition)
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: mode, coordinates: mode === 'Polygon' ? [closeRing(path)] : path },
    }
  }

  const clearDrawings = () => {
    drawingMouseTool.close(true)
    if (drawnOverlays.length) map.remove([...drawnOverlays])
    drawnOverlays.length = 0
  }

  const toLngLatValue = (value: any): LngLatValue => ({
    lng: Number(value.lng ?? value.getLng()),
    lat: Number(value.lat ?? value.getLat()),
  })

  const getExportBounds = (source: any): ExportBounds => ({
    southWest: toLngLatValue(source.getSouthWest()),
    northEast: toLngLatValue(source.getNorthEast()),
  })

  const moveMapForExport = (center: LngLatValue, zoom: number) =>
    new Promise<void>((resolve) => {
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        map.off('complete', finish)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }
      const timeout = setTimeout(finish, 4000)
      map.on('complete', finish)
      map.setZoomAndCenter(zoom, [center.lng, center.lat], true)
    })

  const canvasToBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser could not encode the PNG.'))), 'image/png')
    })

  const blobToImage = async (blob: Blob): Promise<ImageBitmap> => {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('This browser cannot decode captured map tiles.')
    }
    return createImageBitmap(blob)
  }

  return {
    AMap,
    map,
    destroy: () => map.destroy(),
    setSatellite(enabled) {
      if (enabled && !satellite) {
        satellite = new AMap.TileLayer.Satellite()
        map.add(satellite)
      } else if (!enabled && satellite) {
        map.remove(satellite)
        satellite = undefined
      }
    },
    searchPlaces(keyword) {
      const search = new AMap.PlaceSearch({ pageSize: 8, extensions: 'base' })
      return new Promise((resolve, reject) => {
        search.search(keyword, (status: string, result: any) => {
          if (status !== 'complete' || !result?.poiList?.pois) {
            reject(new Error('No place results were returned. Check your key domain settings.'))
            return
          }
          resolve(
            result.poiList.pois.map((poi: any) => ({
              id: poi.id,
              name: poi.name,
              address: [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean).join(' '),
              position: [poi.location.lng, poi.location.lat],
            })),
          )
        })
      })
    },
    mark,
    renderGeoJson(data) {
      clearGeoJson()
      geoJsonLayer = new AMap.GeoJSON({
        geoJSON: data,
        getMarker: (_geojson: unknown, lngLat: any) => new AMap.Marker({ position: lngLat }),
        getPolyline: (_geojson: unknown, lngLats: any) =>
          new AMap.Polyline({ path: lngLats, strokeColor: '#d84a2f', strokeWeight: 5, strokeOpacity: 0.9 }),
        getPolygon: (_geojson: unknown, lngLats: any) =>
          new AMap.Polygon({
            path: lngLats,
            strokeColor: '#16856f',
            strokeWeight: 3,
            fillColor: '#46b99e',
            fillOpacity: 0.22,
          }),
      })
      map.add(geoJsonLayer)
      map.setFitView([geoJsonLayer], false, [72, 72, 72, 72], 16)
      return data.features.length
    },
    clearGeoJson,
    startGeoJsonDrawing(mode) {
      drawingMouseTool.close(false)
      return new Promise((resolve) => {
        const onDraw = (event: any) => {
          const overlay = event.obj
          drawnOverlays.push(overlay)
          drawingMouseTool.close(false)
          drawingMouseTool.off('draw', onDraw)
          resolve(featureFromOverlay(mode, overlay))
        }
        drawingMouseTool.on('draw', onDraw)
        if (mode === 'Point') {
          drawingMouseTool.marker({ anchor: 'bottom-center' })
        } else if (mode === 'LineString') {
          drawingMouseTool.polyline({ strokeColor: '#d84a2f', strokeWeight: 5, strokeOpacity: 0.9 })
        } else {
          drawingMouseTool.polygon({
            strokeColor: '#16856f',
            strokeWeight: 3,
            fillColor: '#46b99e',
            fillOpacity: 0.22,
          })
        }
      })
    },
    clearDrawings,
    startRectangle() {
      clearRectangle()
      return new Promise((resolve) => {
        const onDraw = (event: any) => {
          rectangle = event.obj
          mouseTool.close(false)
          mouseTool.off('draw', onDraw)
          resolve(rectangle)
        }
        mouseTool.on('draw', onDraw)
        mouseTool.rectangle({
          strokeColor: '#d84a2f',
          strokeWeight: 3,
          fillColor: '#d84a2f',
          fillOpacity: 0.12,
        })
      })
    },
    clearRectangle,
    async exportPng(options) {
      if (options.selectionOnly && !rectangle) throw new Error('Select a region before exporting it.')
      const bounds = getExportBounds(options.selectionOnly ? rectangle.getBounds() : map.getBounds())
      const plan = createExportPlan(bounds, options.zoom, container.clientWidth, container.clientHeight)
      const originalCenter = map.getCenter()
      const originalZoom = map.getZoom()
      const output = document.createElement('canvas')
      output.width = plan.width
      output.height = plan.height
      const context = output.getContext('2d')
      if (!context) throw new Error('The browser could not create the output canvas.')
      const tileStore = await createExportTileStore()

      options.onProgress?.({ phase: 'capturing', completed: 0, total: plan.tiles.length, width: plan.width, height: plan.height })
      container.classList.add('map-exporting')
      rectangle?.hide?.()

      try {
        for (let index = 0; index < plan.tiles.length; index += 1) {
          const tile = plan.tiles[index]
          await moveMapForExport(tile.center, options.zoom)
          const tileCanvas = await html2canvas(container, {
            useCORS: true,
            logging: false,
            backgroundColor: '#eef1ef',
            scale: 1,
          })
          await tileStore.put(index, await canvasToBlob(tileCanvas))
          options.onProgress?.({
            phase: 'capturing',
            completed: index + 1,
            total: plan.tiles.length,
            width: plan.width,
            height: plan.height,
          })
        }

        options.onProgress?.({ phase: 'merging', completed: 0, total: plan.tiles.length, width: plan.width, height: plan.height })
        for (let index = 0; index < plan.tiles.length; index += 1) {
          const tile = plan.tiles[index]
          const image = await blobToImage(await tileStore.get(index))
          context.drawImage(image, 0, 0, tile.width, tile.height, tile.x, tile.y, tile.width, tile.height)
          image.close()
          options.onProgress?.({
            phase: 'merging',
            completed: index + 1,
            total: plan.tiles.length,
            width: plan.width,
            height: plan.height,
          })
        }

        const copyright = container.querySelector('.amap-copyright')?.textContent?.trim()
        const attribution = ['AMap', copyright].filter(Boolean).join(' | ')
        context.font = '12px sans-serif'
        const attributionWidth = Math.ceil(context.measureText(attribution).width) + 16
        context.fillStyle = 'rgba(255, 255, 255, 0.86)'
        context.fillRect(8, plan.height - 28, attributionWidth, 20)
        context.fillStyle = '#34443f'
        context.fillText(attribution, 16, plan.height - 14)

        const blob = await canvasToBlob(output)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `amap-${options.zoom}z-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      } finally {
        try {
          await tileStore.dispose()
        } finally {
          container.classList.remove('map-exporting')
          rectangle?.show?.()
          map.setZoomAndCenter(originalZoom, originalCenter, true)
        }
      }
    },
  }
}
