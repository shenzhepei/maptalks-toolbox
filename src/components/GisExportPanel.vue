<script setup lang="ts">
import { ref } from 'vue'
import { Download, FileJson, Focus, Image, RotateCcw, Upload } from 'lucide-vue-next'
import { parseGeoJson, sampleGeoJson } from '../lib/geojson'
import type { MapRuntime } from '../lib/map-runtime'

const props = defineProps<{ runtime: MapRuntime }>()

const fileInput = ref<HTMLInputElement>()
const featureCount = ref(0)
const fileName = ref('')
const hasSelection = ref(false)
const selecting = ref(false)
const exporting = ref(false)
const status = ref('')
const error = ref('')

function renderSample() {
  featureCount.value = props.runtime.renderGeoJson(sampleGeoJson)
  fileName.value = 'demo.geojson'
  error.value = ''
}

async function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const data = parseGeoJson(await file.text())
    featureCount.value = props.runtime.renderGeoJson(data)
    fileName.value = file.name
    error.value = ''
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The file could not be read.'
  } finally {
    ;(event.target as HTMLInputElement).value = ''
  }
}

async function selectRegion() {
  selecting.value = true
  status.value = 'Draw a rectangle on the map'
  await props.runtime.startRectangle()
  selecting.value = false
  hasSelection.value = true
  status.value = 'Region selected'
}

function resetSelection() {
  props.runtime.clearRectangle()
  hasSelection.value = false
  status.value = ''
}

async function exportMap(selectionOnly: boolean) {
  exporting.value = true
  error.value = ''
  try {
    await props.runtime.exportPng(selectionOnly)
    status.value = 'PNG downloaded'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'PNG export failed.'
  } finally {
    exporting.value = false
  }
}

function clearData() {
  props.runtime.clearGeoJson()
  featureCount.value = 0
  fileName.value = ''
}
</script>

<template>
  <div class="panel-scroll">
    <section class="tool-section">
      <h2>GeoJSON data</h2>
      <input ref="fileInput" class="visually-hidden" type="file" accept=".json,.geojson,application/geo+json" @change="loadFile" />
      <div class="button-grid">
        <button class="button primary" type="button" @click="fileInput?.click()">
          <Upload :size="16" /> Import file
        </button>
        <button class="button secondary" type="button" @click="renderSample">
          <FileJson :size="16" /> Demo data
        </button>
      </div>
      <div v-if="fileName" class="file-summary">
        <FileJson :size="18" />
        <div><strong>{{ fileName }}</strong><span>{{ featureCount }} features</span></div>
        <button class="icon-button" type="button" title="Clear data" @click="clearData"><RotateCcw :size="16" /></button>
      </div>
    </section>

    <section class="tool-section">
      <h2>Export area</h2>
      <div class="button-grid">
        <button class="button secondary" type="button" :disabled="selecting" @click="selectRegion">
          <Focus :size="16" /> {{ selecting ? 'Drawing...' : 'Select region' }}
        </button>
        <button class="button secondary" type="button" :disabled="!hasSelection" @click="resetSelection">
          <RotateCcw :size="16" /> Reset
        </button>
      </div>
      <p v-if="status" class="status-line">{{ status }}</p>
    </section>

    <section class="tool-section">
      <h2>PNG output</h2>
      <div class="export-actions">
        <button class="button primary" type="button" :disabled="exporting" @click="exportMap(false)">
          <Image :size="16" /> Current view
        </button>
        <button class="button primary" type="button" :disabled="exporting || !hasSelection" @click="exportMap(true)">
          <Download :size="16" /> Selected region
        </button>
      </div>
      <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    </section>
  </div>
</template>
