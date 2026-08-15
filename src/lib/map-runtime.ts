import AMapLoader from '@amap/amap-jsapi-loader'
import {
  DrawTool,
  GeoJSON,
  Map as MaptalksMap,
  Marker,
  TileLayer,
  VectorLayer,
  WMSTileLayer,
} from 'maptalks/dist/maptalks.es.js'
import type { AMapCredentials } from './credentials'
import type { CustomLayerDefinition } from './custom-layers'
import { convertCoordinate } from './coordinates'
import { composeStoredTiles, createBrowserCanvasAdapter } from './image-compose'
import { createExportPlan, type ExportBounds, type LngLatValue } from './map-export'
import type { GeoJsonFeature, GeoJsonFeatureCollection } from './geojson'
import type { GeoJsonStyle } from './map-workspace'
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

export interface MeasurementResult {
  type: 'distance' | 'area'
  value: number
  label: string
}

export interface GeoJsonRenderOptions {
  style: GeoJsonStyle
  selectedFeatureId?: string | number | null
  onSelect?: (id: string | number) => void
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
  engine: 'maptalks'
  map: any
  hasAMapServices: boolean
  destroy: () => void
  clearGraphics: () => void
  setCustomLayers: (definitions: CustomLayerDefinition[]) => void
  updateCustomLayer: (id: string, options: { visible?: boolean; opacity?: number }) => void
  removeCustomLayer: (id: string) => void
  clearCustomLayers: () => void
  setSatellite: (enabled: boolean) => void
  searchPlaces: (keyword: string) => Promise<PlaceResult[]>
  mark: (position: [number, number], options?: { center?: boolean }) => void
  renderGeoJson: (data: GeoJsonFeatureCollection, options?: GeoJsonRenderOptions) => number
  focusFeature: (id: string | number) => void
  clearGeoJson: () => void
  startGeoJsonDrawing: (mode: GeoJsonDrawingMode) => Promise<GeoJsonFeature>
  clearDrawings: () => void
  cancelDrawing: () => void
  startMeasurement: (type: 'distance' | 'area') => Promise<MeasurementResult>
  clearMeasurements: () => void
  startRectangle: () => Promise<any>
  clearRectangle: () => void
  exportPng: (options: MapExportOptions) => Promise<void>
}

const defaultStyle: GeoJsonStyle = {
  strokeColor: '#16856f',
  fillColor: '#46b99e',
  pointColor: '#d84a2f',
  strokeWidth: 3,
  fillOpacity: 0.22,
  pointRadius: 7,
}

const standardAttribution = '© OpenStreetMap contributors © CARTO'
const satelliteAttribution = 'Tiles © Esri'

function geometrySymbol(type: string, style: GeoJsonStyle, selected: boolean) {
  if (type.includes('Point')) {
    const diameter = (style.pointRadius + (selected ? 3 : 0)) * 2
    return {
      markerType: 'ellipse',
      markerWidth: diameter,
      markerHeight: diameter,
      markerFill: selected ? '#d84a2f' : style.pointColor,
      markerFillOpacity: 1,
      markerLineColor: '#ffffff',
      markerLineWidth: 2,
    }
  }
  if (type.includes('Line')) {
    return {
      lineColor: selected ? '#d84a2f' : style.strokeColor,
      lineWidth: style.strokeWidth + (selected ? 2 : 0),
      lineOpacity: 0.95,
    }
  }
  return {
    lineColor: selected ? '#d84a2f' : style.strokeColor,
    lineWidth: style.strokeWidth + (selected ? 2 : 0),
    polygonFill: style.fillColor,
    polygonOpacity: selected ? Math.min(0.55, style.fillOpacity + 0.16) : style.fillOpacity,
  }
}

function asPosition(value: any): [number, number] {
  return [Number(value.x ?? value.lng), Number(value.y ?? value.lat)]
}

function asFeature(value: any): GeoJsonFeature {
  const feature = value.toGeoJSON() as GeoJsonFeature
  return {
    type: 'Feature',
    properties: feature.properties ?? {},
    geometry: feature.geometry,
  }
}

