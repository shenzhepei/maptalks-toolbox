import { Map as MapIcon, Satellite } from 'lucide-react'
import { useState } from 'react'
import type { MapRuntime } from '../lib/map-runtime'

export default function MapLayerControl({ runtime }: { runtime: MapRuntime }) {
  const [layer, setLayer] = useState<'standard' | 'satellite'>('standard')

  const selectLayer = (value: 'standard' | 'satellite'): void => {
    if (layer === value) return
    setLayer(value)
    runtime.setSatellite(value === 'satellite')
  }

  return (
    <div className="map-layer-control" role="group" aria-label="Base map layer">
      <button type="button" className={layer === 'standard' ? 'active' : ''} title="Standard map" aria-label="Standard map" onClick={() => selectLayer('standard')}>
        <MapIcon size={18} />
      </button>
      <button type="button" className={layer === 'satellite' ? 'active' : ''} title="Satellite map" aria-label="Satellite map" onClick={() => selectLayer('satellite')}>
        <Satellite size={18} />
      </button>
    </div>
  )
}
