import { computed, ref, watch, type Ref } from 'vue'
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
  snapshot: Ref<MapWorkspaceSnapshot>
  selectedFeatureId: Ref<string | number | null>
  canUndo: Readonly<Ref<boolean>>
  canRedo: Readonly<Ref<boolean>>
  replaceCollection: (collection: GeoJsonFeatureCollection) => void
  append: (features: GeoJsonFeature[]) => void
  updateFeature: (id: string | number, feature: GeoJsonFeature) => void
  removeFeature: (id: string | number) => void
  clear: () => void
  setStyle: (style: Partial<GeoJsonStyle>) => void
  setCoordinateSystems: (source: CoordinateSystem, target: CoordinateSystem) => void
  undo: () => void
  redo: () => void
}

export function useMapWorkspace(): MapWorkspaceController {
  const snapshot = ref(loadWorkspace())
  const selectedFeatureId = ref<string | number | null>(null)
  const past = ref<MapWorkspaceSnapshot[]>([])
  const future = ref<MapWorkspaceSnapshot[]>([])

  const commit = (next: MapWorkspaceSnapshot) => {
    past.value = [...past.value.slice(-49), cloneWorkspaceSnapshot(snapshot.value)]
    future.value = []
    snapshot.value = createWorkspaceSnapshot(next)
  }

  const replaceCollection = (collection: GeoJsonFeatureCollection) => {
    commit(createWorkspaceSnapshot({ ...snapshot.value, collection }))
    selectedFeatureId.value = null
  }

  const append = (features: GeoJsonFeature[]) => commit(appendFeatures(snapshot.value, features))

  const removeFeature = (id: string | number) => {
    replaceCollection({
      type: 'FeatureCollection',
      features: snapshot.value.collection.features.filter((feature) => feature.id !== id),
    })
  }

  const updateFeature = (id: string | number, feature: GeoJsonFeature) => commit(createWorkspaceSnapshot({
    ...snapshot.value,
    collection: {
      type: 'FeatureCollection',
      features: snapshot.value.collection.features.map((item) => item.id === id ? { ...feature, id } : item),
    },
  }))

  const clear = () => replaceCollection({ type: 'FeatureCollection', features: [] })

  const setStyle = (style: Partial<GeoJsonStyle>) => commit(createWorkspaceSnapshot({
    ...snapshot.value,
    style: { ...snapshot.value.style, ...style },
  }))

  const setCoordinateSystems = (source: CoordinateSystem, target: CoordinateSystem) => commit(createWorkspaceSnapshot({
    ...snapshot.value,
    sourceCrs: source,
    targetCrs: target,
  }))

  const undo = () => {
    const previous = past.value.at(-1)
    if (!previous) return
    future.value = [cloneWorkspaceSnapshot(snapshot.value), ...future.value.slice(0, 49)]
    past.value = past.value.slice(0, -1)
    snapshot.value = previous
    selectedFeatureId.value = null
  }

  const redo = () => {
    const next = future.value[0]
    if (!next) return
    past.value = [...past.value.slice(-49), cloneWorkspaceSnapshot(snapshot.value)]
    future.value = future.value.slice(1)
    snapshot.value = next
    selectedFeatureId.value = null
  }

  watch(snapshot, (value) => saveWorkspace(value), { deep: true })

  return {
    snapshot,
    selectedFeatureId,
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    replaceCollection,
    append,
    updateFeature,
    removeFeature,
    clear,
    setStyle,
    setCoordinateSystems,
    undo,
    redo,
  }
}
