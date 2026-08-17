import { useCallback, useEffect, useMemo, useState } from 'react'
import { clearCredentials, readCredentials, saveCredentials, type AMapCredentials } from '../lib/credentials'
import { findFeature, type FeatureId } from '../lib/features'
import type { MapRuntime } from '../lib/map-runtime'
import { useMapWorkspace } from './useMapWorkspace'

const workspaceFeatures = new Set<FeatureId>(['geojson-studio', 'gis-export'])

export function useToolboxShell() {
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

  const selectFeature = (id: FeatureId): void => {
    if (id === activeFeatureId) return
    runtime?.clearGraphics()
    setActiveFeatureId(id)
    setMobilePanelOpen(false)
  }

  const applyCredentials = (value: AMapCredentials): void => {
    saveCredentials(value)
    window.location.reload()
  }

  const removeCredentials = (): void => {
    clearCredentials()
    window.location.reload()
  }

  return {
    credentials,
    credentialsOpen,
    activeFeature,
    runtime,
    mobilePanelOpen,
    mapError,
    workspace,
    handleMapReady,
    handleMapError,
    selectFeature,
    applyCredentials,
    removeCredentials,
    openCredentials: () => setCredentialsOpen(true),
    closeCredentials: () => setCredentialsOpen(false),
    openMobilePanel: () => setMobilePanelOpen(true),
    closeMobilePanel: () => setMobilePanelOpen(false),
  }
}
