import { Code2, Menu, Settings, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CredentialsDialog from './components/CredentialsDialog'
import ExplorerPanel from './components/ExplorerPanel'
import GeoJsonStudioPanel from './components/GeoJsonStudioPanel'
import GisExportPanel from './components/GisExportPanel'
import LayerLabPanel from './components/LayerLabPanel'
import LanguageSwitcher from './components/LanguageSwitcher'
import MapLayerControl from './components/MapLayerControl'
import MapViewport from './components/MapViewport'
import { useMapWorkspace } from './hooks/useMapWorkspace'
import { clearCredentials, readCredentials, saveCredentials, type AMapCredentials } from './lib/credentials'
import { features, findFeature, type FeatureId } from './lib/features'
import type { MapRuntime } from './lib/map-runtime'

const workspaceFeatures = new Set<FeatureId>(['geojson-studio', 'gis-export'])

export default function App() {
  const { t } = useTranslation()
  const [credentials] = useState(() => readCredentials())
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [activeFeatureId, setActiveFeatureId] = useState<FeatureId>('explore')
  const [runtime, setRuntime] = useState<MapRuntime>()
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [mapError, setMapError] = useState('')
  const workspace = useMapWorkspace()
  const activeFeature = useMemo(() => findFeature(activeFeatureId)!, [activeFeatureId])

  useEffect(() => {
    if (!runtime || !workspaceFeatures.has(activeFeatureId)) return
    runtime.renderGeoJson(workspace.snapshot.collection, {
      style: workspace.snapshot.style,
      selectedFeatureId: workspace.selectedFeatureId,
      onSelect: workspace.setSelectedFeatureId,
    })
  }, [runtime, activeFeatureId, workspace.snapshot, workspace.selectedFeatureId, workspace.setSelectedFeatureId])

  const handleMapReady = useCallback((nextRuntime: MapRuntime): void => {
    setRuntime(nextRuntime)
    setMapError('')
  }, [])

  const handleMapError = useCallback((message: string): void => {
    setMapError(message)
  }, [])

  const applyCredentials = (value: AMapCredentials): void => {
    saveCredentials(value)
    window.location.reload()
  }

  const removeCredentials = (): void => {
    clearCredentials()
    window.location.reload()
  }

  const selectFeature = (id: FeatureId): void => {
    if (id === activeFeatureId) return
    runtime?.clearGraphics()
    setActiveFeatureId(id)
    setMobilePanelOpen(false)
  }

  const ActiveIcon = activeFeature.icon

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" type="button" title={t('app.openTools')} onClick={() => setMobilePanelOpen(true)}>
          <Menu size={19} />
        </button>
        <a className="brand" href="./" aria-label={t('app.home')}>
          <span className="brand-mark">M</span>
          <span><strong>{t('app.brand')}</strong><small>{t('app.powered')}</small></span>
        </a>
        <div className="topbar-actions">
          <a className="icon-button" href="https://github.com/shenzhepei/maptalks-toolbox" target="_blank" rel="noreferrer" title="GitHub">
            <Code2 size={19} />
          </a>
          <LanguageSwitcher />
          <button className="icon-button" type="button" title={t('app.settings')} onClick={() => setCredentialsOpen(true)}>
            <Settings size={19} />
          </button>
        </div>
      </header>

      <aside className="feature-rail" aria-label={t('app.toolSelection')}>
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <button
              key={feature.id}
              type="button"
              className={activeFeatureId === feature.id ? 'active' : ''}
              title={t(`features.${feature.id}.label`)}
              onClick={() => selectFeature(feature.id)}
            >
              <Icon size={20} />
              <span>{t(`features.${feature.id}.label`)}</span>
            </button>
          )
        })}
      </aside>

      <aside className={`control-panel ${mobilePanelOpen ? 'open' : ''}`}>
        <header className="panel-header">
          <ActiveIcon size={19} />
          <h1>{t(`features.${activeFeature.id}.label`)}</h1>
          <button className="icon-button mobile-close" type="button" title={t('app.closeTools')} onClick={() => setMobilePanelOpen(false)}>
            <X size={18} />
          </button>
        </header>
        {runtime ? (
          <>
            {activeFeatureId === 'explore' && <ExplorerPanel runtime={runtime} />}
            {activeFeatureId === 'geojson-studio' && (
              <GeoJsonStudioPanel runtime={runtime} workspace={workspace} onRequestMap={() => setMobilePanelOpen(false)} />
            )}
            {activeFeatureId === 'layer-lab' && <LayerLabPanel runtime={runtime} />}
            {activeFeatureId === 'gis-export' && <GisExportPanel runtime={runtime} workspace={workspace} />}
          </>
        ) : (
          <div className="panel-empty">{mapError || t('app.waiting')}</div>
        )}
      </aside>

      <main className="map-stage">
        <MapViewport credentials={credentials} onReady={handleMapReady} onError={handleMapError} />
        {runtime && <MapLayerControl runtime={runtime} />}
      </main>

      {mobilePanelOpen && (
        <button className="mobile-scrim" type="button" aria-label={t('app.closeTools')} onClick={() => setMobilePanelOpen(false)} />
      )}

      <CredentialsDialog
        open={credentialsOpen}
        initial={credentials}
        canClose
        onClose={() => setCredentialsOpen(false)}
        onSave={applyCredentials}
        onClear={removeCredentials}
      />
    </div>
  )
}
