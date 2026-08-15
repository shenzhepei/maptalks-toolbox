import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  amapLoad: vi.fn(),
  maps: [] as any[],
  layers: [] as any[],
  tools: [] as any[],
}))

vi.mock('@amap/amap-jsapi-loader', () => ({ default: { load: mocks.amapLoad } }))
vi.mock('maptalks/dist/maptalks.es.js', () => {
  class Evented {
    listeners = new Map<string, Set<(event: any) => void>>()

    on(name: string, listener: (event: any) => void) {
      const values = this.listeners.get(name) ?? new Set()
      values.add(listener)
      this.listeners.set(name, values)
      return this
    }

    off(name: string, listener?: (event: any) => void) {
      if (listener) this.listeners.get(name)?.delete(listener)
      else this.listeners.delete(name)
      return this
    }

    emit(name: string, event: any = {}) {
      this.listeners.get(name)?.forEach((listener) => listener(event))
    }
  }

  class FakeGeometry extends Evented {
    symbol: any
    hidden = false

    constructor(public feature: any, public length = 1250, public area = 2_500_000) {
      super()
    }

    setSymbol(symbol: any) { this.symbol = symbol; return this }
    addTo(layer: any) { layer.addGeometry(this); return this }
    toGeoJSON() { return this.feature }
    getLength() { return this.length }
    getArea() { return this.area }
    getExtent() { return extent() }
    hide() { this.hidden = true }
    show() { this.hidden = false }
  }

  class FakeMarker extends FakeGeometry {
    constructor(position: [number, number], public options: any) {
      super({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: position } })
    }
  }

  class FakeLayer extends Evented {
    geometries: any[] = []
    map: any
    visible = true
    opacity = 1
    zIndex = 0
    removed = false

    constructor(public id: string, public options: any = {}) {
      super()
      mocks.layers.push(this)
    }

    addTo(map: any) { this.map = map; return this }
    addGeometry(geometry: any) { this.geometries.push(geometry); return this }
    clear() { this.geometries = []; return this }
    show() { this.visible = true; return this }
    hide() { this.visible = false; return this }
    setOpacity(value: number) { this.opacity = value; return this }
    setZIndex(value: number) { this.zIndex = value; return this }
    remove() { this.removed = true; return this }
  }

  class FakeMap extends Evented {
    center: any
    zoom: number
    baseLayer: any
    attributionControl = { setContent: vi.fn() }
    removed = false
    fitExtent = vi.fn()

    constructor(public container: HTMLElement, public options: any) {
      super()
      this.center = options.center
      this.zoom = options.zoom
      this.baseLayer = options.baseLayer
      mocks.maps.push(this)
    }

    setBaseLayer(layer: any) { this.baseLayer = layer; return this }
    setCenter(center: any) { this.center = center; return this }
    getCenter() { return this.center }
    getZoom() { return this.zoom }
    getExtent() { return extent() }
    setCenterAndZoom(center: any, zoom: number) {
      this.center = center
      this.zoom = zoom
      this.emit('renderend')
      this.baseLayer.emit('layerload')
      return this
    }
    toDataURL() { return 'data:image/png;base64,cG5n' }
    remove() { this.removed = true }
  }

  class FakeDrawTool extends Evented {
    disabled = false
    removed = false
    constructor(public options: any) { super(); mocks.tools.push(this) }
    addTo() { return this }
    disable() { this.disabled = true; return this }
    remove() { this.removed = true; return this }
  }

  function extent() {
    return {
      getMin: () => ({ x: 120.15, y: 30.25 }),
      getMax: () => ({ x: 120.16, y: 30.26 }),
    }
  }

  return {
    DrawTool: FakeDrawTool,
    GeoJSON: { toGeometry: (feature: any) => new FakeGeometry(feature) },
    Map: FakeMap,
    Marker: FakeMarker,
    TileLayer: FakeLayer,
    VectorLayer: FakeLayer,
    WMSTileLayer: FakeLayer,
  }
})

