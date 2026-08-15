import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  html2canvas: vi.fn(),
}))

vi.mock('@amap/amap-jsapi-loader', () => ({ default: { load: mocks.load } }))
vi.mock('html2canvas', () => ({ default: mocks.html2canvas }))

import { createMapRuntime } from './map-runtime'
import { sampleGeoJson } from './geojson'

let lastMap: FakeMap
let mouseTools: FakeMouseTool[]

class FakeMap {
  listeners = new Map<string, () => void>()
  center: any = { lng: 120.1551, lat: 30.2741 }
  zoom = 11
  add = vi.fn()
  remove = vi.fn()
  destroy = vi.fn()
  addControl = vi.fn()
  setCenter = vi.fn()
  setFitView = vi.fn()
  on = vi.fn((name: string, listener: () => void) => this.listeners.set(name, listener))
  off = vi.fn((name: string) => this.listeners.delete(name))
  getCenter = vi.fn(() => this.center)
  getZoom = vi.fn(() => this.zoom)
  getBounds = vi.fn(() => ({
    getSouthWest: () => ({ lng: 120.15, lat: 30.25 }),
    getNorthEast: () => ({ lng: 120.16, lat: 30.26 }),
  }))
  setZoomAndCenter = vi.fn((zoom: number, center: any) => {
    this.zoom = zoom
    this.center = center
    this.listeners.get('complete')?.()
  })

  constructor(public container: HTMLElement, public options: unknown) {
    lastMap = this
  }
}

class FakeMouseTool {
  listeners = new Map<string, (event: any) => void>()
  close = vi.fn()
  rectangle = vi.fn()
  marker = vi.fn()
  polyline = vi.fn()
  polygon = vi.fn()
  on = vi.fn((name: string, listener: (event: any) => void) => this.listeners.set(name, listener))
  off = vi.fn((name: string) => this.listeners.delete(name))

  constructor(_map: FakeMap) {
    mouseTools.push(this)
  }
}

class FakePlaceSearch {
  static response: [string, unknown] = ['complete', { poiList: { pois: [] } }]
  search = vi.fn((_keyword: string, callback: (status: string, result: unknown) => void) => {
    callback(...FakePlaceSearch.response)
  })
}

class FakeRectangle {
  hide = vi.fn()
  show = vi.fn()

  getBounds() {
    return {
      getSouthWest: () => ({ lng: 120.15, lat: 30.25 }),
      getNorthEast: () => ({ lng: 120.16, lat: 30.26 }),
    }
  }
}

const AMap = {
  Map: FakeMap,
  ToolBar: class {},
  Scale: class {},
  MouseTool: FakeMouseTool,
  PlaceSearch: FakePlaceSearch,
  Marker: class { constructor(public options: unknown) {} },
  Polyline: class { constructor(public options: unknown) {} },
  Polygon: class { constructor(public options: unknown) {} },
  GeoJSON: class { constructor(public options: unknown) {} },
  TileLayer: { Satellite: class {} },
}

beforeEach(() => {
  vi.clearAllMocks()
  mouseTools = []
  FakePlaceSearch.response = ['complete', { poiList: { pois: [] } }]
  mocks.load.mockResolvedValue(AMap)
  ;(globalThis as any).window = {}
  ;(globalThis as any).requestAnimationFrame = (callback: () => void) => callback()
  ;(globalThis as any).createImageBitmap = vi.fn(async () => ({ close: vi.fn() }))
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:export'), revokeObjectURL: vi.fn() })
  const context = {
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({ width: 80 })),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    font: '',
  }
  ;(globalThis as any).document = {
    createElement: vi.fn((tag: string) => tag === 'canvas' ? ({
      click: vi.fn(),
      toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob(['png'], { type: 'image/png' }))),
      getContext: vi.fn(() => context),
      width: 0,
      height: 0,
    }) : ({ click: vi.fn(), href: '', download: '' })),
  }
  mocks.html2canvas.mockResolvedValue({
    width: 256,
    height: 256,
    toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob(['tile'], { type: 'image/png' }))),
  })
})

