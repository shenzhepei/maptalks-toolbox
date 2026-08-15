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
import { useTranslation } from 'react-i18next'
import type { MapWorkspaceController } from '../hooks/useMapWorkspace'
import { translateError } from '../i18n'
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

const tabs: Array<{ id: StudioTab; labelKey: string; icon: LucideIcon }> = [
  { id: 'data', labelKey: 'studio.json', icon: Braces },
  { id: 'features', labelKey: 'studio.table', icon: List },
  { id: 'style', labelKey: 'studio.style', icon: Palette },
  { id: 'analysis', labelKey: 'studio.analysis', icon: Ruler },
]
const coordinateSystems: Array<{ value: CoordinateSystem; label: string }> = [
  { value: 'gcj02', label: 'GCJ-02 (AMap)' },
  { value: 'wgs84', label: 'WGS84' },
  { value: 'cgcs2000', label: 'CGCS2000' },
  { value: 'bd09', label: 'BD-09 (Baidu)' },
]
const drawingModes: Array<{ type: GeoJsonDrawingMode; labelKey: string; icon: LucideIcon }> = [
  { type: 'Point', labelKey: 'studio.point', icon: Circle },
  { type: 'LineString', labelKey: 'studio.line', icon: Minus },
  { type: 'Polygon', labelKey: 'studio.polygon', icon: Pentagon },
]

