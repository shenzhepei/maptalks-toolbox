import { cloneGeoJson, type GeoJsonFeature, type GeoJsonFeatureCollection } from './geojson'
import type { CoordinateSystem } from './coordinates'

export interface GeoJsonStyle {
  strokeColor: string
  fillColor: string
  pointColor: string
  strokeWidth: number
  fillOpacity: number
  pointRadius: number
}

export interface MapWorkspaceSnapshot {
  collection: GeoJsonFeatureCollection
  style: GeoJsonStyle
  sourceCrs: CoordinateSystem
  targetCrs: CoordinateSystem
}

export const defaultGeoJsonStyle: GeoJsonStyle = {
  strokeColor: '#16856f',
  fillColor: '#46b99e',
  pointColor: '#d84a2f',
  strokeWidth: 3,
  fillOpacity: 0.22,
  pointRadius: 7,
}

export const workspaceStorageKey = 'amap-toolbox-workspace-v2'

function createFeatureId() {
  return globalThis.crypto?.randomUUID?.() ?? `feature-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ensureFeatureIds(collection: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((feature) => ({ ...feature, id: feature.id ?? createFeatureId() })),
  }
}

export function createWorkspaceSnapshot(value?: Partial<MapWorkspaceSnapshot>): MapWorkspaceSnapshot {
  return {
    collection: ensureFeatureIds(value?.collection ?? { type: 'FeatureCollection', features: [] }),
    style: { ...defaultGeoJsonStyle, ...value?.style },
    sourceCrs: value?.sourceCrs ?? 'wgs84',
    targetCrs: value?.targetCrs ?? 'wgs84',
  }
}

export function cloneWorkspaceSnapshot(snapshot: MapWorkspaceSnapshot): MapWorkspaceSnapshot {
  return {
    collection: cloneGeoJson(snapshot.collection),
    style: { ...snapshot.style },
    sourceCrs: snapshot.sourceCrs,
    targetCrs: snapshot.targetCrs,
  }
}

export function loadWorkspace(storage: Storage | undefined = globalThis.localStorage): MapWorkspaceSnapshot {
  if (!storage) return createWorkspaceSnapshot()
  try {
    const value = storage.getItem(workspaceStorageKey)
    return value ? createWorkspaceSnapshot(JSON.parse(value) as MapWorkspaceSnapshot) : createWorkspaceSnapshot()
  } catch {
    return createWorkspaceSnapshot()
  }
}

export function saveWorkspace(snapshot: MapWorkspaceSnapshot, storage: Storage | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(workspaceStorageKey, JSON.stringify(snapshot))
  } catch {
    // A large imported dataset can exceed the browser's local storage quota.
  }
}

export function appendFeatures(snapshot: MapWorkspaceSnapshot, features: GeoJsonFeature[]) {
  return createWorkspaceSnapshot({
    ...snapshot,
    collection: {
      type: 'FeatureCollection',
      features: [...snapshot.collection.features, ...features],
    },
  })
}
