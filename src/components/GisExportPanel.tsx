import { Download, FileJson, Focus, Image, RotateCcw, Upload } from 'lucide-react'
import { type ChangeEvent, useRef, useState } from 'react'
import type { MapWorkspaceController } from '../hooks/useMapWorkspace'
import { convertGeoJson, parseGeoJson, sampleGeoJson } from '../lib/geojson'
import type { MapExportProgress, MapRuntime } from '../lib/map-runtime'

interface GisExportPanelProps {
  runtime: MapRuntime
  workspace: MapWorkspaceController
}

export default function GisExportPanel({ runtime, workspace }: GisExportPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [hasSelection, setHasSelection] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportZoom, setExportZoom] = useState(Math.min(20, Math.max(3, Math.ceil(runtime.map.getZoom()) + 2)))
  const [progress, setProgress] = useState<MapExportProgress | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const renderSample = (): void => {
    workspace.replaceCollection(sampleGeoJson)
    setFileName('demo.geojson')
    setError('')
  }

  const loadFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = parseGeoJson(await file.text())
      workspace.replaceCollection(convertGeoJson(data, workspace.snapshot.sourceCrs, 'wgs84'))
      setFileName(file.name)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The file could not be read.')
    } finally {
      event.target.value = ''
    }
  }

  const selectRegion = async (): Promise<void> => {
    setSelecting(true)
    setStatus('Draw a rectangle on the map')
    try {
      await runtime.startRectangle()
      setHasSelection(true)
      setStatus('Region selected')
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Region selection failed.')
      }
      setStatus('')
    } finally {
      setSelecting(false)
    }
  }

  const resetSelection = (): void => {
    runtime.clearRectangle()
    setHasSelection(false)
    setStatus('')
  }

  const exportMap = async (selectionOnly: boolean): Promise<void> => {
    setExporting(true)
    setProgress(null)
    setError('')
    try {
      await runtime.exportPng({ selectionOnly, zoom: exportZoom, onProgress: setProgress })
      setStatus('PNG downloaded')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'PNG export failed.')
    } finally {
      setExporting(false)
    }
  }

  const clearData = (): void => {
    workspace.clear()
    setFileName('')
  }

  return (
    <div className="panel-scroll">
      <section className="tool-section">
        <h2>GeoJSON data</h2>
        <input ref={fileInput} className="visually-hidden" type="file" accept=".json,.geojson,application/geo+json" onChange={(event) => void loadFile(event)} />
        <div className="button-grid">
          <button className="button primary" type="button" onClick={() => fileInput.current?.click()}><Upload size={16} /> Import file</button>
          <button className="button secondary" type="button" onClick={renderSample}><FileJson size={16} /> Demo data</button>
        </div>
        {fileName && (
          <div className="file-summary">
            <FileJson size={18} />
            <div><strong>{fileName}</strong><span>{workspace.snapshot.collection.features.length} features</span></div>
            <button className="icon-button" type="button" title="Clear data" onClick={clearData}><RotateCcw size={16} /></button>
          </div>
        )}
      </section>

      <section className="tool-section">
        <h2>Export area</h2>
        <div className="button-grid">
          <button className="button secondary" type="button" disabled={selecting} onClick={() => void selectRegion()}><Focus size={16} /> {selecting ? 'Drawing...' : 'Select region'}</button>
          <button className="button secondary" type="button" disabled={!hasSelection} onClick={resetSelection}><RotateCcw size={16} /> Reset</button>
        </div>
        {status && <p className="status-line">{status}</p>}
      </section>

      <section className="tool-section">
        <h2>PNG output</h2>
        <label className="field-label" htmlFor="export-zoom">Detail zoom</label>
        <input id="export-zoom" value={exportZoom} onChange={(event) => setExportZoom(Number(event.target.value))} type="number" min="3" max="20" step="1" disabled={exporting} />
        <div className="export-actions">
          <button className="button primary" type="button" disabled={exporting} onClick={() => void exportMap(false)}><Image size={16} /> Current view</button>
          <button className="button primary" type="button" disabled={exporting || !hasSelection} onClick={() => void exportMap(true)}><Download size={16} /> Selected region</button>
        </div>
        {progress && (
          <div className="export-progress">
            <progress value={progress.completed} max={progress.total} />
            <div>
              <span>{progress.phase === 'capturing' ? 'Capturing' : 'Merging'} {progress.completed} / {progress.total}</span>
              <span>{progress.width} x {progress.height} px</span>
            </div>
          </div>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}
