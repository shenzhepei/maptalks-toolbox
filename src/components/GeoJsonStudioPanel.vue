<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Braces,
  Check,
  Circle,
  Clipboard,
  Download,
  FileJson,
  List,
  Minus,
  Palette,
  Pentagon,
  Redo2,
  RotateCcw,
  Ruler,
  ScanLine,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-vue-next'
import type { MapWorkspaceController } from '../composables/useMapWorkspace'
import { parseCoordinate, type CoordinateSystem } from '../lib/coordinates'
import { convertGeoJson, parseGeoJson, type GeoJsonFeature } from '../lib/geojson'
import type { GeoJsonDrawingMode, MapRuntime, MeasurementResult } from '../lib/map-runtime'
import { pointInPolygonFeature } from '../lib/spatial'

const props = defineProps<{ runtime: MapRuntime; workspace: MapWorkspaceController }>()
const emit = defineEmits<{ 'request-map': [] }>()

type StudioTab = 'features' | 'data' | 'style' | 'analysis'
type DataView = 'input' | 'output'

const tabs: Array<{ id: StudioTab; label: string; icon: typeof List }> = [
  { id: 'data', label: 'JSON', icon: Braces },
  { id: 'features', label: 'Table', icon: List },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'analysis', label: 'Analysis', icon: Ruler },
]
const coordinateSystems: Array<{ value: CoordinateSystem; label: string }> = [
  { value: 'gcj02', label: 'GCJ-02 (AMap)' },
  { value: 'wgs84', label: 'WGS84' },
  { value: 'cgcs2000', label: 'CGCS2000' },
  { value: 'bd09', label: 'BD-09 (Baidu)' },
]
const drawingModes: Array<{ type: GeoJsonDrawingMode; label: string; icon: typeof Circle }> = [
  { type: 'Point', label: 'Point', icon: Circle },
  { type: 'LineString', label: 'Line', icon: Minus },
  { type: 'Polygon', label: 'Polygon', icon: Pentagon },
]

const fileInput = ref<HTMLInputElement>()
const activeTab = ref<StudioTab>('data')
const dataView = ref<DataView>('input')
const drawing = ref<GeoJsonDrawingMode | null>(null)
const keepDrawing = ref(false)
const copied = ref(false)
const dataDraft = ref('')
const dataDirty = ref(false)
const error = ref('')
const measurements = ref<MeasurementResult[]>([])
const measuring = ref('')
const pointInput = ref('')
const containment = ref('')

const snapshot = computed(() => props.workspace.snapshot.value)
const collection = computed(() => snapshot.value.collection)
const selectedFeature = computed(() => collection.value.features.find((feature) => feature.id === props.workspace.selectedFeatureId.value))
const output = computed(() => JSON.stringify(convertGeoJson(collection.value, 'wgs84', snapshot.value.targetCrs), null, 2))

watch(collection, (value) => {
  if (!dataDirty.value) dataDraft.value = JSON.stringify(value, null, 2)
}, { immediate: true, deep: true })

async function draw(mode: GeoJsonDrawingMode) {
  if (drawing.value) cancelDrawing()
  drawing.value = mode
  error.value = ''
  emit('request-map')
  try {
    do {
      const feature = await props.runtime.startGeoJsonDrawing(mode)
      props.workspace.append([feature])
      props.workspace.selectedFeatureId.value = props.workspace.snapshot.value.collection.features.at(-1)?.id ?? null
    } while (keepDrawing.value && drawing.value === mode)
  } catch (reason) {
    if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
      error.value = reason instanceof Error ? reason.message : 'Drawing failed.'
    }
  } finally {
    if (drawing.value === mode) drawing.value = null
  }
}

function cancelDrawing() {
  drawing.value = null
  props.runtime.cancelDrawing()
}

function selectFeature(feature: GeoJsonFeature) {
  if (feature.id === undefined) return
  props.workspace.selectedFeatureId.value = feature.id
  props.runtime.focusFeature(feature.id)
}

