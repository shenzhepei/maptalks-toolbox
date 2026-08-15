import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  appendFeatures,
  cloneWorkspaceSnapshot,
  createWorkspaceSnapshot,
  loadWorkspace,
  saveWorkspace,
  type GeoJsonStyle,
  type MapWorkspaceSnapshot,
} from '../lib/map-workspace'
import type { CoordinateSystem } from '../lib/coordinates'
import type { GeoJsonFeature, GeoJsonFeatureCollection } from '../lib/geojson'

export interface MapWorkspaceController {
  snapshot: MapWorkspaceSnapshot
  selectedFeatureId: string | number | null
  setSelectedFeatureId: Dispatch<SetStateAction<string | number | null>>
  canUndo: boolean
  canRedo: boolean
  replaceCollection: (collection: GeoJsonFeatureCollection) => void
  append: (features: GeoJsonFeature[]) => MapWorkspaceSnapshot
  updateFeature: (id: string | number, feature: GeoJsonFeature) => void
  removeFeature: (id: string | number) => void
  clear: () => void
  setStyle: (style: Partial<GeoJsonStyle>) => void
  setCoordinateSystems: (source: CoordinateSystem, target: CoordinateSystem) => void
  undo: () => void
  redo: () => void
}

export function useMapWorkspace(): MapWorkspaceController {
  const [snapshot, setSnapshot] = useState<MapWorkspaceSnapshot>(() => loadWorkspace())
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | number | null>(null)
  const snapshotRef = useRef(snapshot)
  const past = useRef<MapWorkspaceSnapshot[]>([])
  const future = useRef<MapWorkspaceSnapshot[]>([])
  const [, refreshHistory] = useReducer((value: number) => value + 1, 0)

  snapshotRef.current = snapshot

  const setCurrent = useCallback((next: MapWorkspaceSnapshot): void => {
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  const commit = useCallback((value: MapWorkspaceSnapshot): MapWorkspaceSnapshot => {
    const next = createWorkspaceSnapshot(value)
    past.current = [...past.current.slice(-49), cloneWorkspaceSnapshot(snapshotRef.current)]
    future.current = []
    setCurrent(next)
    refreshHistory()
    return next
  }, [setCurrent])

  const replaceCollection = useCallback((collection: GeoJsonFeatureCollection): void => {
    commit(createWorkspaceSnapshot({ ...snapshotRef.current, collection }))
    setSelectedFeatureId(null)
  }, [commit])

  const append = useCallback((features: GeoJsonFeature[]): MapWorkspaceSnapshot => (
    commit(appendFeatures(snapshotRef.current, features))
  ), [commit])

  const removeFeature = useCallback((id: string | number): void => {
    replaceCollection({
      type: 'FeatureCollection',
      features: snapshotRef.current.collection.features.filter((feature) => feature.id !== id),
    })
  }, [replaceCollection])

  const updateFeature = useCallback((id: string | number, feature: GeoJsonFeature): void => {
    commit(createWorkspaceSnapshot({
      ...snapshotRef.current,
      collection: {
        type: 'FeatureCollection',
        features: snapshotRef.current.collection.features.map((item) => (
          item.id === id ? { ...feature, id } : item
        )),
      },
    }))
  }, [commit])

  const clear = useCallback((): void => {
    replaceCollection({ type: 'FeatureCollection', features: [] })
  }, [replaceCollection])

  const setStyle = useCallback((style: Partial<GeoJsonStyle>): void => {
    commit(createWorkspaceSnapshot({
      ...snapshotRef.current,
      style: { ...snapshotRef.current.style, ...style },
    }))
  }, [commit])

  const setCoordinateSystems = useCallback((source: CoordinateSystem, target: CoordinateSystem): void => {
    commit(createWorkspaceSnapshot({
      ...snapshotRef.current,
      sourceCrs: source,
      targetCrs: target,
    }))
  }, [commit])

  const undo = useCallback((): void => {
    const previous = past.current.at(-1)
    if (!previous) return
    future.current = [cloneWorkspaceSnapshot(snapshotRef.current), ...future.current.slice(0, 49)]
    past.current = past.current.slice(0, -1)
    setCurrent(previous)
    setSelectedFeatureId(null)
    refreshHistory()
  }, [setCurrent])

  const redo = useCallback((): void => {
    const next = future.current[0]
    if (!next) return
    past.current = [...past.current.slice(-49), cloneWorkspaceSnapshot(snapshotRef.current)]
    future.current = future.current.slice(1)
    setCurrent(next)
    setSelectedFeatureId(null)
    refreshHistory()
  }, [setCurrent])

  useEffect(() => saveWorkspace(snapshot), [snapshot])

  return useMemo(() => ({
    snapshot,
    selectedFeatureId,
    setSelectedFeatureId,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    replaceCollection,
    append,
    updateFeature,
    removeFeature,
    clear,
    setStyle,
    setCoordinateSystems,
    undo,
    redo,
  }), [
    snapshot,
    selectedFeatureId,
    replaceCollection,
    append,
    updateFeature,
    removeFeature,
    clear,
    setStyle,
    setCoordinateSystems,
    undo,
    redo,
  ])
}
