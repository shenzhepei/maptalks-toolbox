import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MapWorkspaceController } from '../hooks/useMapWorkspace'
import type { MapRuntime } from '../lib/map-runtime'
import type { ToolboxFeature } from '../lib/features'
import ExplorerPanel from './ExplorerPanel'
import GeoJsonStudioPanel from './GeoJsonStudioPanel'
import GisExportPanel from './GisExportPanel'
import LayerLabPanel from './LayerLabPanel'

interface ActiveFeaturePanelProps {
  activeFeature: ToolboxFeature
  runtime?: MapRuntime
  workspace: MapWorkspaceController
  mapError: string
  mobileOpen: boolean
  onClose: () => void
}

export default function ActiveFeaturePanel({
  activeFeature,
  runtime,
  workspace,
  mapError,
  mobileOpen,
  onClose,
}: ActiveFeaturePanelProps) {
  const { t } = useTranslation()
  const ActiveIcon = activeFeature.icon

  return (
    <aside className={`control-panel ${mobileOpen ? 'open' : ''}`}>
      <header className="panel-header">
        <ActiveIcon size={19} />
        <h1>{t(`features.${activeFeature.id}.label`)}</h1>
        <button className="icon-button mobile-close" type="button" title={t('app.closeTools')} onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {runtime ? (
        <>
          {activeFeature.id === 'explore' && <ExplorerPanel runtime={runtime} />}
          {activeFeature.id === 'geojson-studio' && (
            <GeoJsonStudioPanel runtime={runtime} workspace={workspace} onRequestMap={onClose} />
          )}
          {activeFeature.id === 'layer-lab' && <LayerLabPanel runtime={runtime} />}
          {activeFeature.id === 'gis-export' && <GisExportPanel runtime={runtime} workspace={workspace} />}
        </>
      ) : (
        <div className="panel-empty">{mapError || t('app.waiting')}</div>
      )}
    </aside>
  )
}