function featureName(feature: GeoJsonFeature, index: number) {
  const name = feature.properties?.name
  return typeof name === 'string' && name.trim() ? name : `${feature.geometry.type} ${index + 1}`
}

function renameSelected(event: Event) {
  const feature = selectedFeature.value
  if (!feature?.id) return
  props.workspace.updateFeature(feature.id, {
    ...feature,
    properties: { ...feature.properties, name: (event.target as HTMLInputElement).value },
  })
}

function setSourceCrs(source: CoordinateSystem) {
  props.workspace.setCoordinateSystems(source, snapshot.value.targetCrs)
}

function setTargetCrs(target: CoordinateSystem) {
  props.workspace.setCoordinateSystems(snapshot.value.sourceCrs, target)
}

function applyData() {
  try {
    const parsed = parseGeoJson(dataDraft.value)
    props.workspace.replaceCollection(convertGeoJson(parsed, snapshot.value.sourceCrs, 'wgs84'))
    dataDirty.value = false
    error.value = ''
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Invalid GeoJSON.'
  }
}

function formatData() {
  try {
    dataDraft.value = JSON.stringify(parseGeoJson(dataDraft.value), null, 2)
    error.value = ''
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Invalid GeoJSON.'
  }
}

async function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  dataDraft.value = await file.text()
  dataDirty.value = true
  activeTab.value = 'data'
  dataView.value = 'input'
  applyData()
  ;(event.target as HTMLInputElement).value = ''
}

function downloadOutput() {
  const blob = new Blob([output.value], { type: 'application/geo+json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `amap-workspace-${snapshot.value.targetCrs}.geojson`
  link.click()
  URL.revokeObjectURL(url)
}

async function copyOutput() {
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1200)
}

function setStyle(key: keyof typeof snapshot.value.style, event: Event) {
  const input = event.target as HTMLInputElement
  props.workspace.setStyle({ [key]: input.type === 'color' ? input.value : Number(input.value) })
}

async function measure(type: 'distance' | 'area') {
  measuring.value = type
  error.value = ''
  emit('request-map')
  try {
    measurements.value = [await props.runtime.startMeasurement(type), ...measurements.value]
  } catch (reason) {
    if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
      error.value = reason instanceof Error ? reason.message : 'Measurement failed.'
    }
  } finally {
    measuring.value = ''
  }
}

function clearMeasurements() {
  props.runtime.clearMeasurements()
  measurements.value = []
}

function testContainment() {
  const coordinate = parseCoordinate(pointInput.value)
  if (!coordinate) {
    error.value = 'Use longitude, latitude within valid ranges.'
    return
  }
  const polygon = selectedFeature.value?.geometry.type.includes('Polygon')
    ? selectedFeature.value
    : collection.value.features.find((feature) => feature.geometry.type.includes('Polygon'))
  if (!polygon) {
    error.value = 'Add or select a polygon first.'
    return
  }
  containment.value = pointInPolygonFeature(coordinate, polygon) ? 'Inside polygon' : 'Outside polygon'
  props.runtime.mark(coordinate)
  error.value = ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && drawing.value) cancelDrawing()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  cancelDrawing()
})
</script>

