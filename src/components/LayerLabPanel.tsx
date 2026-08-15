import { ArrowDown, ArrowUp, Eye, EyeOff, Layers3, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createCustomLayer,
  loadCustomLayers,
  saveCustomLayers,
  type CustomLayerDefinition,
  type CustomLayerType,
} from '../lib/custom-layers'
import type { MapRuntime } from '../lib/map-runtime'

const layerTypes: Array<{ value: CustomLayerType; label: string }> = [
  { value: 'xyz', label: 'XYZ tiles' },
  { value: 'wms', label: 'WMS' },
  { value: 'arcgis', label: 'ArcGIS MapServer' },
]

export default function LayerLabPanel({ runtime }: { runtime: MapRuntime }) {
  const [layers, setLayers] = useState(() => loadCustomLayers())
  const [name, setName] = useState('')
  const [type, setType] = useState<CustomLayerType>('xyz')
  const [url, setUrl] = useState('')
  const [wmsLayers, setWmsLayers] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    runtime.setCustomLayers(layers)
    return () => runtime.clearCustomLayers()
  }, [runtime])

  const persist = (next: CustomLayerDefinition[]): void => {
    setLayers(next)
    saveCustomLayers(next)
  }

  const addLayer = (): void => {
    try {
      const layer = createCustomLayer({ name, type, url, wmsLayers })
      const next = [...layers, layer]
      persist(next)
      runtime.setCustomLayers(next)
      setName('')
      setUrl('')
      setWmsLayers('')
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The layer could not be added.')
    }
  }

  const toggleLayer = (layer: CustomLayerDefinition): void => {
    const visible = !layer.visible
    persist(layers.map((item) => item.id === layer.id ? { ...item, visible } : item))
    runtime.updateCustomLayer(layer.id, { visible })
  }

  const setOpacity = (layer: CustomLayerDefinition, opacity: number): void => {
    persist(layers.map((item) => item.id === layer.id ? { ...item, opacity } : item))
    runtime.updateCustomLayer(layer.id, { opacity })
  }

  const moveLayer = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    if (target < 0 || target >= layers.length) return
    const next = [...layers]
    ;[next[index], next[target]] = [next[target], next[index]]
    persist(next)
    runtime.setCustomLayers(next)
  }

  const removeLayer = (layer: CustomLayerDefinition): void => {
    persist(layers.filter((item) => item.id !== layer.id))
    runtime.removeCustomLayer(layer.id)
  }

  return (
    <div className="panel-scroll layer-lab">
      <section className="tool-section layer-source-form">
        <div className="local-data-note"><ShieldCheck size={16} /><span>Layer configurations stay in this browser.</span></div>
        <label className="field-label" htmlFor="layer-name">Layer name</label>
        <input id="layer-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Road network" />
        <label className="field-label" htmlFor="layer-type">Service type</label>
        <select id="layer-type" value={type} onChange={(event) => setType(event.target.value as CustomLayerType)}>
          {layerTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <label className="field-label" htmlFor="layer-url">Service URL</label>
        <input
          id="layer-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          type="url"
          placeholder={type === 'xyz' ? 'https://tiles.example.com/{z}/{x}/{y}.png' : 'https://server.example.com/service'}
        />
        {type === 'wms' && (
          <>
            <label className="field-label" htmlFor="wms-layers">WMS layers</label>
            <input id="wms-layers" value={wmsLayers} onChange={(event) => setWmsLayers(event.target.value)} placeholder="workspace:roads" />
          </>
        )}
        <button className="button primary add-layer-button" type="button" onClick={addLayer}><Plus size={16} /> Add layer</button>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </section>

      <section className="tool-section">
        <div className="section-heading-row"><h2>Custom layers</h2><span className="layer-count">{layers.length}</span></div>
        {layers.length ? (
          <div className="custom-layer-list">
            {layers.map((layer, index) => (
              <article key={layer.id} className="custom-layer-item">
                <header>
                  <button className="icon-button" type="button" title={layer.visible ? 'Hide layer' : 'Show layer'} onClick={() => toggleLayer(layer)}>
                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <div><strong>{layer.name}</strong><span>{layer.type.toUpperCase()}</span></div>
                  <button className="icon-button" type="button" title="Move layer up" disabled={index === layers.length - 1} onClick={() => moveLayer(index, 1)}><ArrowUp size={15} /></button>
                  <button className="icon-button" type="button" title="Move layer down" disabled={index === 0} onClick={() => moveLayer(index, -1)}><ArrowDown size={15} /></button>
                  <button className="icon-button danger-icon" type="button" title="Remove layer" onClick={() => removeLayer(layer)}><Trash2 size={15} /></button>
                </header>
                <code title={layer.url}>{layer.url}</code>
                <label>
                  <span>Opacity</span>
                  <input type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(event) => setOpacity(layer, Number(event.target.value))} />
                  <output>{Math.round(layer.opacity * 100)}%</output>
                </label>
              </article>
            ))}
          </div>
        ) : (
          <div className="workspace-empty"><Layers3 size={24} /><span>No custom layers</span></div>
        )}
      </section>
    </div>
  )
}
