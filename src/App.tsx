import { useTranslation } from 'react-i18next'
import ActiveFeaturePanel from './components/ActiveFeaturePanel'
import AppTopbar from './components/AppTopbar'
import CredentialsDialog from './components/CredentialsDialog'
import FeatureRail from './components/FeatureRail'
import MapLayerControl from './components/MapLayerControl'
import MapViewport from './components/MapViewport'
import { useToolboxShell } from './hooks/useToolboxShell'

export default function App() {
  const { t } = useTranslation()
  const shell = useToolboxShell()

  return (
    <div className="app-shell">
      <AppTopbar onOpenTools={shell.openMobilePanel} onOpenSettings={shell.openCredentials} />

      <FeatureRail activeFeatureId={shell.activeFeature.id} onSelect={shell.selectFeature} />

      <ActiveFeaturePanel
        activeFeature={shell.activeFeature}
        runtime={shell.runtime}
        workspace={shell.workspace}
        mapError={shell.mapError}
        mobileOpen={shell.mobilePanelOpen}
        onClose={shell.closeMobilePanel}
      />

      <main className="map-stage">
        <MapViewport
          credentials={shell.credentials}
          onReady={shell.handleMapReady}
          onError={shell.handleMapError}
        />
        {shell.runtime && <MapLayerControl runtime={shell.runtime} />}
      </main>

      {shell.mobilePanelOpen && (
        <button
          className="mobile-scrim"
          type="button"
          aria-label={t('app.closeTools')}
          onClick={shell.closeMobilePanel}
        />
      )}

      <CredentialsDialog
        open={shell.credentialsOpen}
        initial={shell.credentials}
        canClose
        onClose={shell.closeCredentials}
        onSave={shell.applyCredentials}
        onClear={shell.removeCredentials}
      />
    </div>
  )
}