<template>
  <div class="studio-shell">
    <div class="studio-commandbar">
      <div class="draw-tools" aria-label="Drawing tools">
        <button
          v-for="mode in drawingModes"
          :key="mode.type"
          class="icon-button"
          type="button"
          :class="{ active: drawing === mode.type }"
          :title="`Draw ${mode.label}`"
          @click="draw(mode.type)"
        ><component :is="mode.icon" :size="17" /></button>
        <button v-if="drawing" class="icon-button danger-icon" type="button" title="Cancel drawing" @click="cancelDrawing"><X :size="17" /></button>
      </div>
      <span class="command-divider" />
      <button class="icon-button" type="button" title="Undo" :disabled="!workspace.canUndo.value" @click="workspace.undo"><Undo2 :size="17" /></button>
      <button class="icon-button" type="button" title="Redo" :disabled="!workspace.canRedo.value" @click="workspace.redo"><Redo2 :size="17" /></button>
      <span class="command-spacer" />
      <input ref="fileInput" class="visually-hidden" type="file" accept=".json,.geojson,application/geo+json" @change="loadFile" />
      <button class="icon-button" type="button" title="Import GeoJSON" @click="fileInput?.click()"><Upload :size="17" /></button>
      <button class="icon-button" type="button" title="Download GeoJSON" :disabled="!collection.features.length" @click="downloadOutput"><Download :size="17" /></button>
      <button class="icon-button" type="button" title="Clear workspace" :disabled="!collection.features.length" @click="workspace.clear"><Trash2 :size="17" /></button>
    </div>

    <div v-if="drawing" class="active-mode-bar">
      <span>Drawing {{ drawing }}</span>
      <label><input v-model="keepDrawing" type="checkbox" /> Repeat</label>
      <kbd>Esc</kbd>
    </div>

    <nav class="studio-tabs" aria-label="GeoJSON workspace views">
      <button v-for="tab in tabs" :key="tab.id" type="button" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
        <component :is="tab.icon" :size="15" /><span>{{ tab.label }}</span>
      </button>
    </nav>

    <div class="studio-content">
      <section v-if="activeTab === 'features'" class="workspace-pane">
        <div class="pane-title"><span>{{ collection.features.length }} features</span><span>{{ snapshot.sourceCrs.toUpperCase() }}</span></div>
        <div v-if="collection.features.length" class="feature-list">
          <div
            v-for="(feature, index) in collection.features"
            :key="feature.id"
            :class="{ selected: workspace.selectedFeatureId.value === feature.id }"
          >
            <button class="feature-select" type="button" @click="selectFeature(feature)">
              <span class="geometry-icon"><Circle v-if="feature.geometry.type.includes('Point')" :size="14" /><Minus v-else-if="feature.geometry.type.includes('Line')" :size="14" /><Pentagon v-else :size="14" /></span>
              <span><strong>{{ featureName(feature, index) }}</strong><small>{{ feature.geometry.type }}</small></span>
            </button>
            <button v-if="feature.id !== undefined" class="icon-button" type="button" title="Delete feature" @click.stop="workspace.removeFeature(feature.id)"><Trash2 :size="14" /></button>
          </div>
        </div>
        <div v-else class="workspace-empty"><FileJson :size="24" /><span>No features</span></div>
        <div v-if="selectedFeature" class="feature-inspector">
          <label class="field-label" for="feature-name">Name</label>
          <input id="feature-name" :value="selectedFeature.properties?.name || ''" placeholder="Feature name" @change="renameSelected" />
          <div class="inspector-meta"><span>ID</span><code>{{ selectedFeature.id }}</code></div>
          <div class="inspector-meta"><span>Type</span><code>{{ selectedFeature.geometry.type }}</code></div>
        </div>
      </section>

      <section v-else-if="activeTab === 'data'" class="workspace-pane data-pane">
        <div class="segmented-control data-view-switch" aria-label="GeoJSON data view">
          <button type="button" :class="{ active: dataView === 'input' }" @click="dataView = 'input'">Input</button>
          <button type="button" :class="{ active: dataView === 'output' }" @click="dataView = 'output'">Converted</button>
        </div>
        <template v-if="dataView === 'input'">
          <div class="data-crs-row">
            <label class="field-label" for="source-crs">Input coordinate system</label>
            <select id="source-crs" :value="snapshot.sourceCrs" @change="setSourceCrs(($event.target as HTMLSelectElement).value as CoordinateSystem)">
              <option v-for="item in coordinateSystems" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <textarea v-model="dataDraft" class="data-code-editor" spellcheck="false" aria-label="Editable GeoJSON" @input="dataDirty = true" />
          <div class="data-actions">
            <button class="button secondary" type="button" @click="formatData"><Braces :size="15" /> Format</button>
            <button class="button primary" type="button" :disabled="!dataDirty" @click="applyData"><Check :size="15" /> Apply</button>
          </div>
        </template>
        <template v-else>
          <div class="data-crs-row">
            <label class="field-label" for="output-crs">Output coordinate system</label>
            <select id="output-crs" :value="snapshot.targetCrs" @change="setTargetCrs(($event.target as HTMLSelectElement).value as CoordinateSystem)">
              <option v-for="item in coordinateSystems" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
          <pre class="converted-preview data-code-editor" aria-label="Converted GeoJSON output">{{ output }}</pre>
          <div class="data-actions">
            <button class="button secondary" type="button" @click="copyOutput"><Check v-if="copied" :size="15" /><Clipboard v-else :size="15" /> Copy output</button>
            <button class="button secondary" type="button" @click="downloadOutput"><Download :size="15" /> Download</button>
          </div>
        </template>
      </section>

      <section v-else-if="activeTab === 'style'" class="workspace-pane style-pane">
        <label><span>Stroke</span><input type="color" :value="snapshot.style.strokeColor" @change="setStyle('strokeColor', $event)" /></label>
        <label><span>Fill</span><input type="color" :value="snapshot.style.fillColor" @change="setStyle('fillColor', $event)" /></label>
        <label><span>Points</span><input type="color" :value="snapshot.style.pointColor" @change="setStyle('pointColor', $event)" /></label>
        <label><span>Stroke width</span><input type="range" min="1" max="10" step="1" :value="snapshot.style.strokeWidth" @change="setStyle('strokeWidth', $event)" /><output>{{ snapshot.style.strokeWidth }} px</output></label>
        <label><span>Fill opacity</span><input type="range" min="0" max="0.8" step="0.05" :value="snapshot.style.fillOpacity" @change="setStyle('fillOpacity', $event)" /><output>{{ snapshot.style.fillOpacity }}</output></label>
        <label><span>Point radius</span><input type="range" min="3" max="18" step="1" :value="snapshot.style.pointRadius" @change="setStyle('pointRadius', $event)" /><output>{{ snapshot.style.pointRadius }} px</output></label>
        <button class="button secondary" type="button" @click="workspace.setStyle({ strokeColor: '#16856f', fillColor: '#46b99e', pointColor: '#d84a2f', strokeWidth: 3, fillOpacity: 0.22, pointRadius: 7 })"><RotateCcw :size="15" /> Reset style</button>
      </section>

      <section v-else class="workspace-pane analysis-pane">
        <div class="analysis-block">
          <h2>Measure on map</h2>
          <div class="button-grid">
            <button class="button secondary" type="button" :disabled="Boolean(measuring)" @click="measure('distance')"><Ruler :size="15" /> Distance</button>
            <button class="button secondary" type="button" :disabled="Boolean(measuring)" @click="measure('area')"><Pentagon :size="15" /> Area</button>
          </div>
          <div v-if="measurements.length" class="measurement-list">
            <div v-for="(item, index) in measurements" :key="`${item.type}-${index}`"><span>{{ item.type }}</span><strong>{{ item.label }}</strong></div>
            <button class="button secondary" type="button" @click="clearMeasurements"><Trash2 :size="15" /> Clear measurements</button>
          </div>
        </div>
        <div class="analysis-block">
          <h2>Point in polygon</h2>
          <form class="input-action" @submit.prevent="testContainment">
            <input v-model="pointInput" aria-label="Point to test" placeholder="120.155100, 30.274100" />
            <button class="icon-button solid" type="submit" title="Test point"><ScanLine :size="18" /></button>
          </form>
          <div v-if="containment" class="analysis-result">{{ containment }}</div>
        </div>
      </section>
      <p v-if="error" class="inline-error studio-error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>
