import AMapLoader from '@amap/amap-jsapi-loader'
import html2canvas from 'html2canvas'
import type { AMapCredentials } from './credentials'
import type { GeoJsonFeatureCollection } from './geojson'

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

export interface MapRuntime {
  AMap: any
  map: any
  destroy: () => void
  setSatellite: (enabled: boolean) => void
  searchPlaces: (keyword: string) => Promise<PlaceResult[]>
  mark: (position: [number, number]) => void
  renderGeoJson: (data: GeoJsonFeatureCollection) => number
  clearGeoJson: () => void
  startRectangle: () => Promise<any>
  clearRectangle: () => void
  exportPng: (selectionOnly: boolean) => Promise<void>
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
    async exportPng(selectionOnly) {
      const canvas = await html2canvas(container, { useCORS: true, logging: false, backgroundColor: '#eef1ef' })
      let output = canvas
      if (selectionOnly && rectangle) {
        const bounds = rectangle.getBounds()
        const southWest = map.lngLatToContainer(bounds.getSouthWest())
        const northEast = map.lngLatToContainer(bounds.getNorthEast())
        const x = Math.max(0, Math.min(southWest.x, northEast.x))
        const y = Math.max(0, Math.min(southWest.y, northEast.y))
        const width = Math.min(canvas.width - x, Math.abs(northEast.x - southWest.x))
        const height = Math.min(canvas.height - y, Math.abs(southWest.y - northEast.y))
        if (width > 1 && height > 1) {
          output = document.createElement('canvas')
          output.width = width
          output.height = height
          output.getContext('2d')?.drawImage(canvas, x, y, width, height, 0, 0, width, height)
        }
      }
      const link = document.createElement('a')
      link.download = `amap-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      link.href = output.toDataURL('image/png')
      link.click()
    },
  }
}
