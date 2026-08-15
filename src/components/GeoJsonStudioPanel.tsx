import {
  Braces,
  Check,
  Circle,
  Clipboard,
  Download,
  FileJson,
  List,
  Minus,
  Palette,
  Pentagon,
  Redo2,
  RotateCcw,
  Ruler,
  ScanLine,
  Trash2,
  Undo2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { MapWorkspaceController } from '../hooks/useMapWorkspace'
import { parseCoordinate, type CoordinateSystem } from '../lib/coordinates'
import { convertGeoJson, parseGeoJson, type GeoJsonFeature } from '../lib/geojson'
import type { GeoJsonDrawingMode, MapRuntime, MeasurementResult } from '../lib/map-runtime'
import { pointInPolygonFeature } from '../lib/spatial'

interface GeoJsonStudioPanelProps {
  runtime: MapRuntime
  workspace: MapWorkspaceController
  onRequestMap: () => void
}

type StudioTab = 'features' | 'data' | 'style' | 'analysis'
type DataView = 'input' | 'output'

const tabs: Array<{ id: StudioTab; label: string; icon: LucideIcon }> = [
  { id: 'data', label: 'JSON', icon: Braces },
  { id: 'features', label: 'Table', icon: List },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'analysis', label: 'Analysis', icon: Ruler },
]
const coordinateSystems: Array<{ value: CoordinateSystem; label: string }> = [
  { value: 'gcj02', label: 'GCJ-02 (AMap)' },
  { value: 'wgs84', label: 'WGS84' },
  { value: 'cgcs2000', label: 'CGCS2000' },
  { value: 'bd09', label: 'BD-09 (Baidu)' },
]
const drawingModes: Array<{ type: GeoJsonDrawingMode; label: string; icon: LucideIcon }> = [
  { type: 'Point', label: 'Point', icon: Circle },
  { type: 'LineString', label: 'Line', icon: Minus },
  { type: 'Polygon', label: 'Polygon', icon: Pentagon },
]