function extentBounds(extent: any): ExportBounds {
  const minimum = asPosition(extent.getMin())
  const maximum = asPosition(extent.getMax())
  return {
    southWest: { lng: minimum[0], lat: minimum[1] },
    northEast: { lng: maximum[0], lat: maximum[1] },
  }
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, encoded = ''] = dataUrl.split(',')
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? 'image/png'
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mimeType })
}

export async function createMapRuntime(
  container: HTMLElement,
  credentials?: AMapCredentials | null,
): Promise<MapRuntime> {
  const standardLayer = new TileLayer('base-standard', {
    urlTemplate: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    crossOrigin: 'anonymous',
  } as any)
  const satelliteLayer = new TileLayer('base-satellite', {
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    crossOrigin: 'anonymous',
  } as any)
  const map: any = new MaptalksMap(container, {
    center: [120.1551, 30.2741],
    zoom: 11,
    pitch: 0,
    bearing: 0,
    devicePixelRatio: 1,
    baseLayer: standardLayer,
    zoomControl: { position: 'bottom-right' },
    scaleControl: { position: 'bottom-left', metric: true, imperial: false },
    attribution: { content: standardAttribution },
  } as any)

  const markerLayer = new VectorLayer('location-marker').addTo(map)
  const geoJsonLayer = new VectorLayer('workspace-geojson').addTo(map)
  const drawingLayer = new VectorLayer('workspace-drawings').addTo(map)
  const measurementLayer = new VectorLayer('workspace-measurements').addTo(map)
  const selectionLayer = new VectorLayer('export-selection').addTo(map)
  const geoJsonGeometries = new globalThis.Map<string | number, any>()
  const customLayers = new globalThis.Map<string, any>()
  let activeBaseLayer: any = standardLayer
  let rectangle: any
  let activeDrawTool: any
  let rejectActiveDrawing: ((reason: DOMException) => void) | undefined
  let amapServicesPromise: Promise<any> | undefined

  const requireAMapServices = () => {
    if (!credentials) {
      throw new Error('Configure optional AMap credentials from Settings to use this service.')
    }
    if (!amapServicesPromise) {
      ;(globalThis as typeof globalThis & { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = {
        securityJsCode: credentials.securityCode,
      }
      amapServicesPromise = AMapLoader.load({
        key: credentials.apiKey,
        version: '2.0',
        plugins: ['AMap.PlaceSearch'],
      })
    }
    return amapServicesPromise
  }

  const stopDrawing = (abort = false) => {
    const reject = rejectActiveDrawing
    rejectActiveDrawing = undefined
    activeDrawTool?.disable()
    activeDrawTool?.remove()
    activeDrawTool = undefined
    if (abort) reject?.(new DOMException('Drawing cancelled.', 'AbortError'))
  }

  const drawGeometry = (mode: string, symbol: Record<string, unknown>) => {
    stopDrawing(true)
    return new Promise<any>((resolve, reject) => {
      const tool = new DrawTool({ mode, once: true, symbol })
      activeDrawTool = tool
      rejectActiveDrawing = reject
      tool.on('drawend', (event: any) => {
        rejectActiveDrawing = undefined
        activeDrawTool = undefined
        tool.remove()
        resolve(event.geometry)
      })
      tool.addTo(map)
    })
  }

  const waitForRender = () => new Promise<void>((resolve) => {
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      map.off('renderend', finish)
      activeBaseLayer.off('layerload', finish)
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }
    const timeout = globalThis.setTimeout(finish, 4000)
    map.on('renderend', finish)
    activeBaseLayer.on('layerload', finish)
  })

  const moveMapForExport = async (center: LngLatValue, zoom: number) => {
    const rendered = waitForRender()
    map.setCenterAndZoom([center.lng, center.lat] as any, zoom)
    await rendered
  }

  const canvasAdapter = createBrowserCanvasAdapter()

  const clearCustomLayers = () => {
    customLayers.forEach((layer) => layer.remove())
    customLayers.clear()
  }

  const setCustomLayers = (definitions: CustomLayerDefinition[]) => {
    clearCustomLayers()
    definitions.forEach((definition, index) => {
      const options = {
        urlTemplate: definition.url,
        crossOrigin: 'anonymous',
        opacity: definition.opacity,
        visible: definition.visible,
        zIndex: 50 + index,
      }
      const layer = definition.type === 'wms'
        ? new WMSTileLayer(`custom-layer-${definition.id}`, {
            ...options,
            layers: definition.wmsLayers,
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: 'EPSG:3857',
          })
        : new TileLayer(`custom-layer-${definition.id}`, options)
      layer.addTo(map)
      customLayers.set(definition.id, layer)
    })
  }

  return {
    engine: 'maptalks',
    map,
    hasAMapServices: Boolean(credentials),
    destroy() {
      stopDrawing(true)
      clearCustomLayers()
      map.remove()
    },
    clearGraphics() {
      stopDrawing(true)
      markerLayer.clear()
      geoJsonLayer.clear()
      geoJsonGeometries.clear()
      drawingLayer.clear()
      measurementLayer.clear()
      selectionLayer.clear()
      rectangle = undefined
    },
    setCustomLayers,
    updateCustomLayer(id, options) {
      const layer = customLayers.get(id)
      if (!layer) return
      if (options.visible !== undefined) {
        if (options.visible) layer.show()
        else layer.hide()
      }
      if (options.opacity !== undefined) layer.setOpacity(options.opacity)
    },
    removeCustomLayer(id) {
      customLayers.get(id)?.remove()
      customLayers.delete(id)
    },
    clearCustomLayers,
    setSatellite(enabled) {
      activeBaseLayer = enabled ? satelliteLayer : standardLayer
      map.setBaseLayer(activeBaseLayer)
      const attribution = enabled ? satelliteAttribution : standardAttribution
      map.attributionControl?.setContent?.(attribution)
    },
    async searchPlaces(keyword) {
      const AMap = await requireAMapServices()
      const search = new AMap.PlaceSearch({ pageSize: 8, extensions: 'base' })
      return new Promise((resolve, reject) => {
        search.search(keyword, (status: string, result: any) => {
          if (status !== 'complete' || !result?.poiList?.pois) {
            reject(new Error('No place results were returned. Check your AMap service settings.'))
            return
          }
          resolve(result.poiList.pois.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            address: [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean).join(' '),
            position: convertCoordinate([poi.location.lng, poi.location.lat], 'gcj02', 'wgs84'),
          })))
        })
      })
    },
    mark(position, options) {
      markerLayer.clear()
      new Marker(position, {
        symbol: {
          markerType: 'ellipse', markerWidth: 16, markerHeight: 16,
          markerFill: '#d84a2f', markerLineColor: '#ffffff', markerLineWidth: 3,
        },
      }).addTo(markerLayer)
      if (options?.center !== false) map.setCenter(position as any)
    },
    renderGeoJson(data, options) {
      geoJsonLayer.clear()
      geoJsonGeometries.clear()
      const style = options?.style ?? defaultStyle
      data.features.forEach((feature, index) => {
        const id = feature.id ?? index
        const converted = GeoJSON.toGeometry(feature as any)
        const geometries = Array.isArray(converted) ? converted : [converted]
        geometries.filter(Boolean).forEach((geometry: any) => {
          geometry.setSymbol(geometrySymbol(feature.geometry.type, style, options?.selectedFeatureId === id))
          geometry.on('click', () => options?.onSelect?.(id))
          geometry.addTo(geoJsonLayer)
        })
        if (geometries[0]) geoJsonGeometries.set(id, geometries[0])
      })
      return data.features.length
    },
    focusFeature(id) {
      const geometry = geoJsonGeometries.get(id)
      const extent = geometry?.getExtent?.()
      if (extent) map.fitExtent(extent, -1)
    },
    clearGeoJson() {
      geoJsonLayer.clear()
      geoJsonGeometries.clear()
    },
    async startGeoJsonDrawing(mode) {
      const geometry = await drawGeometry(mode.toLowerCase(), geometrySymbol(mode, defaultStyle, false))
      drawingLayer.addGeometry(geometry)
      return asFeature(geometry)
    },
    clearDrawings() {
      stopDrawing(true)
      drawingLayer.clear()
    },
    cancelDrawing() {
      stopDrawing(true)
    },
    async startMeasurement(type) {
      const mode = type === 'distance' ? 'linestring' : 'polygon'
      const geometry = await drawGeometry(mode, {
        lineColor: '#d84a2f', lineWidth: 4, polygonFill: '#d84a2f', polygonOpacity: 0.15,
      })
      measurementLayer.addGeometry(geometry)
      const value = type === 'distance' ? Number(geometry.getLength()) : Number(geometry.getArea())
      return {
        type,
        value,
        label: type === 'distance'
          ? value >= 1000 ? `${(value / 1000).toFixed(2)} km` : `${value.toFixed(1)} m`
          : value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} km²` : `${value.toFixed(1)} m²`,
      }
    },
    clearMeasurements() {
      measurementLayer.clear()
    },
    async startRectangle() {
      selectionLayer.clear()
      rectangle = await drawGeometry('rectangle', {
        lineColor: '#d84a2f', lineWidth: 3, polygonFill: '#d84a2f', polygonOpacity: 0.12,
      })
      selectionLayer.addGeometry(rectangle)
      return rectangle
    },
    clearRectangle() {
      selectionLayer.clear()
      rectangle = undefined
    },
    async exportPng(options) {
      if (options.selectionOnly && !rectangle) throw new Error('Select a region before exporting it.')
      const bounds = extentBounds(options.selectionOnly ? rectangle.getExtent() : map.getExtent())
      const plan = createExportPlan(bounds, options.zoom, container.clientWidth, container.clientHeight)
      const originalCenter = map.getCenter()
      const originalZoom = map.getZoom()
      const tileStore = await createExportTileStore()

      options.onProgress?.({ phase: 'capturing', completed: 0, total: plan.tiles.length, width: plan.width, height: plan.height })
      rectangle?.hide?.()

      try {
        for (let index = 0; index < plan.tiles.length; index += 1) {
          const tile = plan.tiles[index]
          await moveMapForExport(tile.center, options.zoom)
          const dataUrl = map.toDataURL({ mimeType: 'image/png' })
          if (!dataUrl) throw new Error('maptalks could not capture the map canvas.')
          await tileStore.put(index, dataUrlToBlob(dataUrl))
          options.onProgress?.({
            phase: 'capturing', completed: index + 1, total: plan.tiles.length,
            width: plan.width, height: plan.height,
          })
        }

        options.onProgress?.({ phase: 'merging', completed: 0, total: plan.tiles.length, width: plan.width, height: plan.height })
        const output = await composeStoredTiles(plan, tileStore, canvasAdapter, (completed) => {
          options.onProgress?.({ phase: 'merging', completed, total: plan.tiles.length, width: plan.width, height: plan.height })
        })
        const attribution = activeBaseLayer === satelliteLayer ? satelliteAttribution : standardAttribution
        output.context.font = '12px sans-serif'
        const attributionWidth = Math.ceil(output.context.measureText(attribution).width) + 16
        output.context.fillStyle = 'rgba(255, 255, 255, 0.88)'
        output.context.fillRect(8, plan.height - 28, attributionWidth, 20)
        output.context.fillStyle = '#34443f'
        output.context.fillText(attribution, 16, plan.height - 14)

        const blob = await canvasAdapter.encode(output.canvas)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `maptalks-${options.zoom}z-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      } finally {
        try {
          await tileStore.dispose()
        } finally {
          rectangle?.show?.()
          map.setCenterAndZoom(originalCenter, originalZoom)
        }
      }
    },
  }
}
