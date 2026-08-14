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
let lastMouseTool: FakeMouseTool

class FakeMap {
  add = vi.fn()
  remove = vi.fn()
  destroy = vi.fn()
  addControl = vi.fn()
  setCenter = vi.fn()
  setFitView = vi.fn()
  lngLatToContainer = vi.fn((value: any) => value)

  constructor(public container: HTMLElement, public options: unknown) {
    lastMap = this
  }
}

class FakeMouseTool {
  listeners = new Map<string, (event: any) => void>()
  close = vi.fn()
  rectangle = vi.fn()
  on = vi.fn((name: string, listener: (event: any) => void) => this.listeners.set(name, listener))
  off = vi.fn((name: string) => this.listeners.delete(name))

  constructor(_map: FakeMap) {
    lastMouseTool = this
  }
}

class FakePlaceSearch {
  static response: [string, unknown] = ['complete', { poiList: { pois: [] } }]
  search = vi.fn((_keyword: string, callback: (status: string, result: unknown) => void) => {
    callback(...FakePlaceSearch.response)
  })
}

class FakeRectangle {
  getBounds() {
    return {
      getSouthWest: () => ({ x: 10, y: 90 }),
      getNorthEast: () => ({ x: 90, y: 10 }),
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
  FakePlaceSearch.response = ['complete', { poiList: { pois: [] } }]
  mocks.load.mockResolvedValue(AMap)
  ;(globalThis as any).window = {}
  ;(globalThis as any).document = {
    createElement: vi.fn(() => ({
      click: vi.fn(),
      toDataURL: vi.fn(() => 'data:image/png;base64,demo'),
      getContext: vi.fn(() => ({ drawImage: vi.fn() })),
      width: 0,
      height: 0,
    })),
  }
  mocks.html2canvas.mockResolvedValue({
    width: 100,
    height: 100,
    toDataURL: vi.fn(() => 'data:image/png;base64,demo'),
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
    const runtime = await createMapRuntime({} as HTMLElement, { apiKey: 'key', securityCode: 'code' })
    const drawing = runtime.startRectangle()
    const rectangle = new FakeRectangle()
    lastMouseTool.listeners.get('draw')?.({ obj: rectangle })
    await expect(drawing).resolves.toBe(rectangle)

    await runtime.exportPng(true)
    runtime.clearRectangle()
    await runtime.exportPng(false)
    expect(mocks.html2canvas).toHaveBeenCalledTimes(2)
    expect(lastMouseTool.close).toHaveBeenCalled()
  })
})