export default function GeoJsonStudioPanel({ runtime, workspace, onRequestMap }: GeoJsonStudioPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<StudioTab>('data')
  const [dataView, setDataView] = useState<DataView>('input')
  const [drawing, setDrawing] = useState<GeoJsonDrawingMode | null>(null)
  const drawingRef = useRef<GeoJsonDrawingMode | null>(null)
  const [keepDrawing, setKeepDrawing] = useState(false)
  const keepDrawingRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const [dataDraft, setDataDraft] = useState('')
  const [dataDirty, setDataDirty] = useState(false)
  const [error, setError] = useState('')
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([])
  const [measuring, setMeasuring] = useState('')
  const [pointInput, setPointInput] = useState('')
  const [containment, setContainment] = useState('')

  const { snapshot } = workspace
  const { collection } = snapshot
  const selectedFeature = useMemo(
    () => collection.features.find((feature) => feature.id === workspace.selectedFeatureId),
    [collection.features, workspace.selectedFeatureId],
  )
  const output = useMemo(
    () => JSON.stringify(convertGeoJson(collection, 'wgs84', snapshot.targetCrs), null, 2),
    [collection, snapshot.targetCrs],
  )

  useEffect(() => {
    if (!dataDirty) setDataDraft(JSON.stringify(collection, null, 2))
  }, [collection, dataDirty])

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && drawingRef.current) {
        drawingRef.current = null
        setDrawing(null)
        runtime.cancelDrawing()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => {
      window.removeEventListener('keydown', onKeydown)
      runtime.cancelDrawing()
    }
  }, [runtime])

  const cancelDrawing = (): void => {
    drawingRef.current = null
    setDrawing(null)
    runtime.cancelDrawing()
  }

  const draw = async (mode: GeoJsonDrawingMode): Promise<void> => {
    if (drawingRef.current) cancelDrawing()
    drawingRef.current = mode
    setDrawing(mode)
    setError('')
    onRequestMap()
    try {
      do {
        const feature = await runtime.startGeoJsonDrawing(mode)
        const next = workspace.append([feature])
        workspace.setSelectedFeatureId(next.collection.features.at(-1)?.id ?? null)
      } while (keepDrawingRef.current && drawingRef.current === mode)
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Drawing failed.')
      }
    } finally {
      if (drawingRef.current === mode) {
        drawingRef.current = null
        setDrawing(null)
      }
    }
  }

  const selectFeature = (feature: GeoJsonFeature): void => {
    if (feature.id === undefined) return
    workspace.setSelectedFeatureId(feature.id)
    runtime.focusFeature(feature.id)
  }

  const featureName = (feature: GeoJsonFeature, index: number): string => {
    const name = feature.properties?.name
    return typeof name === 'string' && name.trim() ? name : `${feature.geometry.type} ${index + 1}`
  }

  const renameSelected = (event: ChangeEvent<HTMLInputElement>): void => {
    if (selectedFeature?.id === undefined) return
    workspace.updateFeature(selectedFeature.id, {
      ...selectedFeature,
      properties: { ...selectedFeature.properties, name: event.target.value },
    })
  }

  const applyData = (): void => {
    try {
      const parsed = parseGeoJson(dataDraft)
      workspace.replaceCollection(convertGeoJson(parsed, snapshot.sourceCrs, 'wgs84'))
      setDataDirty(false)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid GeoJSON.')
    }
  }

  const formatData = (): void => {
    try {
      setDataDraft(JSON.stringify(parseGeoJson(dataDraft), null, 2))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid GeoJSON.')
    }
  }

  const loadFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    const value = await file.text()
    setDataDraft(value)
    setDataDirty(true)
    setActiveTab('data')
    setDataView('input')
    try {
      const parsed = parseGeoJson(value)
      workspace.replaceCollection(convertGeoJson(parsed, snapshot.sourceCrs, 'wgs84'))
      setDataDirty(false)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid GeoJSON.')
    }
    event.target.value = ''
  }

  const downloadOutput = (): void => {
    const blob = new Blob([output], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `maptalks-workspace-${snapshot.targetCrs}.geojson`
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyOutput = async (): Promise<void> => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const setStyle = (key: keyof typeof snapshot.style, event: ChangeEvent<HTMLInputElement>): void => {
    workspace.setStyle({ [key]: event.target.type === 'color' ? event.target.value : Number(event.target.value) })
  }

  const measure = async (type: 'distance' | 'area'): Promise<void> => {
    setMeasuring(type)
    setError('')
    onRequestMap()
    try {
      const result = await runtime.startMeasurement(type)
      setMeasurements((current) => [result, ...current])
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Measurement failed.')
      }
    } finally {
      setMeasuring('')
    }
  }

  const clearMeasurements = (): void => {
    runtime.clearMeasurements()
    setMeasurements([])
  }

  const testContainment = (): void => {
    const coordinate = parseCoordinate(pointInput)
    if (!coordinate) {
      setError('Use longitude, latitude within valid ranges.')
      return
    }
    const polygon = selectedFeature?.geometry.type.includes('Polygon')
      ? selectedFeature
      : collection.features.find((feature) => feature.geometry.type.includes('Polygon'))
    if (!polygon) {
      setError('Add or select a polygon first.')
      return
    }
    setContainment(pointInPolygonFeature(coordinate, polygon) ? 'Inside polygon' : 'Outside polygon')
    runtime.mark(coordinate)
    setError('')
  }

  return (
    <div className="studio-shell">
      <div className="studio-commandbar">
        <div className="draw-tools" aria-label="Drawing tools">
          {drawingModes.map((mode) => {
            const Icon = mode.icon
            return <button key={mode.type} className={`icon-button ${drawing === mode.type ? 'active' : ''}`} type="button" title={`Draw ${mode.label}`} onClick={() => void draw(mode.type)}><Icon size={17} /></button>
          })}
          {drawing && <button className="icon-button danger-icon" type="button" title="Cancel drawing" onClick={cancelDrawing}><X size={17} /></button>}
        </div>
        <span className="command-divider" />
        <button className="icon-button" type="button" title="Undo" disabled={!workspace.canUndo} onClick={workspace.undo}><Undo2 size={17} /></button>
        <button className="icon-button" type="button" title="Redo" disabled={!workspace.canRedo} onClick={workspace.redo}><Redo2 size={17} /></button>
        <span className="command-spacer" />
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.geojson,application/geo+json" onChange={(event) => void loadFile(event)} />
        <button className="icon-button" type="button" title="Import GeoJSON" onClick={() => fileInput.current?.click()}><Upload size={17} /></button>
        <button className="icon-button" type="button" title="Download GeoJSON" disabled={!collection.features.length} onClick={downloadOutput}><Download size={17} /></button>
        <button className="icon-button" type="button" title="Clear workspace" disabled={!collection.features.length} onClick={workspace.clear}><Trash2 size={17} /></button>
      </div>

      {drawing && <div className="active-mode-bar"><span>Drawing {drawing}</span><label><input checked={keepDrawing} type="checkbox" onChange={(event) => { setKeepDrawing(event.target.checked); keepDrawingRef.current = event.target.checked }} /> Repeat</label><kbd>Esc</kbd></div>}

      <nav className="studio-tabs" aria-label="GeoJSON workspace views">
        {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}><Icon size={15} /><span>{tab.label}</span></button> })}
      </nav>

      <div className="studio-content">
        {activeTab === 'features' && <section className="workspace-pane">
          <div className="pane-title"><span>{collection.features.length} features</span><span>{snapshot.sourceCrs.toUpperCase()}</span></div>
          {collection.features.length ? <div className="feature-list">{collection.features.map((feature, index) => <div key={feature.id} className={workspace.selectedFeatureId === feature.id ? 'selected' : ''}>
            <button className="feature-select" type="button" onClick={() => selectFeature(feature)}><span className="geometry-icon">{feature.geometry.type.includes('Point') ? <Circle size={14} /> : feature.geometry.type.includes('Line') ? <Minus size={14} /> : <Pentagon size={14} />}</span><span><strong>{featureName(feature, index)}</strong><small>{feature.geometry.type}</small></span></button>
            {feature.id !== undefined && <button className="icon-button" type="button" title="Delete feature" onClick={() => workspace.removeFeature(feature.id!)}><Trash2 size={14} /></button>}
          </div>)}</div> : <div className="workspace-empty"><FileJson size={24} /><span>No features</span></div>}
          {selectedFeature && <div className="feature-inspector"><label className="field-label" htmlFor="feature-name">Name</label><input id="feature-name" value={String(selectedFeature.properties?.name ?? '')} placeholder="Feature name" onChange={renameSelected} /><div className="inspector-meta"><span>ID</span><code>{selectedFeature.id}</code></div><div className="inspector-meta"><span>Type</span><code>{selectedFeature.geometry.type}</code></div></div>}
        </section>}

        {activeTab === 'data' && <section className="workspace-pane data-pane">
          <div className="segmented-control data-view-switch" aria-label="GeoJSON data view"><button type="button" className={dataView === 'input' ? 'active' : ''} onClick={() => setDataView('input')}>Input</button><button type="button" className={dataView === 'output' ? 'active' : ''} onClick={() => setDataView('output')}>Converted</button></div>
          {dataView === 'input' ? <>
            <div className="data-crs-row"><label className="field-label" htmlFor="source-crs">Input coordinate system</label><select id="source-crs" value={snapshot.sourceCrs} onChange={(event) => workspace.setCoordinateSystems(event.target.value as CoordinateSystem, snapshot.targetCrs)}>{coordinateSystems.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <textarea value={dataDraft} className="data-code-editor" spellCheck={false} aria-label="Editable GeoJSON" onChange={(event) => { setDataDraft(event.target.value); setDataDirty(true) }} />
            <div className="data-actions"><button className="button secondary" type="button" onClick={formatData}><Braces size={15} /> Format</button><button className="button primary" type="button" disabled={!dataDirty} onClick={applyData}><Check size={15} /> Apply</button></div>
          </> : <>
            <div className="data-crs-row"><label className="field-label" htmlFor="output-crs">Output coordinate system</label><select id="output-crs" value={snapshot.targetCrs} onChange={(event) => workspace.setCoordinateSystems(snapshot.sourceCrs, event.target.value as CoordinateSystem)}>{coordinateSystems.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <pre className="converted-preview data-code-editor" aria-label="Converted GeoJSON output">{output}</pre>
            <div className="data-actions"><button className="button secondary" type="button" onClick={() => void copyOutput()}>{copied ? <Check size={15} /> : <Clipboard size={15} />} Copy output</button><button className="button secondary" type="button" onClick={downloadOutput}><Download size={15} /> Download</button></div>
          </>}
        </section>}

        {activeTab === 'style' && <section className="workspace-pane style-pane">
          <label><span>Stroke</span><input type="color" value={snapshot.style.strokeColor} onChange={(event) => setStyle('strokeColor', event)} /></label>
          <label><span>Fill</span><input type="color" value={snapshot.style.fillColor} onChange={(event) => setStyle('fillColor', event)} /></label>
          <label><span>Points</span><input type="color" value={snapshot.style.pointColor} onChange={(event) => setStyle('pointColor', event)} /></label>
          <label><span>Stroke width</span><input type="range" min="1" max="10" step="1" value={snapshot.style.strokeWidth} onChange={(event) => setStyle('strokeWidth', event)} /><output>{snapshot.style.strokeWidth} px</output></label>
          <label><span>Fill opacity</span><input type="range" min="0" max="0.8" step="0.05" value={snapshot.style.fillOpacity} onChange={(event) => setStyle('fillOpacity', event)} /><output>{snapshot.style.fillOpacity}</output></label>
          <label><span>Point radius</span><input type="range" min="3" max="18" step="1" value={snapshot.style.pointRadius} onChange={(event) => setStyle('pointRadius', event)} /><output>{snapshot.style.pointRadius} px</output></label>
          <button className="button secondary" type="button" onClick={() => workspace.setStyle({ strokeColor: '#16856f', fillColor: '#46b99e', pointColor: '#d84a2f', strokeWidth: 3, fillOpacity: 0.22, pointRadius: 7 })}><RotateCcw size={15} /> Reset style</button>
        </section>}

        {activeTab === 'analysis' && <section className="workspace-pane analysis-pane">
          <div className="analysis-block"><h2>Measure on map</h2><div className="button-grid"><button className="button secondary" type="button" disabled={Boolean(measuring)} onClick={() => void measure('distance')}><Ruler size={15} /> Distance</button><button className="button secondary" type="button" disabled={Boolean(measuring)} onClick={() => void measure('area')}><Pentagon size={15} /> Area</button></div>
            {measurements.length > 0 && <div className="measurement-list">{measurements.map((item, index) => <div key={`${item.type}-${index}`}><span>{item.type}</span><strong>{item.label}</strong></div>)}<button className="button secondary" type="button" onClick={clearMeasurements}><Trash2 size={15} /> Clear measurements</button></div>}
          </div>
          <div className="analysis-block"><h2>Point in polygon</h2><form className="input-action" onSubmit={(event) => { event.preventDefault(); testContainment() }}><input value={pointInput} aria-label="Point to test" placeholder="120.155100, 30.274100" onChange={(event) => setPointInput(event.target.value)} /><button className="icon-button solid" type="submit" title="Test point"><ScanLine size={18} /></button></form>{containment && <div className="analysis-result">{containment}</div>}</div>
        </section>}
        {error && <p className="inline-error studio-error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
