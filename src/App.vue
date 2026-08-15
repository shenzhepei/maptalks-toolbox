<script setup lang="ts">
import { computed, ref } from 'vue'
import { Github, Menu, Settings, X } from 'lucide-vue-next'
import CredentialsDialog from './components/CredentialsDialog.vue'
import ExplorerPanel from './components/ExplorerPanel.vue'
import GeoJsonStudioPanel from './components/GeoJsonStudioPanel.vue'
import GisExportPanel from './components/GisExportPanel.vue'
import MapLayerControl from './components/MapLayerControl.vue'
import MapViewport from './components/MapViewport.vue'
import { clearCredentials, readCredentials, saveCredentials, type AMapCredentials } from './lib/credentials'
import { features, findFeature, type FeatureId } from './lib/features'
import type { MapRuntime } from './lib/map-runtime'

const credentials = ref(readCredentials())
const credentialsOpen = ref(!credentials.value)
const activeFeatureId = ref<FeatureId>('explore')
const runtime = ref<MapRuntime>()
const mobilePanelOpen = ref(false)
const mapError = ref('')

const activeFeature = computed(() => findFeature(activeFeatureId.value)!)

function applyCredentials(value: AMapCredentials) {
  const hadCredentials = Boolean(credentials.value)
  credentials.value = saveCredentials(value)
  credentialsOpen.value = false
  if (hadCredentials) window.location.reload()
}

function removeCredentials() {
  clearCredentials()
  window.location.reload()
}

function selectFeature(id: FeatureId) {
  activeFeatureId.value = id
  mobilePanelOpen.value = false
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <button class="icon-button mobile-menu" type="button" title="Open tools" @click="mobilePanelOpen = true">
        <Menu :size="19" />
      </button>
      <a class="brand" href="./" aria-label="AMap Toolbox home">
        <span class="brand-mark">A</span>
        <span><strong>AMap Toolbox</strong><small>Browser GIS utilities</small></span>
      </a>
      <div class="topbar-actions">
        <a class="icon-button" href="https://github.com/shenzhepei/amap-toolbox" target="_blank" rel="noreferrer" title="GitHub">
          <Github :size="19" />
        </a>
        <button class="icon-button" type="button" title="AMap credentials" @click="credentialsOpen = true">
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
        <GeoJsonStudioPanel v-else-if="activeFeatureId === 'geojson-studio'" :runtime="runtime" />
        <GisExportPanel v-else :runtime="runtime" />
      </template>
      <div v-else class="panel-empty">{{ mapError || 'Waiting for map' }}</div>
    </aside>

    <main class="map-stage">
      <MapViewport
        v-if="credentials"
        :credentials="credentials"
        @ready="runtime = $event"
        @error="mapError = $event"
      />
      <div v-else class="map-placeholder" />
      <MapLayerControl v-if="runtime" :runtime="runtime" />
    </main>

    <button v-if="mobilePanelOpen" class="mobile-scrim" type="button" aria-label="Close tools" @click="mobilePanelOpen = false" />

    <CredentialsDialog
      :open="credentialsOpen"
      :initial="credentials"
      :can-close="Boolean(credentials)"
      @close="credentialsOpen = false"
      @save="applyCredentials"
      @clear="removeCredentials"
    />
  </div>
</template>