import { createMapRuntime } from './map-runtime'
import { sampleGeoJson } from './geojson'

class FakePlaceSearch {
  static response: [string, any] = ['complete', { poiList: { pois: [] } }]
  search(_keyword: string, callback: (status: string, result: any) => void) { callback(...FakePlaceSearch.response) }
}

const AMapServices = {
  PlaceSearch: FakePlaceSearch,
}

function layer(id: string) {
  return mocks.layers.find((item) => item.id === id)
}

function geometry(type: string, coordinates: any, length = 1250, area = 2_500_000) {
  const prototype = layer('workspace-geojson')?.geometries[0]?.constructor
  if (!prototype) {
    const feature = { type: 'Feature', properties: {}, geometry: { type, coordinates } }
    return (mocks as any).geometry?.(feature)
  }
  return new prototype({ type: 'Feature', properties: {}, geometry: { type, coordinates } }, length, area)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.maps.length = 0
  mocks.layers.length = 0
  mocks.tools.length = 0
  mocks.amapLoad.mockResolvedValue(AMapServices)
  FakePlaceSearch.response = ['complete', { poiList: { pois: [] } }]
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close: vi.fn() })))
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:export'), revokeObjectURL: vi.fn() })
  const context = {
    drawImage: vi.fn(), measureText: vi.fn(() => ({ width: 80 })), fillRect: vi.fn(), fillText: vi.fn(),
    fillStyle: '', font: '',
  }
  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => tag === 'canvas' ? ({
      click: vi.fn(),
      toBlob: vi.fn((callback: (blob: Blob) => void) => callback(new Blob(['png'], { type: 'image/png' }))),
      getContext: vi.fn(() => context), width: 0, height: 0,
    }) : ({ click: vi.fn(), href: '', download: '' })),
  })
})