export default function GeoJsonStudioPanel({ runtime, workspace, onRequestMap }: GeoJsonStudioPanelProps) {
  const { t } = useTranslation()
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
  const [containment, setContainment] = useState<boolean | null>(null)

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
        setError(translateError(t, reason, 'studio.drawingFailed'))
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
      setError(translateError(t, reason, 'studio.invalidGeoJson'))
    }
  }

  const formatData = (): void => {
    try {
      setDataDraft(JSON.stringify(parseGeoJson(dataDraft), null, 2))
      setError('')
    } catch (reason) {
      setError(translateError(t, reason, 'studio.invalidGeoJson'))
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
      setError(translateError(t, reason, 'studio.invalidGeoJson'))
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
        setError(translateError(t, reason, 'studio.measurementFailed'))
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
      setError(t('explorer.invalidCoordinate'))
      return
    }
    const polygon = selectedFeature?.geometry.type.includes('Polygon')
      ? selectedFeature
      : collection.features.find((feature) => feature.geometry.type.includes('Polygon'))
    if (!polygon) {
      setError(t('studio.polygonRequired'))
      return
    }
    setContainment(pointInPolygonFeature(coordinate, polygon))
    runtime.mark(coordinate)
    setError('')
  }

  return (
    <div className="studio-shell">
      <div className="studio-commandbar">
        <div className="draw-tools" aria-label={t('studio.drawingTools')}>
          {drawingModes.map((mode) => {
            const Icon = mode.icon
            return <button key={mode.type} className={`icon-button ${drawing === mode.type ? 'active' : ''}`} type="button" title={t('studio.draw', { mode: t(mode.labelKey) })} onClick={() => void draw(mode.type)}><Icon size={17} /></button>
          })}
          {drawing && <button className="icon-button danger-icon" type="button" title={t('studio.cancelDrawing')} onClick={cancelDrawing}><X size={17} /></button>}
        </div>
        <span className="command-divider" />
        <button className="icon-button" type="button" title={t('studio.undo')} disabled={!workspace.canUndo} onClick={workspace.undo}><Undo2 size={17} /></button>
        <button className="icon-button" type="button" title={t('studio.redo')} disabled={!workspace.canRedo} onClick={workspace.redo}><Redo2 size={17} /></button>
        <span className="command-spacer" />
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.geojson,application/geo+json" onChange={(event) => void loadFile(event)} />
        <button className="icon-button" type="button" title={t('studio.import')} onClick={() => fileInput.current?.click()}><Upload size={17} /></button>
        <button className="icon-button" type="button" title={t('studio.download')} disabled={!collection.features.length} onClick={downloadOutput}><Download size={17} /></button>
        <button className="icon-button" type="button" title={t('studio.clear')} disabled={!collection.features.length} onClick={workspace.clear}><Trash2 size={17} /></button>
      </div>

      {drawing && <div className="active-mode-bar"><span>{t('studio.drawing', { mode: t(drawingModes.find((item) => item.type === drawing)?.labelKey ?? 'studio.point') })}</span><label><input checked={keepDrawing} type="checkbox" onChange={(event) => { setKeepDrawing(event.target.checked); keepDrawingRef.current = event.target.checked }} /> {t('studio.repeat')}</label><kbd>Esc</kbd></div>}

      <nav className="studio-tabs" aria-label={t('studio.views')}>
        {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}><Icon size={15} /><span>{t(tab.labelKey)}</span></button> })}
      </nav>

      <div className="studio-content">
        {activeTab === 'features' && <section className="workspace-pane">
          <div className="pane-title"><span>{t('studio.featureCount', { count: collection.features.length })}</span><span>{snapshot.sourceCrs.toUpperCase()}</span></div>
          {collection.features.length ? <div className="feature-list">{collection.features.map((feature, index) => <div key={feature.id} className={workspace.selectedFeatureId === feature.id ? 'selected' : ''}>
            <button className="feature-select" type="button" onClick={() => selectFeature(feature)}><span className="geometry-icon">{feature.geometry.type.includes('Point') ? <Circle size={14} /> : feature.geometry.type.includes('Line') ? <Minus size={14} /> : <Pentagon size={14} />}</span><span><strong>{featureName(feature, index)}</strong><small>{feature.geometry.type}</small></span></button>
            {feature.id !== undefined && <button className="icon-button" type="button" title={t('studio.deleteFeature')} onClick={() => workspace.removeFeature(feature.id!)}><Trash2 size={14} /></button>}
          </div>)}</div> : <div className="workspace-empty"><FileJson size={24} /><span>{t('studio.noFeatures')}</span></div>}
          {selectedFeature && <div className="feature-inspector"><label className="field-label" htmlFor="feature-name">{t('studio.name')}</label><input id="feature-name" value={String(selectedFeature.properties?.name ?? '')} placeholder={t('studio.featureName')} onChange={renameSelected} /><div className="inspector-meta"><span>ID</span><code>{selectedFeature.id}</code></div><div className="inspector-meta"><span>{t('studio.type')}</span><code>{selectedFeature.geometry.type}</code></div></div>}
        </section>}

        {activeTab === 'data' && <section className="workspace-pane data-pane">
          <div className="segmented-control data-view-switch" aria-label={t('studio.dataView')}><button type="button" className={dataView === 'input' ? 'active' : ''} onClick={() => setDataView('input')}>{t('studio.input')}</button><button type="button" className={dataView === 'output' ? 'active' : ''} onClick={() => setDataView('output')}>{t('studio.converted')}</button></div>
          {dataView === 'input' ? <>
            <div className="data-crs-row"><label className="field-label" htmlFor="source-crs">{t('studio.inputCrs')}</label><select id="source-crs" value={snapshot.sourceCrs} onChange={(event) => workspace.setCoordinateSystems(event.target.value as CoordinateSystem, snapshot.targetCrs)}>{coordinateSystems.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <textarea value={dataDraft} className="data-code-editor" spellCheck={false} aria-label={t('studio.editable')} onChange={(event) => { setDataDraft(event.target.value); setDataDirty(true) }} />
            <div className="data-actions"><button className="button secondary" type="button" onClick={formatData}><Braces size={15} /> {t('studio.format')}</button><button className="button primary" type="button" disabled={!dataDirty} onClick={applyData}><Check size={15} /> {t('studio.apply')}</button></div>
          </> : <>
            <div className="data-crs-row"><label className="field-label" htmlFor="output-crs">{t('studio.outputCrs')}</label><select id="output-crs" value={snapshot.targetCrs} onChange={(event) => workspace.setCoordinateSystems(snapshot.sourceCrs, event.target.value as CoordinateSystem)}>{coordinateSystems.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <pre className="converted-preview data-code-editor" aria-label={t('studio.convertedOutput')}>{output}</pre>
            <div className="data-actions"><button className="button secondary" type="button" onClick={() => void copyOutput()}>{copied ? <Check size={15} /> : <Clipboard size={15} />} {t('studio.copyOutput')}</button><button className="button secondary" type="button" onClick={downloadOutput}><Download size={15} /> {t('studio.download')}</button></div>
          </>}
        </section>}

        {activeTab === 'style' && <section className="workspace-pane style-pane">
          <label><span>{t('studio.stroke')}</span><input type="color" value={snapshot.style.strokeColor} onChange={(event) => setStyle('strokeColor', event)} /></label>
          <label><span>{t('studio.fill')}</span><input type="color" value={snapshot.style.fillColor} onChange={(event) => setStyle('fillColor', event)} /></label>
          <label><span>{t('studio.points')}</span><input type="color" value={snapshot.style.pointColor} onChange={(event) => setStyle('pointColor', event)} /></label>
          <label><span>{t('studio.strokeWidth')}</span><input type="range" min="1" max="10" step="1" value={snapshot.style.strokeWidth} onChange={(event) => setStyle('strokeWidth', event)} /><output>{snapshot.style.strokeWidth} px</output></label>
          <label><span>{t('studio.fillOpacity')}</span><input type="range" min="0" max="0.8" step="0.05" value={snapshot.style.fillOpacity} onChange={(event) => setStyle('fillOpacity', event)} /><output>{snapshot.style.fillOpacity}</output></label>
          <label><span>{t('studio.pointRadius')}</span><input type="range" min="3" max="18" step="1" value={snapshot.style.pointRadius} onChange={(event) => setStyle('pointRadius', event)} /><output>{snapshot.style.pointRadius} px</output></label>
          <button className="button secondary" type="button" onClick={() => workspace.setStyle({ strokeColor: '#16856f', fillColor: '#46b99e', pointColor: '#d84a2f', strokeWidth: 3, fillOpacity: 0.22, pointRadius: 7 })}><RotateCcw size={15} /> {t('studio.resetStyle')}</button>
        </section>}

        {activeTab === 'analysis' && <section className="workspace-pane analysis-pane">
          <div className="analysis-block"><h2>{t('studio.measure')}</h2><div className="button-grid"><button className="button secondary" type="button" disabled={Boolean(measuring)} onClick={() => void measure('distance')}><Ruler size={15} /> {t('studio.distance')}</button><button className="button secondary" type="button" disabled={Boolean(measuring)} onClick={() => void measure('area')}><Pentagon size={15} /> {t('studio.area')}</button></div>
            {measurements.length > 0 && <div className="measurement-list">{measurements.map((item, index) => <div key={`${item.type}-${index}`}><span>{t(`studio.${item.type}`)}</span><strong>{item.label}</strong></div>)}<button className="button secondary" type="button" onClick={clearMeasurements}><Trash2 size={15} /> {t('studio.clearMeasurements')}</button></div>}
          </div>
          <div className="analysis-block"><h2>{t('studio.pointInPolygon')}</h2><form className="input-action" onSubmit={(event) => { event.preventDefault(); testContainment() }}><input value={pointInput} aria-label={t('studio.pointToTest')} placeholder="120.155100, 30.274100" onChange={(event) => setPointInput(event.target.value)} /><button className="icon-button solid" type="submit" title={t('studio.testPoint')}><ScanLine size={18} /></button></form>{containment !== null && <div className="analysis-result">{t(containment ? 'studio.inside' : 'studio.outside')}</div>}</div>
        </section>}
        {error && <p className="inline-error studio-error" role="alert">{error}</p>}
      </div>
    </div>
  )
}
