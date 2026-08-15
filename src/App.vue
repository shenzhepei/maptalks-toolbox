<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Github, Menu, Settings, X } from 'lucide-vue-next'
import CredentialsDialog from './components/CredentialsDialog.vue'
import ExplorerPanel from './components/ExplorerPanel.vue'
import GeoJsonStudioPanel from './components/GeoJsonStudioPanel.vue'
import LayerLabPanel from './components/LayerLabPanel.vue'
import GisExportPanel from './components/GisExportPanel.vue'
import MapLayerControl from './components/MapLayerControl.vue'
import MapViewport from './components/MapViewport.vue'
import { clearCredentials, readCredentials, saveCredentials, type AMapCredentials } from './lib/credentials'
import { features, findFeature, type FeatureId } from './lib/features'
import type { MapRuntime } from './lib/map-runtime'
import { useMapWorkspace } from './composables/useMapWorkspace'

const credentials = ref(readCredentials())
const credentialsOpen = ref(false)
const activeFeatureId = ref<FeatureId>('explore')
const runtime = ref<MapRuntime>()
const mobilePanelOpen = ref(false)
const mapError = ref('')
const workspace = useMapWorkspace()

const activeFeature = computed(() => findFeature(activeFeatureId.value)!)
const workspaceFeatures = new Set<FeatureId>(['geojson-studio', 'gis-export'])

function renderWorkspace(currentRuntime: MapRuntime) {
  currentRuntime.renderGeoJson(workspace.snapshot.value.collection, {
    style: workspace.snapshot.value.style,
    selectedFeatureId: workspace.selectedFeatureId.value,
    onSelect: (id) => (workspace.selectedFeatureId.value = id),
  })
}

function applyCredentials(value: AMapCredentials) {
  saveCredentials(value)
  window.location.reload()
}

function removeCredentials() {
  clearCredentials()
  window.location.reload()
}

function selectFeature(id: FeatureId) {
  if (id === activeFeatureId.value) return
  runtime.value?.clearGraphics()
  activeFeatureId.value = id
  mobilePanelOpen.value = false
  if (runtime.value && workspaceFeatures.has(id)) {
    nextTick(() => runtime.value && renderWorkspace(runtime.value))
  }
}

watch(
  [runtime, workspace.snapshot, workspace.selectedFeatureId],
  ([currentRuntime]) => {
    if (!currentRuntime) return
    if (workspaceFeatures.has(activeFeatureId.value)) renderWorkspace(currentRuntime)
  },
  { deep: true },
)
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <button class="icon-button mobile-menu" type="button" title="Open tools" @click="mobilePanelOpen = true">
        <Menu :size="19" />
      </button>
      <a class="brand" href="./" aria-label="GIS Toolbox home">
        <span class="brand-mark">M</span>
        <span><strong>GIS Toolbox</strong><small>Powered by maptalks</small></span>
      </a>
      <div class="topbar-actions">
        <a class="icon-button" href="https://github.com/shenzhepei/maptalks-toolbox" target="_blank" rel="noreferrer" title="GitHub">
          <Github :size="19" />
        </a>
        <button class="icon-button" type="button" title="Optional AMap services" @click="credentialsOpen = true">
          <Settings :size="19" />
        </button>
      </div>
    </header>

    <aside class="feature-rail" aria-label="Tool selection">
      <button
        v-for="feature in features"
        :key="feature.id"
        type="button"
        :class="{ active: activeFeatureId === feature.id }"
        :title="feature.label"
        @click="selectFeature(feature.id)"
      >
        <component :is="feature.icon" :size="20" />
        <span>{{ feature.label }}</span>
      </button>
    </aside>

    <aside class="control-panel" :class="{ open: mobilePanelOpen }">
      <header class="panel-header">
        <component :is="activeFeature.icon" :size="19" />
        <h1>{{ activeFeature.label }}</h1>
        <button class="icon-button mobile-close" type="button" title="Close tools" @click="mobilePanelOpen = false">
          <X :size="18" />
        </button>
      </header>
      <template v-if="runtime">
        <ExplorerPanel v-if="activeFeatureId === 'explore'" :runtime="runtime" />
        <GeoJsonStudioPanel
          v-else-if="activeFeatureId === 'geojson-studio'"
          :runtime="runtime"
          :workspace="workspace"
          @request-map="mobilePanelOpen = false"
        />
        <LayerLabPanel v-else-if="activeFeatureId === 'layer-lab'" :runtime="runtime" />
        <GisExportPanel v-else :runtime="runtime" :workspace="workspace" />
      </template>
      <div v-else class="panel-empty">{{ mapError || 'Waiting for map' }}</div>
    </aside>

    <main class="map-stage">
      <MapViewport :credentials="credentials" @ready="runtime = $event" @error="mapError = $event" />
      <MapLayerControl v-if="runtime" :runtime="runtime" />
    </main>

    <button v-if="mobilePanelOpen" class="mobile-scrim" type="button" aria-label="Close tools" @click="mobilePanelOpen = false" />

    <CredentialsDialog
      :open="credentialsOpen"
      :initial="credentials"
      :can-close="true"
      @close="credentialsOpen = false"
      @save="applyCredentials"
      @clear="removeCredentials"
    />
  </div>
</template>