describe('AMap runtime', () => {
  it('loads credentials, controls layers, markers, and GeoJSON', async () => {
    const runtime = await createMapRuntime({} as HTMLElement, { apiKey: 'visitor-key', securityCode: 'visitor-code' })
    expect(mocks.load).toHaveBeenCalledWith(expect.objectContaining({ key: 'visitor-key', version: '2.0' }))
    expect((globalThis as any).window._AMapSecurityConfig).toEqual({ securityJsCode: 'visitor-code' })

    runtime.setSatellite(true)
    runtime.setSatellite(true)
    runtime.setSatellite(false)
    runtime.mark([120, 30])
    runtime.mark([121, 31])
    expect(lastMap.setCenter).toHaveBeenLastCalledWith([121, 31])
    expect(lastMap.remove).toHaveBeenCalled()

    expect(runtime.renderGeoJson(sampleGeoJson)).toBe(2)
    runtime.clearGeoJson()
    runtime.destroy()
    expect(lastMap.setFitView).toHaveBeenCalled()
    expect(lastMap.destroy).toHaveBeenCalled()
  })

  it('normalizes place results and rejects failed searches', async () => {
    const runtime = await createMapRuntime({} as HTMLElement, { apiKey: 'key', securityCode: 'code' })
    FakePlaceSearch.response = [
      'complete',
      {
        poiList: {
          pois: [
            {
              id: 'poi-1',
              name: 'West Lake',
              pname: 'Zhejiang',
              cityname: 'Hangzhou',
              adname: 'Xihu',
              address: 'Hubin',
              location: { lng: 120.15, lat: 30.25 },
            },
          ],
        },
      },
    ]
    await expect(runtime.searchPlaces('lake')).resolves.toEqual([
      {
        id: 'poi-1',
        name: 'West Lake',
        address: 'Zhejiang Hangzhou Xihu Hubin',
        position: [120.15, 30.25],
      },
    ])
    FakePlaceSearch.response = ['error', {}]
    await expect(runtime.searchPlaces('missing')).rejects.toThrow('No place results')
  })

  it('draws, clears, and exports a selected region', async () => {
    const container = {
      clientWidth: 256,
      clientHeight: 256,
      classList: { add: vi.fn(), remove: vi.fn() },
      querySelector: vi.fn(() => ({ textContent: 'Demo attribution' })),
    } as unknown as HTMLElement
    const runtime = await createMapRuntime(container, { apiKey: 'key', securityCode: 'code' })
    const drawing = runtime.startRectangle()
    const rectangle = new FakeRectangle()
    mouseTools[0].listeners.get('draw')?.({ obj: rectangle })
    await expect(drawing).resolves.toBe(rectangle)

    const progress = vi.fn()
    await runtime.exportPng({ selectionOnly: true, zoom: 16, onProgress: progress })
    expect(mocks.html2canvas.mock.calls.length).toBeGreaterThan(1)
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'capturing', completed: 0 }))
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'merging' }))
    expect(rectangle.hide).toHaveBeenCalled()
    expect(rectangle.show).toHaveBeenCalled()
    expect(lastMap.setZoomAndCenter).toHaveBeenCalled()
    runtime.clearRectangle()
    await expect(runtime.exportPng({ selectionOnly: true, zoom: 16 })).rejects.toThrow('Select a region')
    await runtime.exportPng({ selectionOnly: false, zoom: 16 })
    expect(mouseTools[0].close).toHaveBeenCalled()
  })

  it('draws GeoJSON points, lines, and closed polygons', async () => {
    const runtime = await createMapRuntime({} as HTMLElement, { apiKey: 'key', securityCode: 'code' })
    const drawingTool = mouseTools[1]

    const pointDrawing = runtime.startGeoJsonDrawing('Point')
    drawingTool.listeners.get('draw')?.({ obj: { getPosition: () => ({ lng: 120, lat: 30 }) } })
    await expect(pointDrawing).resolves.toEqual({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [120, 30] },
    })

    const lineDrawing = runtime.startGeoJsonDrawing('LineString')
    drawingTool.listeners.get('draw')?.({
      obj: { getPath: () => [{ getLng: () => 120, getLat: () => 30 }, { lng: 121, lat: 31 }] },
    })
    await expect(lineDrawing).resolves.toMatchObject({
      geometry: { type: 'LineString', coordinates: [[120, 30], [121, 31]] },
    })

    const polygonDrawing = runtime.startGeoJsonDrawing('Polygon')
    drawingTool.listeners.get('draw')?.({
      obj: { getPath: () => [{ lng: 120, lat: 30 }, { lng: 121, lat: 30 }, { lng: 121, lat: 31 }] },
    })
    const polygon = await polygonDrawing
    expect(polygon.geometry.coordinates).toEqual([[[120, 30], [121, 30], [121, 31], [120, 30]]])

    const closedPolygonDrawing = runtime.startGeoJsonDrawing('Polygon')
    drawingTool.listeners.get('draw')?.({
      obj: { getPath: () => [{ lng: 120, lat: 30 }, { lng: 121, lat: 31 }, { lng: 120, lat: 30 }] },
    })
    await expect(closedPolygonDrawing).resolves.toMatchObject({
      geometry: { coordinates: [[[120, 30], [121, 31], [120, 30]]] },
    })

    runtime.clearDrawings()
    expect(drawingTool.marker).toHaveBeenCalled()
    expect(drawingTool.polyline).toHaveBeenCalled()
    expect(drawingTool.polygon).toHaveBeenCalled()
    expect(lastMap.remove).toHaveBeenCalledWith(expect.any(Array))
  })
})
