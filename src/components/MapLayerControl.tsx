import { Map as MapIcon, Satellite } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MapRuntime } from '../lib/map-runtime'

export default function MapLayerControl({ runtime }: { runtime: MapRuntime }) {
  const { t } = useTranslation()
  const [layer, setLayer] = useState<'standard' | 'satellite'>('standard')

  const selectLayer = (value: 'standard' | 'satellite'): void => {
    if (layer === value) return
    setLayer(value)
    runtime.setSatellite(value === 'satellite')
  }

  return (
    <div className="map-layer-control" role="group" aria-label={t('map.baseLayer')}>
      <button type="button" className={layer === 'standard' ? 'active' : ''} title={t('map.standard')} aria-label={t('map.standard')} onClick={() => selectLayer('standard')}>
        <MapIcon size={18} />
      </button>
      <button type="button" className={layer === 'satellite' ? 'active' : ''} title={t('map.satellite')} aria-label={t('map.satellite')} onClick={() => selectLayer('satellite')}>
        <Satellite size={18} />
      </button>
    </div>
  )
}