describe('maptalks runtime', () => {
  it('starts without credentials and controls map layers and markers', async () => {
    const runtime = await createMapRuntime({} as HTMLElement)
    expect(runtime.engine).toBe('maptalks')
    expect(runtime.hasAMapServices).toBe(false)
    expect(mocks.maps[0].options.devicePixelRatio).toBe(1)
    runtime.setSatellite(true)
    expect(mocks.maps[0].baseLayer.id).toBe('base-satellite')
    runtime.setSatellite(false)
    runtime.mark([121, 31])
    expect(mocks.maps[0].center).toEqual([121, 31])
    expect(layer('location-marker').geometries).toHaveLength(1)
    runtime.mark([122, 32], { center: false })
    expect(mocks.maps[0].center).toEqual([121, 31])
    expect(layer('location-marker').geometries[0].feature.geometry.coordinates).toEqual([122, 32])
    runtime.renderGeoJson(sampleGeoJson)
    runtime.clearGraphics()
    expect(layer('location-marker').geometries).toHaveLength(0)
    expect(layer('workspace-geojson').geometries).toHaveLength(0)
    runtime.setCustomLayers([
      { id: 'xyz', name: 'XYZ', type: 'xyz', url: 'https://example.com/{z}/{x}/{y}.png', visible: true, opacity: 0.8 },
      { id: 'wms', name: 'WMS', type: 'wms', url: 'https://example.com/wms', wmsLayers: 'demo:roads', visible: false, opacity: 0.5 },
    ])
    expect(layer('custom-layer-xyz').options).toMatchObject({ opacity: 0.8, zIndex: 50 })
    expect(layer('custom-layer-wms').options).toMatchObject({ layers: 'demo:roads', transparent: true, zIndex: 51 })
    runtime.updateCustomLayer('xyz', { visible: false, opacity: 0.4 })
    expect(layer('custom-layer-xyz')).toMatchObject({ visible: false, opacity: 0.4 })
    runtime.removeCustomLayer('xyz')
    expect(layer('custom-layer-xyz').removed).toBe(true)
    runtime.clearCustomLayers()
    expect(layer('custom-layer-wms').removed).toBe(true)
    await expect(runtime.searchPlaces('lake')).rejects.toThrow('optional AMap credentials')
    runtime.destroy()
    expect(mocks.maps[0].removed).toBe(true)
  })

  it('renders, selects, focuses, and clears GeoJSON geometries', async () => {
    const runtime = await createMapRuntime({} as HTMLElement)
    const selected = vi.fn()
    expect(runtime.renderGeoJson(sampleGeoJson, {
      style: { strokeColor: '#111111', fillColor: '#222222', pointColor: '#333333', strokeWidth: 4, fillOpacity: 0.3, pointRadius: 6 },
      selectedFeatureId: 0,
      onSelect: selected,
    })).toBe(2)
    const geometries = layer('workspace-geojson').geometries
    geometries[0].emit('click')
    expect(selected).toHaveBeenCalledWith(0)
    expect(geometries[0].symbol.lineColor).toBe('#d84a2f')
    expect(geometries[1].symbol.markerFill).toBe('#333333')
    runtime.focusFeature(0)
    runtime.focusFeature('missing')
    expect(mocks.maps[0].fitExtent).toHaveBeenCalled()
    runtime.clearGeoJson()
    expect(layer('workspace-geojson').geometries).toHaveLength(0)
  })

  it('styles selected points and polygons independently', async () => {
    const runtime = await createMapRuntime({} as HTMLElement)
    const style = {
      strokeColor: '#111111', fillColor: '#222222', pointColor: '#333333',
      strokeWidth: 4, fillOpacity: 0.3, pointRadius: 6,
    }
    runtime.renderGeoJson({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'point', properties: {}, geometry: { type: 'Point', coordinates: [120, 30] } },
        { type: 'Feature', id: 'polygon', properties: {}, geometry: { type: 'Polygon', coordinates: [[[120, 30], [121, 30], [120, 30]]] } },
      ],
    }, { style, selectedFeatureId: 'point' })
    expect(layer('workspace-geojson').geometries[0].symbol).toMatchObject({
      markerWidth: 18,
      markerFill: '#d84a2f',
    })
    expect(layer('workspace-geojson').geometries[1].symbol).toMatchObject({
      lineColor: '#111111',
      lineWidth: 4,
      polygonOpacity: 0.3,
    })

    runtime.renderGeoJson({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature', id: 'polygon', properties: {},
        geometry: { type: 'Polygon', coordinates: [[[120, 30], [121, 30], [120, 30]]] },
      }],
    }, { style, selectedFeatureId: 'polygon' })
    const selectedPolygonSymbol = layer('workspace-geojson').geometries[0].symbol
    expect(selectedPolygonSymbol).toMatchObject({
      lineColor: '#d84a2f',
      lineWidth: 6,
    })
    expect(selectedPolygonSymbol.polygonOpacity).toBeCloseTo(0.46)
  })

  it('draws GeoJSON and cancels an unfinished drawing', async () => {
    const runtime = await createMapRuntime({} as HTMLElement)
    runtime.renderGeoJson(sampleGeoJson)
    const Geometry = layer('workspace-geojson').geometries[0].constructor
    const pointPromise = runtime.startGeoJsonDrawing('Point')
    mocks.tools.at(-1).emit('drawend', { geometry: new Geometry({
      type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [120, 30] },
    }) })
    await expect(pointPromise).resolves.toMatchObject({ geometry: { type: 'Point', coordinates: [120, 30] } })
    expect(layer('workspace-drawings').geometries).toHaveLength(1)

    const pending = runtime.startGeoJsonDrawing('Polygon')
    runtime.cancelDrawing()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    runtime.clearDrawings()
  })

  it('keeps AMap place search optional and converts GCJ-02 results to WGS84', async () => {
    const runtime = await createMapRuntime({} as HTMLElement, { apiKey: 'visitor-key', securityCode: 'visitor-code' })
    FakePlaceSearch.response = ['complete', { poiList: { pois: [{
      id: 'poi-1', name: 'West Lake', pname: 'Zhejiang', cityname: 'Hangzhou', adname: 'Xihu',
      address: 'Hubin', location: { lng: 120.15, lat: 30.25 },
    }] } }]
    const places = await runtime.searchPlaces('lake')
    expect(places[0].position[0]).toBeLessThan(120.15)
    expect(mocks.amapLoad).toHaveBeenCalledWith(expect.objectContaining({ key: 'visitor-key' }))

    FakePlaceSearch.response = ['error', {}]
    await expect(runtime.searchPlaces('missing')).rejects.toThrow('No place results')
  })

  it('measures, selects a region, and exports direct map Canvas tiles', async () => {
    const container = { clientWidth: 256, clientHeight: 256 } as HTMLElement
    const runtime = await createMapRuntime(container)
    runtime.renderGeoJson(sampleGeoJson)
    const Geometry = layer('workspace-geojson').geometries[0].constructor

    const distance = runtime.startMeasurement('distance')
    mocks.tools.at(-1).emit('drawend', { geometry: new Geometry({
      type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] },
    }, 1250, 0) })
    await expect(distance).resolves.toMatchObject({ type: 'distance', label: '1.25 km' })

    const area = runtime.startMeasurement('area')
    mocks.tools.at(-1).emit('drawend', { geometry: new Geometry({
      type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] },
    }, 0, 500) })
    await expect(area).resolves.toMatchObject({ type: 'area', label: '500.0 m²' })
    runtime.clearMeasurements()

    const selection = runtime.startRectangle()
    const rectangle = new Geometry({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [] } })
    mocks.tools.at(-1).emit('drawend', { geometry: rectangle })
    await selection

    const progress = vi.fn()
    await runtime.exportPng({ selectionOnly: true, zoom: 16, onProgress: progress })
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'capturing', completed: 0 }))
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'merging' }))
    expect(rectangle.hidden).toBe(false)
    runtime.clearRectangle()
    await expect(runtime.exportPng({ selectionOnly: true, zoom: 16 })).rejects.toThrow('Select a region')
  })

  it('formats alternate measurement units and exports the current satellite view', async () => {
    const container = { clientWidth: 256, clientHeight: 256 } as HTMLElement
    const runtime = await createMapRuntime(container)
    runtime.renderGeoJson(sampleGeoJson)
    const Geometry = layer('workspace-geojson').geometries[0].constructor

    const distance = runtime.startMeasurement('distance')
    mocks.tools.at(-1).emit('drawend', { geometry: new Geometry({
      type: 'Feature', geometry: { type: 'LineString', coordinates: [] },
    }, 250, 0) })
    await expect(distance).resolves.toMatchObject({ label: '250.0 m' })

    const area = runtime.startMeasurement('area')
    mocks.tools.at(-1).emit('drawend', { geometry: new Geometry({
      type: 'Feature', geometry: { type: 'Polygon', coordinates: [] },
    }, 0, 2_500_000) })
    await expect(area).resolves.toMatchObject({ label: '2.50 km²' })

    runtime.setSatellite(true)
    await runtime.exportPng({ selectionOnly: false, zoom: 11 })
    const canvasContext = (document.createElement as any).mock.results
      .map((result: any) => result.value)
      .find((element: any) => element.getContext)
      .getContext()
    expect(canvasContext.fillText).toHaveBeenCalledWith('Tiles © Esri', 16, expect.any(Number))
  })

  it('restores the current view when Canvas capture fails', async () => {
    const container = { clientWidth: 256, clientHeight: 256 } as HTMLElement
    const runtime = await createMapRuntime(container)
    const originalCenter = mocks.maps[0].getCenter()
    mocks.maps[0].toDataURL = vi.fn(() => '')

    await expect(runtime.exportPng({ selectionOnly: false, zoom: 12 }))
      .rejects.toThrow('could not capture the map canvas')
    expect(mocks.maps[0].center).toEqual(originalCenter)
    expect(mocks.maps[0].zoom).toBe(11)
  })
})
